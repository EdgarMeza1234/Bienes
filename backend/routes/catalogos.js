const express = require('express');
const router = express.Router();

// MODELOS
router.get('/models', (req, res) => {
  try {
    const rows = req.db.prepare('SELECT * FROM ont_models ORDER BY brand, name').all();
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/models', (req, res) => {
  try {
    const { name, brand, color, type } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const result = req.db.prepare('INSERT INTO ont_models (name, brand, color, type) VALUES (?, ?, ?, ?)').run(name, brand || '', color || '', type || '');
    res.json({ id: result.lastInsertRowid, name, brand, color, type });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/models/:id', (req, res) => {
  try {
    const { name, brand, color, type } = req.body;
    req.db.prepare('UPDATE ont_models SET name=?, brand=?, color=?, type=? WHERE id=?').run(name, brand || '', color || '', type || '', req.params.id);
    res.json({ id: parseInt(req.params.id), name, brand, color, type });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/models/:id', (req, res) => {
  try {
    req.db.prepare('DELETE FROM ont_models WHERE id=?').run(req.params.id);
    res.json({ message: 'Modelo eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ZONAS
router.get('/zones', (req, res) => {
  try {
    const rows = req.db.prepare('SELECT * FROM zones ORDER BY name').all();
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/zones', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const result = req.db.prepare('INSERT INTO zones (name) VALUES (?)').run(name);
    res.json({ id: result.lastInsertRowid, name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/zones/:id', (req, res) => {
  try {
    const { name } = req.body;
    req.db.prepare('UPDATE zones SET name=? WHERE id=?').run(name, req.params.id);
    res.json({ id: parseInt(req.params.id), name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/zones/:id', (req, res) => {
  try {
    req.db.prepare('DELETE FROM zones WHERE id=?').run(req.params.id);
    res.json({ message: 'Zona eliminada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// TECNICOS
router.get('/technicians', (req, res) => {
  try {
    const rows = req.db.prepare('SELECT * FROM technicians ORDER BY name').all();
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/technicians', (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre requerido' });
    const result = req.db.prepare('INSERT INTO technicians (name, code, active) VALUES (?, ?, 1)').run(name, code || '');
    res.json({ id: result.lastInsertRowid, name, code, active: 1 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/technicians/:id', (req, res) => {
  try {
    const { name, code } = req.body;
    req.db.prepare('UPDATE technicians SET name=?, code=? WHERE id=?').run(name, code || '', req.params.id);
    res.json({ id: parseInt(req.params.id), name, code });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/technicians/:id', (req, res) => {
  try {
    req.db.prepare('UPDATE technicians SET active=0 WHERE id=?').run(req.params.id);
    res.json({ message: 'Tecnico desactivado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
