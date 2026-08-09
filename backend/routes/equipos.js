const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status = '', modelo = '', sortBy = 'asset_code', sortDir = 'ASC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];

    const allowedSort = { asset_code: 'e.asset_code', description: 'e.description', modelo: 'e.modelo', adapter_serial: 'e.adapter_serial', mac_address: 'e.mac_address', serie_equipo: 'e.serie_equipo', color: 'e.color', status: 'e.status', id: 'e.id' };
    const col = allowedSort[sortBy] || 'e.asset_code';
    const dir = sortDir === 'DESC' ? 'DESC' : 'ASC';

    if (search) {
      where.push('(e.asset_code LIKE ? OR e.description LIKE ? OR e.mac_address LIKE ? OR e.adapter_serial LIKE ? OR e.modelo LIKE ? OR e.serie_equipo LIKE ? OR e.color LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s, s);
    }
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      const placeholders = statuses.map(() => '?').join(',');
      where.push(`e.status IN (${placeholders})`);
      params.push(...statuses);
    }
    if (modelo) { where.push('e.modelo = ?'); params.push(modelo); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = req.db.prepare(`SELECT COUNT(*) as total FROM equipos e ${whereClause}`).get(...params);

    const items = req.db.prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM instalaciones WHERE asset_code = e.asset_code) as instalaciones_count,
        (SELECT COUNT(*) FROM vales WHERE equipo_id = e.id) as vales_count
      FROM equipos e
      ${whereClause}
      ORDER BY ${col} ${dir}, e.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({ data: items, total: countRow.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/modelos', (req, res) => {
  try {
    const rows = req.db.prepare("SELECT DISTINCT modelo FROM equipos WHERE modelo != '' ORDER BY modelo").all();
    res.json(rows.map(r => r.modelo));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'No hay equipos para guardar' });
    const stmt = req.db.prepare(`
      INSERT INTO equipos (asset_code, description, delivery_note_af, adapter_serial, mac_address, modelo, fsan, serie_equipo, color, observation, return_stt_note, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = req.db.transaction((lista) => {
      let count = 0;
      for (const eq of lista) {
        stmt.run(
          eq.asset_code, eq.description || '', eq.delivery_note_af || '',
          eq.adapter_serial || '', eq.mac_address || '', eq.modelo || '',
          eq.fsan || '', eq.serie_equipo || '', eq.color || '',
          eq.observation || '', eq.return_stt_note || '', eq.status || 'en_bines'
        );
        count++;
      }
      return count;
    });
    const inserted = insertMany(items);
    res.json({ inserted, message: inserted + ' equipos guardados' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ya existe un equipo con ese codigo' });
    res.status(500).json({ error: e.message });
  }
});

router.get('/by-code/:code', (req, res) => {
  try {
    const item = req.db.prepare('SELECT * FROM equipos WHERE asset_code = ?').get(req.params.code);
    if (!item) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', (req, res) => {
  try {
    const item = req.db.prepare(`
      SELECT e.*,
        (SELECT COUNT(*) FROM instalaciones WHERE asset_code = e.asset_code) as instalaciones_count,
        (SELECT COUNT(*) FROM vales WHERE equipo_id = e.id) as vales_count
      FROM equipos e WHERE e.id = ?
    `).get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const { asset_code, description, delivery_note_af, adapter_serial, mac_address, modelo, fsan, serie_equipo, color, observation, return_stt_note, status } = req.body;
    if (!asset_code) return res.status(400).json({ error: 'Codigo del bien requerido' });
    const r = req.db.prepare(`
      INSERT INTO equipos (asset_code, description, delivery_note_af, adapter_serial, mac_address, modelo, fsan, serie_equipo, color, observation, return_stt_note, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(asset_code, description || '', delivery_note_af || '', adapter_serial || '', mac_address || '', modelo || '', fsan || '', serie_equipo || '', color || '', observation || '', return_stt_note || '', status || 'disponible');
    res.json({ id: r.lastInsertRowid, asset_code });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ya existe un equipo con ese codigo' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { asset_code, description, delivery_note_af, adapter_serial, mac_address, modelo, fsan, serie_equipo, color, observation, return_stt_note, status } = req.body;
    req.db.prepare(`
      UPDATE equipos SET asset_code=?, description=?, delivery_note_af=?, adapter_serial=?, mac_address=?, modelo=?, fsan=?, serie_equipo=?, color=?, observation=?, return_stt_note=?, status=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(asset_code, description || '', delivery_note_af || '', adapter_serial || '', mac_address || '', modelo || '', fsan || '', serie_equipo || '', color || '', observation || '', return_stt_note || '', status || 'disponible', req.params.id);
    res.json({ id: parseInt(req.params.id), asset_code });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    req.db.prepare('UPDATE equipos SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, req.params.id);
    res.json({ id: parseInt(req.params.id), status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    req.db.prepare('DELETE FROM equipos WHERE id=?').run(req.params.id);
    res.json({ message: 'Equipo eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
