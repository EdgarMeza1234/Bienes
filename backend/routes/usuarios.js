const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', zone_id = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];

    if (search) {
      where.push("(u.client_code LIKE ? OR u.name LIKE ? OR u.street_address LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (zone_id) { where.push("u.zone_id = ?"); params.push(zone_id); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const countRow = req.db.prepare(`SELECT COUNT(*) as total FROM usuarios u ${whereClause}`).get(...params);

    const rows = req.db.prepare(`
      SELECT u.*, z.name as zone_name,
        (SELECT COUNT(*) FROM equipos WHERE usuario_id = u.id) as total_equipos
      FROM usuarios u
      LEFT JOIN zones z ON u.zone_id = z.id
      ${whereClause}
      ORDER BY u.name
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({ data: rows, total: countRow.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', (req, res) => {
  try {
    const row = req.db.prepare(`
      SELECT u.*, z.name as zone_name FROM usuarios u
      LEFT JOIN zones z ON u.zone_id = z.id WHERE u.id = ?
    `).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });

    const equipos = req.db.prepare(`
      SELECT e.id, e.asset_code, e.description, e.status, e.mac_address, e.model_text
      FROM equipos e WHERE e.usuario_id = ?
    `).all(req.params.id);

    res.json({ ...row, equipos });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
