const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database/ont_bienes.db'));

console.log('Migrando base de datos...');

// Drop old tables
db.exec('DROP TABLE IF EXISTS vale_items');
db.exec('DROP TABLE IF EXISTS vales');
console.log('  Tablas antiguas eliminadas (vales, vale_items)');

// Create new flat table
db.exec(`CREATE TABLE IF NOT EXISTS vale_salidas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vale_number INTEGER NOT NULL,
  solicitado TEXT DEFAULT '',
  seccion TEXT DEFAULT '',
  destino TEXT DEFAULT 'PARA USUARIOS',
  dia INTEGER,
  mes INTEGER,
  anio INTEGER,
  fecha TEXT DEFAULT '',
  codigo_bien TEXT NOT NULL,
  detalle TEXT DEFAULT '',
  cantidad INTEGER DEFAULT 1,
  unidad TEXT DEFAULT 'Pieza',
  observaciones TEXT DEFAULT '',
  autorizado TEXT DEFAULT '',
  recibido TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
console.log('  Tabla vale_salidas creada');

// Create indexes
db.exec('CREATE INDEX IF NOT EXISTS idx_vs_number ON vale_salidas(vale_number)');
db.exec('CREATE INDEX IF NOT EXISTS idx_vs_solicitado ON vale_salidas(solicitado)');
db.exec('CREATE INDEX IF NOT EXISTS idx_vs_codigo ON vale_salidas(codigo_bien)');
db.exec('CREATE INDEX IF NOT EXISTS idx_vs_fecha ON vale_salidas(fecha)');
console.log('  Indices creados');

// Verify
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('\nTablas actuales:');
tables.forEach(t => console.log('  - ' + t.name));

db.close();
console.log('\nMigracion completada.');
