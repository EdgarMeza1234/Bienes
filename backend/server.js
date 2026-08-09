const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const Database = require('better-sqlite3');
const { initDatabase, DB_PATH } = require('./database/init');

initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  req.db = new Database(DB_PATH);
  req.db.pragma('foreign_keys = ON');
  res.on('finish', () => { if (req.db && req.db.open) req.db.close(); });
  next();
});

app.use('/api/equipos', require('./routes/equipos'));
app.use('/api/abonados', require('./routes/abonados'));
app.use('/api/instalaciones', require('./routes/instalaciones'));
app.use('/api/vales', require('./routes/vales'));
app.use('/api/import', require('./routes/import'));
app.use('/api/devueltos', require('./routes/devueltos'));

// Dashboard stats
app.get('/api/stats', (req, res) => {
  try {
    const total = req.db.prepare('SELECT COUNT(*) as c FROM equipos').get().c;
    const enBines = req.db.prepare("SELECT COUNT(*) as c FROM equipos WHERE status = 'en_bines'").get().c;
    const despachadas = req.db.prepare("SELECT COUNT(*) as c FROM equipos WHERE status = 'despachada'").get().c;
    const instaladas = req.db.prepare("SELECT COUNT(*) as c FROM equipos WHERE status = 'instalada'").get().c;
    const devueltas = req.db.prepare("SELECT COUNT(*) as c FROM equipos WHERE status LIKE 'devuelta%'").get().c;
    const malEstado = req.db.prepare("SELECT COUNT(*) as c FROM equipos WHERE status = 'en_bines_mal_estado'").get().c;
    const abonados = req.db.prepare('SELECT COUNT(*) as c FROM abonados').get().c;
    const totalInstalaciones = req.db.prepare('SELECT COUNT(*) as c FROM instalaciones').get().c;
    const totalVales = req.db.prepare('SELECT COUNT(*) as c FROM vales').get().c;

    const byModelo = req.db.prepare(`
      SELECT modelo, COUNT(*) as count FROM equipos WHERE modelo != '' GROUP BY modelo ORDER BY count DESC LIMIT 10
    `).all();

    const byStatus = req.db.prepare(`
      SELECT status, COUNT(*) as count FROM equipos GROUP BY status ORDER BY count DESC
    `).all();

    const recentInstalaciones = req.db.prepare(`
      SELECT i.*
      FROM instalaciones i
      ORDER BY i.id DESC LIMIT 8
    `).all();

    const valesRecientes = req.db.prepare(`
      SELECT v.*, e.asset_code, e.modelo
      FROM vales v JOIN equipos e ON v.equipo_id = e.id
      ORDER BY v.id DESC LIMIT 5
    `).all();

    const tecnicos = req.db.prepare(`
      SELECT tecnico, COUNT(*) as count FROM instalaciones WHERE tecnico != '' GROUP BY tecnico ORDER BY count DESC LIMIT 8
    `).all();

    const byZona = req.db.prepare(`
      SELECT a.zone, COUNT(*) as count FROM instalaciones i
      JOIN abonados a ON i.abonado_name = a.name
      WHERE a.zone != '' AND i.abonado_name != ''
      GROUP BY a.zone ORDER BY count DESC LIMIT 8
    `).all();

    res.json({ total, enBines, despachadas, instaladas, devueltas, malEstado, abonados, totalInstalaciones, totalVales, byModelo, byStatus, recentInstalaciones, valesRecientes, tecnicos, byZona });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendDist, 'index.html'));
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sistema ONTs - Unidad de Bienes`);
  console.log(`Servidor: http://localhost:${PORT}`);
});
