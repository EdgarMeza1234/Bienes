const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ont_bienes.db');

function initDatabase() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  console.log('Creando tablas...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS equipos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_code TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      delivery_note_af TEXT DEFAULT '',
      adapter_serial TEXT DEFAULT '',
      mac_address TEXT DEFAULT '',
      modelo TEXT DEFAULT '',
      fsan TEXT DEFAULT '',
      serie_equipo TEXT DEFAULT '',
      color TEXT DEFAULT '',
      observation TEXT DEFAULT '',
      return_stt_note TEXT DEFAULT '',
      status TEXT DEFAULT 'disponible',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS abonados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_code TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      zone TEXT DEFAULT '',
      street TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(client_code, name)
    );

    CREATE TABLE IF NOT EXISTS instalaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_code TEXT DEFAULT '',
      abonado_code TEXT DEFAULT '',
      abonado_name TEXT DEFAULT '',
      fecha TEXT,
      tecnico TEXT DEFAULT '',
      observacion TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipo_id INTEGER NOT NULL,
      solicitado TEXT DEFAULT '',
      salida_materiales TEXT DEFAULT '',
      fecha TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (equipo_id) REFERENCES equipos(id)
    );

    CREATE TABLE IF NOT EXISTS devoluciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipo_id INTEGER NOT NULL,
      asset_code TEXT DEFAULT '',
      return_type TEXT DEFAULT '',
      return_date TEXT,
      nro_informe TEXT DEFAULT '',
      stt_number TEXT DEFAULT '',
      cite_ref TEXT DEFAULT '',
      motivo TEXT DEFAULT '',
      devuelto_por TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (equipo_id) REFERENCES equipos(id)
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_equipos_asset ON equipos(asset_code);
    CREATE INDEX IF NOT EXISTS idx_equipos_status ON equipos(status);
    CREATE INDEX IF NOT EXISTS idx_equipos_mac ON equipos(mac_address);
    CREATE INDEX IF NOT EXISTS idx_equipos_modelo ON equipos(modelo);
    CREATE INDEX IF NOT EXISTS idx_abonados_code ON abonados(client_code);
    CREATE INDEX IF NOT EXISTS idx_abonados_name ON abonados(name);
    CREATE INDEX IF NOT EXISTS idx_abonados_zone ON abonados(zone);
    CREATE INDEX IF NOT EXISTS idx_inst_asset ON instalaciones(asset_code);
    CREATE INDEX IF NOT EXISTS idx_inst_abonado_name ON instalaciones(abonado_name);
    CREATE INDEX IF NOT EXISTS idx_inst_abonado_code ON instalaciones(abonado_code);
    CREATE INDEX IF NOT EXISTS idx_vales_equipo ON vales(equipo_id);
    CREATE INDEX IF NOT EXISTS idx_devoluciones_equipo ON devoluciones(equipo_id);
    CREATE INDEX IF NOT EXISTS idx_devoluciones_asset ON devoluciones(asset_code);
  `);

  console.log('Base de datos inicializada correctamente en:', DB_PATH);
  db.close();
}

if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase, DB_PATH };
