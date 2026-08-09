const Database = require('better-sqlite3');
const XLSX = require('xlsx');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database/ont_bienes.db');
const EXCEL_PATH = 'D:/Bienes/SALIDA MATERIALES 2026.xlsx';

function cleanText(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function dateToISO(v) {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m2) return `20${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;
  return s;
}

function main() {
  console.log('=== IMPORTAR DEVOLUCIONES DESDE HOJA GENERAL (columna U) ===\n');
  
  const wb = XLSX.readFile(EXCEL_PATH);
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = OFF');
  
  const wsGeneral = wb.Sheets['General'];
  const data = XLSX.utils.sheet_to_json(wsGeneral, { header: 1, defval: null });
  
  let inserted = 0;
  let skipped = 0;
  let noMatch = 0;
  
  // Preload equipos by asset_code for fast lookup
  const equiposMap = {};
  db.prepare('SELECT id, asset_code FROM equipos').all().forEach(e => {
    equiposMap[e.asset_code] = e.id;
  });
  
  console.log(`Equipos en DB: ${Object.keys(equiposMap).length}`);
  
  const insertDev = db.prepare(`
    INSERT OR IGNORE INTO devoluciones (equipo_id, asset_code, return_type, return_date, motivo, devuelto_por, stt_number, created_at)
    VALUES (?, ?, 'Retiro', ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  const importTx = db.transaction(() => {
    for (let i = 3; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      
      const colU = cleanText(row[20]); // Column U
      if (!colU) continue;
      
      const assetCode = cleanText(row[3]);
      if (!assetCode || !assetCode.startsWith('CTP')) {
        skipped++;
        continue;
      }
      
      const equipoId = equiposMap[assetCode];
      if (!equipoId) {
        noMatch++;
        continue;
      }
      
      // Parse column U text to extract useful data
      let returnDate = '';
      let motivo = colU;
      let devueltoPor = '';
      let sttNumber = '';
      
      // Try to extract date (DD/MM/YYYY or similar patterns)
      const dateMatch = colU.match(/(\d{2}\/\d{2}\/\d{4})/);
      if (dateMatch) {
        returnDate = dateMatch[1];
      } else {
        const dateMatch2 = colU.match(/(\d{2}\/\d{2}\/\d{2})/);
        if (dateMatch2) {
          returnDate = dateMatch2[1];
        }
      }
      
      // Try to extract STT number (N° \d+/\d{4})
      const sttMatch = colU.match(/N[°]\s*(\d+\/\d{4})/);
      if (sttMatch) {
        sttNumber = sttMatch[1];
      }
      
      // Try to extract who returned it (DEVUELTO POR ...)
      const returnedMatch = colU.match(/DEVUELTO\s*POR\s+(.+?)(?:\s+N[°]|\s+\d{2}\/\d{2}\/\d{4}|$)/i);
      if (returnedMatch) {
        devueltoPor = returnedMatch[1].trim();
      }
      
      // Check if already exists
      const exists = db.prepare('SELECT id FROM devoluciones WHERE asset_code = ?').get(assetCode);
      if (exists) continue;
      
      insertDev.run(equipoId, assetCode, dateToISO(returnDate) || null, motivo, devueltoPor, sttNumber);
      inserted++;
    }
  });
  
  importTx();
  
  console.log(`\n=== RESULTADO ===`);
  console.log(`  Insertados: ${inserted}`);
  console.log(`  Saltados (sin CTP en col D): ${skipped}`);
  console.log(`  Sin match en equipos: ${noMatch}`);
  
  db.close();
  console.log('\nListo.');
}

main();
