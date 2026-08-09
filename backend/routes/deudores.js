const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { technician_id = '', status = '' } = req.query;
    let where = [];
    let params = [];

    if (technician_id) { where.push("d.technician_id = ?"); params.push(technician_id); }
    if (status) { where.push("d.status = ?"); params.push(status); } else { where.push("d.status = 'pendiente'"); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const rows = req.db.prepare(`
      SELECT d.*, e.asset_code, e.description, e.adapter_serial, e.mac_address, e.exit_date, e.model_text,
             t.name as technician_name
      FROM deudores d
      LEFT JOIN equipos e ON d.equipo_id = e.id
      LEFT JOIN technicians t ON d.technician_id = t.id
      ${whereClause}
      ORDER BY d.instruction_date DESC
    `).all(...params);

    const summary = req.db.prepare(`
      SELECT t.name as technician_name, t.id as technician_id, COUNT(d.id) as pending_count
      FROM deudores d
      LEFT JOIN technicians t ON d.technician_id = t.id
      WHERE d.status = 'pendiente'
      GROUP BY d.technician_id
      ORDER BY pending_count DESC
    `).all();

    res.json({ data: rows, summary });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const { equipo_id, technician_id, instruction_note, instruction_date } = req.body;
    if (!equipo_id || !technician_id) {
      return res.status(400).json({ error: 'equipo_id y technician_id son requeridos' });
    }
    const result = req.db.transaction(() => {
      const r = req.db.prepare(`
        INSERT INTO deudores (equipo_id, technician_id, instruction_note, instruction_date)
        VALUES (?, ?, ?, ?)
      `).run(equipo_id, technician_id, instruction_note || '', instruction_date || null);

      req.db.prepare("UPDATE equipos SET status = 'despachada', technician_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(technician_id, equipo_id);
      return r.lastInsertRowid;
    });
    res.json({ id: result, message: 'Equipo registrado en deudores' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/discharge', (req, res) => {
  try {
    const { discharge_note, discharge_date } = req.body;
    const deudor = req.db.prepare('SELECT * FROM deudores WHERE id = ?').get(req.params.id);
    if (!deudor) return res.status(404).json({ error: 'Deudor no encontrado' });

    req.db.transaction(() => {
      req.db.prepare("UPDATE deudores SET status = 'descargado', discharge_note = ?, discharge_date = ? WHERE id = ?").run(discharge_note || '', discharge_date || new Date().toISOString().split('T')[0], req.params.id);
      req.db.prepare("UPDATE equipos SET status = 'instalada', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(deudor.equipo_id);
      req.db.prepare("INSERT INTO kardex_movements (equipo_id, movement_type, date, note_number, technician_id, notes) VALUES (?, 'instalacion', ?, ?, ?, 'Descargo de deudor')").run(deudor.equipo_id, discharge_date || new Date().toISOString().split('T')[0], discharge_note || '', deudor.technician_id);
    })();
    res.json({ message: 'Deudor descargado correctamente' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
