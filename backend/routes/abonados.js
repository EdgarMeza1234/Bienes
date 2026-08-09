const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', zone = '', sortBy = 'name', sortDir = 'ASC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];

    const allowedSort = { client_code: 'a.client_code', name: 'a.name', zone: 'a.zone', street: 'a.street', instalaciones_count: 'instalaciones_count' };
    const col = allowedSort[sortBy] || 'a.name';
    const dir = sortDir === 'DESC' ? 'DESC' : 'ASC';

    if (search) {
      where.push('(a.name LIKE ? OR a.client_code = ? OR a.street LIKE ?)');
      const s = `%${search}%`;
      params.push(s, search, s);
    }
    if (zone) { where.push('a.zone = ?'); params.push(zone); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = req.db.prepare(`SELECT COUNT(*) as total FROM abonados a ${whereClause}`).get(...params);

    const items = req.db.prepare(`
      SELECT a.*,
        (SELECT COUNT(*) FROM instalaciones WHERE abonado_name = a.name) as instalaciones_count
      FROM abonados a
      ${whereClause}
      ORDER BY ${col} ${dir}, a.id
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({ data: items, total: countRow.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/by-code/:code', (req, res) => {
  try {
    const items = req.db.prepare(`
      SELECT a.*,
        (SELECT COUNT(*) FROM instalaciones WHERE abonado_name = a.name) as instalaciones_count
      FROM abonados a
      WHERE a.client_code = ?
      ORDER BY a.name
    `).all(req.params.code);
    res.json({ data: items, total: items.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/zones', (req, res) => {
  try {
    const rows = req.db.prepare("SELECT DISTINCT zone FROM abonados WHERE zone != '' ORDER BY zone").all();
    res.json(rows.map(r => r.zone));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', (req, res) => {
  try {
    const item = req.db.prepare(`
      SELECT a.*,
        (SELECT COUNT(*) FROM instalaciones WHERE abonado_name = a.name) as instalaciones_count
      FROM abonados a WHERE a.id = ?
    `).get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Abonado no encontrado' });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/instalaciones', (req, res) => {
  try {
    const abonado = req.db.prepare('SELECT name FROM abonados WHERE id = ?').get(req.params.id);
    if (!abonado) return res.json([]);
    const items = req.db.prepare(`
      SELECT i.*
      FROM instalaciones i
      WHERE i.abonado_name = ?
      ORDER BY i.fecha DESC
    `).all(abonado.name);
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const { client_code, name, zone, street } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });

    const existing = req.db.prepare('SELECT id FROM abonados WHERE name = ?').get(name);
    if (existing) {
      return res.json({ id: existing.id, name, existing: true });
    }

    const r = req.db.prepare('INSERT INTO abonados (client_code, name, zone, street) VALUES (?, ?, ?, ?)').run((client_code || '').toString(), name, zone || '', street || '');
    res.json({ id: r.lastInsertRowid, name });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Ya existe un abonado con ese codigo y nombre' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { client_code, name, zone, street } = req.body;
    req.db.prepare('UPDATE abonados SET client_code=?, name=?, zone=?, street=? WHERE id=?').run((client_code || '').toString(), name, zone || '', street || '', req.params.id);
    res.json({ id: parseInt(req.params.id) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    req.db.prepare('DELETE FROM abonados WHERE id=?').run(req.params.id);
    res.json({ message: 'Abonado eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
