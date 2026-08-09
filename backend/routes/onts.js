const express = require('express');
const router = express.Router();

// Listar ONTs con filtros y paginacion
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status = '', model_id = '', technician_id = '', zone_id = '', date_from = '', date_to = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];

    if (search) {
      where.push("(o.asset_code LIKE ? OR o.description LIKE ? OR o.responsible_name LIKE ? OR o.mac_address LIKE ? OR o.adapter_serial LIKE ? OR o.client_code LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s);
    }
    if (status) { where.push("o.status = ?"); params.push(status); }
    if (model_id) { where.push("o.model_id = ?"); params.push(model_id); }
    if (technician_id) { where.push("o.technician_id = ?"); params.push(technician_id); }
    if (zone_id) { where.push("o.zone_id = ?"); params.push(zone_id); }
    if (date_from) { where.push("o.installation_date >= ?"); params.push(date_from); }
    if (date_to) { where.push("o.installation_date <= ?"); params.push(date_to); }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = req.db.prepare(`SELECT COUNT(*) as total FROM onts o ${whereClause}`).get(...params);

    const rows = req.db.prepare(`
      SELECT o.*, m.name as model_name, m.brand as model_brand, z.name as zone_name, t.name as technician_name
      FROM onts o
      LEFT JOIN ont_models m ON o.model_id = m.id
      LEFT JOIN zones z ON o.zone_id = z.id
      LEFT JOIN technicians t ON o.technician_id = t.id
      ${whereClause}
      ORDER BY o.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({ data: rows, total: countRow.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Obtener ONT por ID
router.get('/:id', (req, res) => {
  try {
    const row = req.db.prepare(`
      SELECT o.*, m.name as model_name, m.brand as model_brand, z.name as zone_name, t.name as technician_name
      FROM onts o
      LEFT JOIN ont_models m ON o.model_id = m.id
      LEFT JOIN zones z ON o.zone_id = z.id
      LEFT JOIN technicians t ON o.technician_id = t.id
      WHERE o.id = ?
    `).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'ONT no encontrada' });
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Crear ONT
router.post('/', (req, res) => {
  try {
    const b = req.body;
    if (!b.asset_code || !b.description) {
      return res.status(400).json({ error: 'asset_code y description son requeridos' });
    }
    const stmt = req.db.prepare(`
      INSERT INTO onts (item_number, quantity, unit, asset_code, description, delivery_note,
        responsible_name, client_code, zone_id, street_address, installation_date, technician_id,
        adapter_serial, mac_address, model_id, fsan, observation, requested_by, exit_note, exit_date,
        return_reason, return_date, return_stt_note, new_model_id, new_exit_note, new_responsible,
        new_delivery_af, new_delivery_date, phone, new_address, status, company, original_installer_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      b.item_number || null, b.quantity || 1, b.unit || 'Pieza', b.asset_code, b.description,
      b.delivery_note || '', b.responsible_name || '', b.client_code || '', b.zone_id || null,
      b.street_address || '', b.installation_date || null, b.technician_id || null,
      b.adapter_serial || '', b.mac_address || '', b.model_id || null, b.fsan || '',
      b.observation || '', b.requested_by || '', b.exit_note || '', b.exit_date || null,
      b.return_reason || '', b.return_date || null, b.return_stt_note || '', b.new_model_id || null,
      b.new_exit_note || '', b.new_responsible || '', b.new_delivery_af || '', b.new_delivery_date || null,
      b.phone || '', b.new_address || '', b.status || 'disponible', b.company || '', b.original_installer_id || null
    );
    res.json({ id: result.lastInsertRowid, message: 'ONT creada correctamente' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'El codigo del bien ya existe' });
    res.status(500).json({ error: e.message });
  }
});

// Actualizar ONT
router.put('/:id', (req, res) => {
  try {
    const b = req.body;
    const stmt = req.db.prepare(`
      UPDATE onts SET item_number=?, quantity=?, unit=?, asset_code=?, description=?, delivery_note=?,
        responsible_name=?, client_code=?, zone_id=?, street_address=?, installation_date=?, technician_id=?,
        adapter_serial=?, mac_address=?, model_id=?, fsan=?, observation=?, requested_by=?, exit_note=?,
        exit_date=?, return_reason=?, return_date=?, return_stt_note=?, new_model_id=?, new_exit_note=?,
        new_responsible=?, new_delivery_af=?, new_delivery_date=?, phone=?, new_address=?, status=?,
        company=?, original_installer_id=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `);
    stmt.run(
      b.item_number || null, b.quantity || 1, b.unit || 'Pieza', b.asset_code, b.description,
      b.delivery_note || '', b.responsible_name || '', b.client_code || '', b.zone_id || null,
      b.street_address || '', b.installation_date || null, b.technician_id || null,
      b.adapter_serial || '', b.mac_address || '', b.model_id || null, b.fsan || '',
      b.observation || '', b.requested_by || '', b.exit_note || '', b.exit_date || null,
      b.return_reason || '', b.return_date || null, b.return_stt_note || '', b.new_model_id || null,
      b.new_exit_note || '', b.new_responsible || '', b.new_delivery_af || '', b.new_delivery_date || null,
      b.phone || '', b.new_address || '', b.status || 'disponible', b.company || '', b.original_installer_id || null,
      req.params.id
    );
    res.json({ message: 'ONT actualizada correctamente' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'El codigo del bien ya existe' });
    res.status(500).json({ error: e.message });
  }
});

// Cambiar estado
router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['disponible', 'despachada', 'instalada', 'devuelta_cambio_plan', 'devuelta_defecto', 'devuelta_cambio_equipo', 'vendida', 'baja'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Estado invalido' });
    req.db.prepare('UPDATE onts SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, req.params.id);
    res.json({ message: 'Estado actualizado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Eliminar ONT (soft delete)
router.delete('/:id', (req, res) => {
  try {
    req.db.prepare('UPDATE onts SET status="eliminada", updated_at=CURRENT_TIMESTAMP WHERE id=?').run(req.params.id);
    res.json({ message: 'ONT eliminada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
