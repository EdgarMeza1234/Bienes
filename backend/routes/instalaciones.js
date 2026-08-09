const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', tecnico = '', sortBy = 'fecha', sortDir = 'DESC' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];

    const allowedSort = { asset_code: 'asset_code', abonado_name: 'abonado_name', abonado_code: 'abonado_code', fecha: 'fecha', tecnico: 'tecnico', observacion: 'observacion', id: 'id' };
    const col = allowedSort[sortBy] || 'fecha';
    const dir = sortDir === 'DESC' ? 'DESC' : 'ASC';

    if (search) {
      where.push('(asset_code = ? OR abonado_name = ? OR abonado_code = ?)');
      params.push(search, search, search);
    }
    if (tecnico) { where.push('tecnico = ?'); params.push(tecnico); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = req.db.prepare(`SELECT COUNT(*) as total FROM instalaciones ${whereClause}`).get(...params);

    const items = req.db.prepare(`
      SELECT i.*
      FROM instalaciones i
      ${whereClause}
      ORDER BY i.${col} ${dir}, i.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), offset);

    res.json({ data: items, total: countRow.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/historial/:assetCode', (req, res) => {
  try {
    const rows = req.db.prepare(`
      SELECT i.id, i.asset_code, i.fecha, i.tecnico, i.observacion, i.created_at,
        i.abonado_code as client_code, i.abonado_name as abonado_name
      FROM instalaciones i
      WHERE i.asset_code = ?
      ORDER BY i.fecha ASC, i.id ASC
    `).all(req.params.assetCode);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/tecnicos', (req, res) => {
  try {
    const rows = req.db.prepare("SELECT DISTINCT tecnico FROM instalaciones WHERE tecnico != '' ORDER BY tecnico").all();
    res.json(rows.map(r => r.tecnico));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', (req, res) => {
  try {
    const { asset_code, abonado_name, fecha, tecnico, observacion } = req.body;
    if (!asset_code) return res.status(400).json({ error: 'Codigo de bien requerido' });
    if (!abonado_name) return res.status(400).json({ error: 'Nombre de abonado requerido' });
    const r = req.db.prepare('INSERT INTO instalaciones (asset_code, abonado_code, abonado_name, fecha, tecnico, observacion) VALUES (?, ?, ?, ?, ?, ?)').run(
      asset_code, '', abonado_name || '', fecha || null, tecnico || '', observacion || ''
    );

    const eq = req.db.prepare('SELECT id FROM equipos WHERE asset_code = ?').get(asset_code);
    if (eq) req.db.prepare("UPDATE equipos SET status = 'instalada', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(eq.id);

    res.json({ id: r.lastInsertRowid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', (req, res) => {
  try {
    const { abonado_name, fecha, tecnico, observacion } = req.body;
    req.db.prepare('UPDATE instalaciones SET abonado_code=?, abonado_name=?, fecha=?, tecnico=?, observacion=? WHERE id=?')
      .run('', abonado_name || '', fecha || null, tecnico || '', observacion || '', req.params.id);
    res.json({ id: parseInt(req.params.id) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', (req, res) => {
  try {
    const inst = req.db.prepare('SELECT asset_code FROM instalaciones WHERE id = ?').get(req.params.id);
    req.db.prepare('DELETE FROM instalaciones WHERE id=?').run(req.params.id);
    if (inst) {
      const otherInst = req.db.prepare('SELECT id FROM instalaciones WHERE asset_code = ? LIMIT 1').get(inst.asset_code);
      const eq = req.db.prepare('SELECT id FROM equipos WHERE asset_code = ?').get(inst.asset_code);
      if (eq) {
        const hasVale = req.db.prepare('SELECT id FROM vales WHERE equipo_id = ? LIMIT 1').get(eq.id);
        if (!otherInst && !hasVale) {
          req.db.prepare("UPDATE equipos SET status = 'en_bines', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(eq.id);
        } else if (hasVale && !otherInst) {
          req.db.prepare("UPDATE equipos SET status = 'despachada', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(eq.id);
        }
      }
    }
    res.json({ message: 'Instalacion eliminada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
