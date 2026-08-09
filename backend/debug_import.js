const Database = require('better-sqlite3');
const path = require('path');
const XLSX = require('xlsx');
const { initDatabase, DB_PATH } = require('./database/init');
initDatabase();
console.log('DB_PATH:', DB_PATH);
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

console.log('DB equipos BEFORE:', db.prepare('SELECT COUNT(*) as c FROM equipos').get().c);

const wb = XLSX.readFile('C:\\Users\\Dell\\AppData\\Local\\Temp\\opencode\\test_import.xlsx');
const data = XLSX.utils.sheet_to_json(wb.Sheets['General'], { header: 1 });
console.log('Total rows:', data.length);

// Debug first 5 data rows
for (let i = 3; i < 8; i++) {
  const row = data[i];
  console.log(`Row ${i}: row[3]=${JSON.stringify(row?.[3])}, type=${typeof row?.[3]}`);
}

let importedEquipos = 0, skippedEquipos = 0, errors = 0;
const zonesMap = {}, techsMap = {}, modelsMap = {}, usuariosCache = {};

for (let i = 3; i < data.length; i++) {
  const row = data[i];
  if (!row || !row[3] || typeof row[3] !== 'string' || !row[3].startsWith('CTP')) { skippedEquipos++; continue; }

  try {
    const assetCode = row[3].trim();
    const desc = (row[4] || '').toString().trim();
    if (!desc) { skippedEquipos++; continue; }

    const existing = db.prepare('SELECT id FROM equipos WHERE asset_code = ?').get(assetCode);
    if (existing) { skippedEquipos++; continue; }

    const zoneName = (row[8] || '').toString().trim();
    let zoneId = null;
    if (zoneName) {
      if (!zonesMap[zoneName]) {
        const z = db.prepare('INSERT OR IGNORE INTO zones (name) VALUES (?)').run(zoneName);
        if (z.changes > 0) zonesMap[zoneName] = z.lastInsertRowid;
        else { const f = db.prepare('SELECT id FROM zones WHERE name = ?').get(zoneName); zonesMap[zoneName] = f ? f.id : null; }
      }
      zoneId = zonesMap[zoneName];
    }

    const techName = (row[11] || '').toString().trim();
    let techId = null;
    if (techName && techName !== 'RETIRADO') {
      if (!techsMap[techName]) {
        const t = db.prepare('INSERT OR IGNORE INTO technicians (name) VALUES (?)').run(techName);
        if (t.changes > 0) techsMap[techName] = t.lastInsertRowid;
        else { const f = db.prepare('SELECT id FROM technicians WHERE name = ?').get(techName); techsMap[techName] = f ? f.id : null; }
      }
      techId = techsMap[techName];
    }

    const modelName = (row[14] || '').toString().trim();
    let modelId = null;
    if (modelName) {
      if (!modelsMap[modelName]) {
        const m = db.prepare('INSERT OR IGNORE INTO ont_models (name) VALUES (?)').run(modelName);
        if (m.changes > 0) modelsMap[modelName] = m.lastInsertRowid;
        else { const f = db.prepare('SELECT id FROM ont_models WHERE name = ?').get(modelName); modelsMap[modelName] = f ? f.id : null; }
      }
      modelId = modelsMap[modelName];
    }

    const clientCode = (row[7] || '').toString().trim();
    const userName = (row[6] || '').toString().trim();
    let usuarioId = null;
    if (clientCode && !usuariosCache[clientCode]) {
      const u = db.prepare('INSERT OR IGNORE INTO usuarios (client_code, name, zone_text, zone_id, street_address) VALUES (?, ?, ?, ?, ?)').run(
        clientCode, userName, zoneName, zoneId, (row[9] || '').toString().trim()
      );
      if (u.changes > 0) { usuariosCache[clientCode] = u.lastInsertRowid; }
      else { const f = db.prepare('SELECT id FROM usuarios WHERE client_code = ?').get(clientCode); usuariosCache[clientCode] = f ? f.id : null; }
    } else if (clientCode) { usuarioId = usuariosCache[clientCode]; }
    if (clientCode) usuarioId = usuariosCache[clientCode];

    let status = 'disponible';
    const hasReturn = (row[20] || '').toString().trim();
    const hasExitDate = (row[19] || '').toString().trim();
    const hasInstallation = (row[10] || '').toString().trim();
    if (hasReturn) {
      const reason = hasReturn.toLowerCase();
      if (reason.includes('cambio de plan')) status = 'devuelta_cambio_plan';
      else if (reason.includes('cambio de ont') || reason.includes('cambio de equipo')) status = 'devuelta_cambio_equipo';
      else status = 'devuelta_defecto';
    } else if (hasInstallation) { status = 'instalada'; }
    else if (hasExitDate) { status = 'despachada'; }

    db.prepare(`INSERT OR IGNORE INTO equipos (asset_code, description, delivery_note_af, adapter_serial,
      mac_address, model_text, fsan, observation, technician_text, installation_date,
      requested_by, exit_note, exit_date, return_reason, return_date, return_stt_note,
      new_delivery_af, status, location, usuario_id, model_id, technician_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      assetCode, desc, (row[5]||'').toString().trim(), (row[12]||'').toString().trim(),
      (row[13]||'').toString().trim(), modelName, (row[15]||'').toString().trim(),
      (row[16]||'').toString().trim(), techName, (row[10]||'').toString().trim()||null,
      (row[17]||'').toString().trim(), (row[18]||'').toString().trim(),
      (row[19]||'').toString().trim()||null, (row[20]||'').toString().trim(),
      (row[21]||'').toString().trim()||null, (row[22]||'').toString().trim()||null,
      (row[25]||'').toString().trim()||null, status, zoneName, usuarioId, modelId, techId
    );
    importedEquipos++;
  } catch (e) { errors++; if (errors <= 5) console.log('ERROR row', i, ':', e.message); }
}

console.log('imported:', importedEquipos, 'skipped:', skippedEquipos, 'errors:', errors);
console.log('DB equipos AFTER:', db.prepare('SELECT COUNT(*) as c FROM equipos').get().c);
console.log('DB usuarios AFTER:', db.prepare('SELECT COUNT(*) as c FROM usuarios').get().c);
db.close();
