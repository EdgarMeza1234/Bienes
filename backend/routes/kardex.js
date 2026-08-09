const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 50, technician_id = '', model_id = '', date_from = '', date_to = '', equipo_id = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];

    if (technician_id) { where.push("k.technician_id = ?"); params.push(technician_id); }
    if (equipo_id) { where.push("k.equipo_id = ?"); params.push(equipo_id); }
    if (model_id) { where.push("e.model_id = ?"); params.push(model_id); }
    if (date_from) { where.push("k.date >= ?"); params.push(date_from); }
    if (date_to) { where.push("k.date <= ?"); params.push(date_to); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const countRow = req.db.prepare(`SELECT COUNT(*) as total FROM kardex_movements k LEFT JOIN equipos e ON k.equipo_id = e.id ${whereClause}`).get(...params);

    const rows = req.db.prepare(`
      SELECT k.*, e.asset_code, e.description, e.adapter_serial, m.name as model_name, t.name as technician_name
      FROM kardex_movements k
      LEFT JOIN equipos e ON k.equipo_id = e.id
      LEFT JOIN ont_models m ON e.model_id = m.id
      LEFT JOIN technicians t ON k.technician_id = t.id
      ${whereClause}
      ORDER BY k.date DESC, k.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({ data: rows, total: countRow.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/technician/:id', (req, res) => {
  try {
    const { date_from = '', date_to = '' } = req.query;
    let where = ["k.technician_id = ?"];
    let params = [req.params.id];
    if (date_from) { where.push("k.date >= ?"); params.push(date_from); }
    if (date_to) { where.push("k.date <= ?"); params.push(date_to); }
    const whereClause = 'WHERE ' + where.join(' AND ');

    const tech = req.db.prepare('SELECT * FROM technicians WHERE id = ?').get(req.params.id);
    const movements = req.db.prepare(`
      SELECT k.*, e.asset_code, e.description, m.name as model_name
      FROM kardex_movements k
      LEFT JOIN equipos e ON k.equipo_id = e.id
      LEFT JOIN ont_models m ON e.model_id = m.id
      ${whereClause}
      ORDER BY k.date DESC
    `).all(...params);

    const summary = req.db.prepare(`
      SELECT COUNT(*) as total_movimientos, SUM(k.quantity_in) as total_entradas, SUM(k.quantity_out) as total_salidas
      FROM kardex_movements k LEFT JOIN equipos e ON k.equipo_id = e.id ${whereClause}
    `).get(...params);

    const pending = req.db.prepare(`
      SELECT e.id, e.asset_code, e.description, e.mac_address, e.adapter_serial, e.exit_date, m.name as model_name
      FROM equipos e
      LEFT JOIN ont_models m ON e.model_id = m.id
      WHERE e.technician_id = ? AND e.status = 'despachada'
    `).all(req.params.id);

    res.json({ technician: tech, movements, summary, pending_equipos: pending });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const { equipo_id, movement_type, date, note_number, technician_id, section, quantity_in, quantity_out, notes } = req.body;
    if (!equipo_id || !movement_type || !date) {
      return res.status(400).json({ error: 'equipo_id, movement_type y date son requeridos' });
    }
    const lastMovement = req.db.prepare('SELECT balance FROM kardex_movements WHERE equipo_id = ? ORDER BY id DESC LIMIT 1').get(equipo_id);
    const prevBalance = lastMovement ? lastMovement.balance : 0;
    const balance = prevBalance + (quantity_in || 0) - (quantity_out || 0);

    const result = req.db.prepare(`
      INSERT INTO kardex_movements (equipo_id, movement_type, date, note_number, technician_id, section, quantity_in, quantity_out, balance, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(equipo_id, movement_type, date, note_number || '', technician_id || null, section || '', quantity_in || 0, quantity_out || 0, balance, notes || '');

    res.json({ id: result.lastInsertRowid, balance, message: 'Movimiento registrado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
