const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', sortBy = 'fecha', sortDir = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];

    const allowedSort = { asset_code: 'e.asset_code', description: 'e.description', modelo: 'e.modelo', solicitado: 'v.solicitado', salida_materiales: 'v.salida_materiales', fecha: 'v.fecha', id: 'v.id' };
    const col = allowedSort[sortBy] || 'v.fecha';
    const dir = sortDir === 'DESC' ? 'DESC' : 'ASC';

    if (search) {
      where.push('(e.asset_code LIKE ? OR v.solicitado LIKE ? OR v.salida_materiales LIKE ? OR e.description LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = req.db.prepare(`
      SELECT COUNT(*) as total FROM vales v
      JOIN equipos e ON v.equipo_id = e.id
      ${whereClause}
    `).get(...params);

    const items = req.db.prepare(`
      SELECT v.*, e.asset_code, e.description, e.modelo
      FROM vales v
      JOIN equipos e ON v.equipo_id = e.id
      ${whereClause}
      ORDER BY ${col} ${dir}, v.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({ data: items, total: countRow.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const { equipo_id, solicitado, salida_materiales, fecha } = req.body;
    if (!equipo_id) return res.status(400).json({ error: 'Equipo requerido' });
    const r = req.db.prepare('INSERT INTO vales (equipo_id, solicitado, salida_materiales, fecha) VALUES (?, ?, ?, ?)').run(equipo_id, solicitado || '', salida_materiales || '', fecha || null);

    const hasInst = req.db.prepare('SELECT id FROM instalaciones WHERE asset_code = (SELECT asset_code FROM equipos WHERE id = ?) LIMIT 1').get(equipo_id);
    const newStatus = hasInst ? 'instalada' : 'despachada';
    req.db.prepare("UPDATE equipos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(newStatus, equipo_id);

    res.json({ id: r.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', (req, res) => {
  try {
    const { equipo_ids, solicitado, salida_materiales, fecha } = req.body;
    if (!Array.isArray(equipo_ids) || equipo_ids.length === 0) return res.status(400).json({ error: 'Se requiere al menos un equipo' });

    const insertVale = req.db.prepare('INSERT INTO vales (equipo_id, solicitado, salida_materiales, fecha) VALUES (?, ?, ?, ?)');
    const getAssetCode = req.db.prepare('SELECT asset_code FROM equipos WHERE id = ?');
    const hasInst = req.db.prepare('SELECT id FROM instalaciones WHERE asset_code = ? LIMIT 1');
    const updateStatus = req.db.prepare("UPDATE equipos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");

    const created = [];
    const batch = req.db.transaction(() => {
      for (const eid of equipo_ids) {
        const r = insertVale.run(eid, solicitado || '', salida_materiales || '', fecha || null);
        const eq = getAssetCode.get(eid);
        if (eq) {
          const si = hasInst.get(eq.asset_code);
          updateStatus.run(si ? 'instalada' : 'despachada', eid);
        }
        created.push(r.lastInsertRowid);
      }
    });
    batch();

    res.json({ created: created.length, ids: created });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    const vale = req.db.prepare('SELECT equipo_id FROM vales WHERE id = ?').get(req.params.id);
    req.db.prepare('DELETE FROM vales WHERE id=?').run(req.params.id);
    if (vale) {
      const hasVale = req.db.prepare('SELECT id FROM vales WHERE equipo_id = ? LIMIT 1').get(vale.equipo_id);
      const hasInst = req.db.prepare('SELECT id FROM instalaciones WHERE asset_code = (SELECT asset_code FROM equipos WHERE id = ?) LIMIT 1').get(vale.equipo_id);
      if (!hasVale && !hasInst) {
        req.db.prepare("UPDATE equipos SET status = 'en_bines', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(vale.equipo_id);
      } else if (!hasVale && hasInst) {
        req.db.prepare("UPDATE equipos SET status = 'instalada', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(vale.equipo_id);
      }
    }
    res.json({ message: 'Vale eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
