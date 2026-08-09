const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 15, search = '', return_type = '', date_from = '', date_to = '', sortBy = 'id', sortDir = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];

    if (search) {
      where.push("(d.asset_code LIKE ? OR e.description LIKE ? OR d.motivo LIKE ? OR d.devuelto_por LIKE ? OR d.nro_informe LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }
    if (return_type) { where.push("d.return_type = ?"); params.push(return_type); }
    if (date_from) { where.push("d.return_date >= ?"); params.push(date_from); }
    if (date_to) { where.push("d.return_date <= ?"); params.push(date_to); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const allowedSort = ['id', 'asset_code', 'return_type', 'return_date', 'nro_informe', 'stt_number', 'cite_ref', 'motivo', 'devuelto_por', 'description'];
    const sortCol = allowedSort.includes(sortBy) ? sortBy : 'id';
    const sortDirSql = sortDir === 'ASC' ? 'ASC' : 'DESC';
    const orderBy = sortCol === 'description' ? `e.description ${sortDirSql}` : `d.${sortCol} ${sortDirSql}`;

    const countRow = req.db.prepare(`SELECT COUNT(*) as total FROM devoluciones d LEFT JOIN equipos e ON d.equipo_id = e.id ${whereClause}`).get(...params);

    const rows = req.db.prepare(`
      SELECT d.*, e.description, e.adapter_serial, e.mac_address, e.modelo
      FROM devoluciones d
      LEFT JOIN equipos e ON d.equipo_id = e.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({ data: rows, total: countRow.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const { equipo_id, asset_code, return_type, return_date, nro_informe, stt_number, cite_ref, motivo, devuelto_por } = req.body;
    if (!asset_code || !return_type || !return_date) {
      return res.status(400).json({ error: 'asset_code, return_type y return_date son requeridos' });
    }

    let eqId = equipo_id;
    if (!eqId) {
      const eq = req.db.prepare("SELECT id FROM equipos WHERE asset_code = ?").get(asset_code);
      if (eq) eqId = eq.id;
    }

    const result = req.db.transaction(() => {
      const r = req.db.prepare(`
        INSERT INTO devoluciones (equipo_id, asset_code, return_type, return_date, nro_informe, stt_number, cite_ref, motivo, devuelto_por)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(eqId || null, asset_code, return_type, return_date, nro_informe || '', stt_number || '', cite_ref || '', motivo || '', devuelto_por || '');

      if (eqId) {
        const statusMap = {
          'cambio': 'devuelta',
          'defecto': 'en_bines_mal_estado',
          'retiro': 'devuelta',
          'recogido': 'devuelta'
        };
        const newStatus = statusMap[return_type] || 'devuelta';
        req.db.prepare(`
          UPDATE equipos SET status = ?, return_reason = ?, return_date = ?, return_stt_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(newStatus, motivo || return_type, return_date, stt_number || '', eqId);
      }

      return r.lastInsertRowid;
    });

    res.json({ id: result, message: 'Devolucion registrada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', (req, res) => {
  try {
    const { asset_code, return_type, return_date, nro_informe, stt_number, cite_ref, motivo, devuelto_por } = req.body;
    const existing = req.db.prepare('SELECT * FROM devoluciones WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Devolucion no encontrada' });

    const eq = req.db.prepare("SELECT id FROM equipos WHERE asset_code = ?").get(asset_code || existing.asset_code);
    const eqId = eq ? eq.id : existing.equipo_id;

    req.db.transaction(() => {
      req.db.prepare(`
        UPDATE devoluciones SET
          equipo_id = ?, asset_code = ?, return_type = ?, return_date = ?,
          nro_informe = ?, stt_number = ?, cite_ref = ?, motivo = ?, devuelto_por = ?
        WHERE id = ?
      `).run(
        eqId || null,
        asset_code || existing.asset_code,
        return_type || existing.return_type,
        return_date || existing.return_date,
        nro_informe !== undefined ? nro_informe : existing.nro_informe,
        stt_number !== undefined ? stt_number : existing.stt_number,
        cite_ref !== undefined ? cite_ref : existing.cite_ref,
        motivo !== undefined ? motivo : existing.motivo,
        devuelto_por !== undefined ? devuelto_por : existing.devuelto_por,
        req.params.id
      );

      if (eqId) {
        const statusMap = {
          'cambio': 'devuelta',
          'defecto': 'en_bines_mal_estado',
          'retiro': 'devuelta',
          'recogido': 'devuelta'
        };
        const rt = return_type || existing.return_type;
        const newStatus = statusMap[rt] || 'devuelta';
        req.db.prepare(`
          UPDATE equipos SET status = ?, return_reason = ?, return_date = ?, return_stt_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(newStatus, motivo !== undefined ? motivo : existing.motivo || rt, return_date || existing.return_date, stt_number !== undefined ? stt_number : existing.stt_number, eqId);
      }
    });

    res.json({ message: 'Devolucion actualizada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = req.db.prepare('SELECT * FROM devoluciones WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Devolucion no encontrada' });

    req.db.prepare('DELETE FROM devoluciones WHERE id = ?').run(req.params.id);

    res.json({ message: 'Devolucion eliminada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
