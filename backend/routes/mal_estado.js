const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];

    if (search) {
      where.push("(e.asset_code LIKE ? OR e.description LIKE ? OR e.mac_address LIKE ? OR e.adapter_serial LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const countRow = req.db.prepare(`SELECT COUNT(*) as total FROM mal_estado me LEFT JOIN equipos e ON me.equipo_id = e.id ${whereClause}`).get(...params);

    const rows = req.db.prepare(`
      SELECT me.*, e.asset_code, e.description, e.adapter_serial, e.mac_address, e.model_text
      FROM mal_estado me
      LEFT JOIN equipos e ON me.equipo_id = e.id
      ${whereClause}
      ORDER BY me.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({ data: rows, total: countRow.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const { equipo_id, observation, delivery_date, delivered_by } = req.body;
    if (!equipo_id) return res.status(400).json({ error: 'equipo_id requerido' });

    const result = req.db.transaction(() => {
      const r = req.db.prepare(`
        INSERT INTO mal_estado (equipo_id, condition_status, observation, delivery_date, delivered_by)
        VALUES (?, 'MAL ESTADO', ?, ?, ?)
      `).run(equipo_id, observation || '', delivery_date || null, delivered_by || '');

      req.db.prepare("UPDATE equipos SET status = 'baja', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(equipo_id);

      req.db.prepare(`
        INSERT INTO kardex_movements (equipo_id, movement_type, date, quantity_out, notes)
        VALUES (?, 'baja', ?, 1, ?)
      `).run(equipo_id, delivery_date || new Date().toISOString().split('T')[0], `Baja: ${observation || 'Mal estado'}`);

      return r.lastInsertRowid;
    });

    res.json({ id: result, message: 'Equipo registrado en mal estado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
