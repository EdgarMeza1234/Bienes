const Database = require('better-sqlite3');
const XLSX = require('xlsx');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database/ont_bienes.db');
const EXCEL_PATH = 'D:/Bienes/SALIDA MATERIALES 2026.xlsx';

function excelDateToISO(serial) {
  if (!serial || typeof serial !== 'number' || serial < 1) return null;
  try {
    const d = new Date((serial - 25569) * 86400 * 1000);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  } catch { return null; }
}

function detectModel(description, db) {
  if (!description) return null;
  const desc = description.toUpperCase();
  const models = db.prepare('SELECT * FROM ont_models').all();
  
  const brandPatterns = [
    { pattern: /ZYXEL|AMG\d/, brand: 'ZYXEL' },
    { pattern: /DZS|ZNID|ZNTS/i, brand: 'DZS' },
    { pattern: /INNBOX/i, brand: 'IMBOX' },
    { pattern: /IMBOX/i, brand: 'IMBOX' },
    { pattern: /CDATA/i, brand: 'CDATA' },
    { pattern: /GBOPTIC|GB-\d{3}/i, brand: 'GBOPTIC' },
    { pattern: /UBIQUOSS|C824/i, brand: 'UBIQUOSS' },
    { pattern: /ISKRATEL|ISKT/i, brand: 'ISKRATEL' },
  ];
  
  let brand = '';
  for (const bp of brandPatterns) {
    if (bp.pattern.test(desc)) { brand = bp.brand; break; }
  }
  
  for (const m of models) {
    const mName = m.name.toUpperCase();
    if (desc.includes(mName) || (m.brand && m.brand.toUpperCase() === brand && mName.includes(brand))) {
      return m.id;
    }
  }
  
  if (brand) {
    for (const m of models) {
      if (m.brand && m.brand.toUpperCase() === brand) return m.id;
    }
  }
  
  return null;
}

function detectStatus(description, observation, responsible, returnInfo) {
  if (!description) return 'disponible';
  const desc = (description || '').toLowerCase();
  const obs = (observation || '').toLowerCase();
  const resp = (responsible || '').toLowerCase();
  const ret = (returnInfo || '').toLowerCase();
  
  if (ret.includes('devuelto') || obs.includes('devuelto')) return 'devuelta';
  if (desc.includes('mal estado') || obs.includes('mal estado') || resp.includes('mal estado')) return 'mal_estado';
  if (desc.includes('vendido') || obs.includes('vendido')) return 'vendida';
  if (obs.includes('retirado') || desc.includes('retirado')) return 'suspension';
  if (resp.includes('falta') || obs.includes('falta')) return 'despachada';
  if (obs.includes('deudor')) return 'deudor';
  
  return 'despachada';
}

function matchTech(text, techsMap, db) {
  if (!text) return null;
  const name = text.trim();
  if (name === 'RETIRADO') return null;
  if (!name) return null;
  
  if (techsMap[name]) return techsMap[name];
  
  const existing = db.prepare('SELECT id FROM technicians WHERE name = ?').get(name);
  if (existing) { techsMap[name] = existing.id; return existing.id; }
  
  const r = db.prepare('INSERT INTO technicians (name) VALUES (?)').run(name);
  techsMap[name] = r.lastInsertRowid;
  return r.lastInsertRowid;
}

function matchZone(text, zonesMap, db) {
  if (!text) return null;
  const name = text.trim();
  if (!name) return null;
  
  if (zonesMap[name]) return zonesMap[name];
  
  const existing = db.prepare('SELECT id FROM zones WHERE name = ?').get(name);
  if (existing) { zonesMap[name] = existing.id; return existing.id; }
  
  const r = db.prepare('INSERT INTO zones (name) VALUES (?)').run(name);
  zonesMap[name] = r.lastInsertRowid;
  return r.lastInsertRowid;
}

function cleanText(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function main() {
  console.log('=== IMPORTACION MASIVA DE EXCEL A SQLite ===\n');
  
  const wb = XLSX.readFile(EXCEL_PATH);
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = OFF');
  
  const techsMap = {};
  const zonesMap = {};
  const modelsCache = {};
  
  // Preload existing data
  db.prepare('SELECT id, name FROM technicians').all().forEach(t => techsMap[t.name] = t.id);
  db.prepare('SELECT id, name FROM zones').all().forEach(z => zonesMap[z.name] = z.id);
  db.prepare('SELECT id, name, brand FROM ont_models').all().forEach(m => modelsCache[m.name] = m);
  
  // Track ONTs by asset code for cross-referencing sheets
  const ontsByCode = {};
  db.prepare('SELECT id, asset_code FROM onts').all().forEach(o => ontsByCode[o.asset_code] = o.id);
  
  const importTransaction = db.transaction(() => {
    // ========================================
    // 1. IMPORTAR GENERAL (ONTs principales)
    // ========================================
    console.log('--- Importando hoja General ---');
    const wsGeneral = wb.Sheets['General'];
    const dataGeneral = XLSX.utils.sheet_to_json(wsGeneral, { header: 1, defval: null });
    
    let importedGeneral = 0;
    let skippedGeneral = 0;
    let updatedGeneral = 0;
    
    for (let i = 3; i < dataGeneral.length; i++) {
      const row = dataGeneral[i];
      if (!row) continue;
      
      const assetCode = cleanText(row[3]);
      if (!assetCode || !assetCode.startsWith('CTP')) { skippedGeneral++; continue; }
      
      const desc = cleanText(row[4]);
      if (!desc) { skippedGeneral++; continue; }
      
      const qty = parseInt(row[1]) || 1;
      const unit = cleanText(row[2]) || 'Pieza';
      const deliveryNote = cleanText(row[5]);
      const responsible = cleanText(row[6]);
      const clientCode = cleanText(row[7]);
      const zoneName = cleanText(row[8]);
      const streetAddress = cleanText(row[9]);
      const installDate = excelDateToISO(row[10]);
      const techName = cleanText(row[11]);
      const adapterSerial = cleanText(row[12]);
      const macAddress = cleanText(row[13]);
      const modelName = cleanText(row[14]);
      const fsan = cleanText(row[15]);
      const observation = cleanText(row[16]);
      const requestedBy = cleanText(row[17]);
      const exitNote = cleanText(row[18]);
      const exitDate = excelDateToISO(row[19]);
      const returnDate = cleanText(row[20]);
      const returnSTT = cleanText(row[21]);
      
      const zoneId = matchZone(zoneName, zonesMap, db);
      const techId = matchTech(techName, techsMap, db);
      
      let modelId = null;
      if (modelName) {
        modelId = detectModel(modelName, db);
        if (!modelId) {
          modelId = detectModel(desc, db);
        }
      }
      
      const status = detectStatus(desc, observation, responsible, returnDate);
      
      const existingOnt = db.prepare('SELECT id FROM onts WHERE asset_code = ?').get(assetCode);
      
      if (existingOnt) {
        // Update with richer data if available
        const existing = db.prepare('SELECT * FROM onts WHERE id = ?').get(existingOnt.id);
        const updates = [];
        const params = [];
        
        if (desc && (!existing.description || desc.length > existing.description.length)) {
          updates.push('description = ?'); params.push(desc);
        }
        if (adapterSerial && !existing.adapter_serial) {
          updates.push('adapter_serial = ?'); params.push(adapterSerial);
        }
        if (macAddress && !existing.mac_address) {
          updates.push('mac_address = ?'); params.push(macAddress);
        }
        if (modelId && !existing.model_id) {
          updates.push('model_id = ?'); params.push(modelId);
        }
        if (fsan && !existing.fsan) {
          updates.push('fsan = ?'); params.push(fsan);
        }
        if (zoneId && !existing.zone_id) {
          updates.push('zone_id = ?'); params.push(zoneId);
        }
        if (techId && !existing.technician_id) {
          updates.push('technician_id = ?'); params.push(techId);
        }
        if (responsible && !existing.responsible_name) {
          updates.push('responsible_name = ?'); params.push(responsible);
        }
        if (observation && observation.length > (existing.observation || '').length) {
          updates.push('observation = ?'); params.push(observation);
        }
        if (installDate && !existing.installation_date) {
          updates.push('installation_date = ?'); params.push(installDate);
        }
        if (exitDate && !existing.exit_date) {
          updates.push('exit_date = ?'); params.push(exitDate);
        }
        if (requestedBy && !existing.requested_by) {
          updates.push('requested_by = ?'); params.push(requestedBy);
        }
        if (exitNote && !existing.exit_note) {
          updates.push('exit_note = ?'); params.push(exitNote);
        }
        if (streetAddress && !existing.street_address) {
          updates.push('street_address = ?'); params.push(streetAddress);
        }
        if (clientCode && !existing.client_code) {
          updates.push('client_code = ?'); params.push(clientCode);
        }
        if (returnDate && !existing.return_date) {
          updates.push('return_date = ?'); params.push(returnDate);
        }
        
        if (updates.length > 0) {
          updates.push('updated_at = CURRENT_TIMESTAMP');
          db.prepare(`UPDATE onts SET ${updates.join(', ')} WHERE id = ?`).run(...params, existingOnt.id);
          updatedGeneral++;
        }
      } else {
        // Insert new ONT
        const r = db.prepare(`
          INSERT OR IGNORE INTO onts (item_number, quantity, unit, asset_code, description, delivery_note,
            responsible_name, client_code, zone_id, street_address, installation_date, technician_id,
            adapter_serial, mac_address, model_id, fsan, observation, requested_by, exit_note, exit_date,
            return_date, return_stt_note, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          parseInt(row[0]) || null, qty, unit, assetCode, desc, deliveryNote,
          responsible, clientCode, zoneId, streetAddress, installDate, techId,
          adapterSerial, macAddress, modelId, fsan, observation, requestedBy,
          exitNote, exitDate, returnDate || '', returnSTT || '', status
        );
        
        if (r.changes > 0) {
          ontsByCode[assetCode] = r.lastInsertRowid;
          importedGeneral++;
        } else {
          skippedGeneral++;
        }
      }
    }
    
    console.log(`  Importadas: ${importedGeneral}, Actualizadas: ${updatedGeneral}, Saltadas: ${skippedGeneral}`);
    
    // ========================================
    // 2. IMPORTAR VALES
    // ========================================
    console.log('\n--- Importando hoja Vale ---');
    const wsVale = wb.Sheets['Vale'];
    const dataVale = XLSX.utils.sheet_to_json(wsVale, { header: 1, defval: null });
    
    let importedVales = 0;
    let importedValeItems = 0;
    let currentVale = null;
    let currentItems = [];
    let currentSection = '', currentDestino = '', currentSolicitado = '';
    let currentDay = '', currentMonth = '', currentYear = '';
    
    function saveVale() {
      if (currentVale === null || currentItems.length === 0) return;
      const fullDate = (currentDay && currentMonth && currentYear) ? `${currentDay}/${currentMonth}/${currentYear}` : '';
      
      const existing = db.prepare('SELECT id FROM vales WHERE vale_number = ?').get(currentVale);
      if (existing) return; // Skip duplicate
      
      const v = db.prepare('INSERT INTO vales (vale_number, requested_by, section, destination, day, month, year, full_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        currentVale, currentSolicitado, currentSection, currentDestino, currentDay, currentMonth, currentYear, fullDate
      );
      
      for (const item of currentItems) {
        let ontId = ontsByCode[item.code];
        if (!ontId) {
          const found = db.prepare('SELECT id FROM onts WHERE asset_code = ?').get(item.code);
          if (found) ontId = found.id;
        }
        if (ontId) {
          db.prepare('INSERT INTO vale_items (vale_id, ont_id, quantity, unit) VALUES (?, ?, 1, ?)').run(v.lastInsertRowid, ontId, 'Pieza');
          importedValeItems++;
        }
      }
      importedVales++;
    }
    
    for (let i = 0; i < dataVale.length; i++) {
      const row = dataVale[i];
      if (!row) continue;
      
      // Detectar inicio de vale
      const col0 = cleanText(row[0]);
      const col4 = cleanText(row[4]);
      
      if (col0 === 'SALIDA DE MATERIALES' || (col0.includes('SALIDA') && col0.includes('MATERIALES'))) {
        saveVale();
        currentVale = null;
        currentItems = [];
        currentSection = ''; currentDestino = ''; currentSolicitado = '';
        currentDay = ''; currentMonth = ''; currentYear = '';
        
        if (col4) {
          const numMatch = col4.match(/(\d+)/);
          currentVale = numMatch ? parseInt(numMatch[1]) : null;
        }
        continue;
      }
      
      // Solicitado
      if (col0 && col0.includes('SOLICITADO POR')) {
        currentSolicitado = col0.replace(/SOLICITADO POR\s*:\s*/i, '').trim();
        if (row[4]) currentDay = String(row[4]);
        if (row[5]) currentMonth = String(row[5]);
        if (row[6]) currentYear = String(row[6]);
        continue;
      }
      
      // Seccion
      if (col0 && col0.includes('SECCION')) {
        currentSection = cleanText(row[2]);
        continue;
      }
      
      // Destino
      if (col0 && col0.includes('DESTINO')) {
        currentDestino = cleanText(row[2]);
        continue;
      }
      
      // Item de vale (row with CTP code)
      const itemCode = cleanText(row[2]);
      if (itemCode.startsWith('CTP')) {
        currentItems.push({ code: itemCode, desc: cleanText(row[3]) });
      }
    }
    
    saveVale();
    console.log(`  Vales importados: ${importedVales}, Items: ${importedValeItems}`);
    
    // ========================================
    // 3. IMPORTAR KARDEX FISICO
    // ========================================
    console.log('\n--- Importando hoja Kardex Fisico ---');
    const wsKardex = wb.Sheets['Kardex Fisico'];
    const dataKardex = XLSX.utils.sheet_to_json(wsKardex, { header: 1, defval: null });
    
    let importedKardex = 0;
    let currentOntCode = null;
    
    for (let i = 0; i < dataKardex.length; i++) {
      const row = dataKardex[i];
      if (!row) continue;
      
      const col0 = cleanText(row[0]);
      
      // Detectar encabezado de tarjeta de existencia
      if (col0 === 'TARJETA DE EXISTENCIA' || col0.includes('TARJETA')) {
        // La fila 2 tiene el codigo: "N° DE CODIGO:     ESTA CON CODIGOS DE ACTIVO FIJO"
        const nextRow = dataKardex[i + 2];
        if (nextRow) {
          const codeLine = cleanText(nextRow[0]);
          // Extract CTP code from code line if present
          const codeMatch = codeLine.match(/(CTP-[\d-]+)/);
          if (codeMatch) {
            currentOntCode = codeMatch[1];
          }
        }
        continue;
      }
      
      // Movement rows: col1=dia, col2=mes, col3=ano, col4=nota, col5=responsable, col6=seccion, col7=entrada, col8=salida, col9=saldo
      const dia = row[1];
      const mes = row[2];
      const ano = row[3];
      
      if (dia !== null && dia !== undefined && typeof dia === 'number' && currentOntCode) {
        const nota = cleanText(row[4]);
        const responsable = cleanText(row[5]);
        const seccion = cleanText(row[6]);
        const entrada = parseInt(row[7]) || 0;
        const salida = parseInt(row[8]) || 0;
        const saldo = parseInt(row[9]) || 0;
        
        const fecha = excelDateToISO(new Date(ano, mes - 1, dia).getTime() / 86400000 + 25569);
        
        let ontId = ontsByCode[currentOntCode];
        if (!ontId) {
          const found = db.prepare('SELECT id FROM onts WHERE asset_code = ?').get(currentOntCode);
          if (found) { ontId = found.id; ontsByCode[currentOntCode] = ontId; }
        }
        
        if (ontId) {
          const techId = matchTech(responsable, techsMap, db);
          
          db.prepare(`
            INSERT INTO kardex_movements (ont_id, movement_type, date, note_number, technician_id, section, quantity_in, quantity_out, balance, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            ontId,
            entrada > 0 ? 'ingreso' : 'salida',
            fecha || '',
            nota,
            techId,
            seccion,
            entrada,
            salida,
            saldo,
            ''
          );
          importedKardex++;
        }
      }
    }
    
    console.log(`  Movimientos kardex importados: ${importedKardex}`);
    
    // ========================================
    // 4. IMPORTAR DEVUELTOS
    // ========================================
    console.log('\n--- Importando hoja DEVUELTOS ---');
    const wsDevueltos = wb.Sheets['DEVUELTOS'];
    const dataDevueltos = XLSX.utils.sheet_to_json(wsDevueltos, { header: 1, defval: null });
    
    let importedDevueltos = 0;
    
    // Headers: Item(0), Cant(1), Und(2), Codigo(3), Descripcion(4), Nota(5), Responsable(6), 
    //          Codigo LD(7), Zona(8), Calle(9), Fecha Inst(10), Tecnico(11), Serie(12), 
    //          MAC(13), FSAN(14), Responsable(15), Empresa(16), Fecha Salida(17), 
    //          Fecha Retiro(18), Orden(19), Modelo ONT(20), Segun Solicitud(21), 
    //          Nueva Entrega(22), Salida Materiales(23), Fecha Salida(24), N Contrato(25),
    //          Nuevo Propietario(26), Telefono(27)
    
    for (let i = 4; i < dataDevueltos.length; i++) {
      const row = dataDevueltos[i];
      if (!row) continue;
      
      const assetCode = cleanText(row[3]);
      if (!assetCode || !assetCode.startsWith('CTP')) continue;
      
      const desc = cleanText(row[4]);
      const responsible = cleanText(row[6]);
      const techName = cleanText(row[11]);
      const adapterSerial = cleanText(row[12]);
      const macAddress = cleanText(row[13]);
      const returnDetail = cleanText(row[17]); // Fecha salida M. = when returned
      const newExit = cleanText(row[22]); // Nueva entrega ONT
      const exitDate = cleanText(row[23]); // Salida de materiales
      const newOwner = cleanText(row[26]); // Nuevo propietario
      const phone = cleanText(row[27]);
      const modelo = cleanText(row[20]);
      
      let ontId = ontsByCode[assetCode];
      if (!ontId) {
        // Create the ONT if it doesn't exist
        const techId = matchTech(techName, techsMap, db);
        const modelId = detectModel(modelo || desc, db);
        
        const r = db.prepare(`
          INSERT OR IGNORE INTO onts (asset_code, description, adapter_serial, mac_address, technician_id, model_id, status, responsible_name, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 'devuelta', ?, CURRENT_TIMESTAMP)
        `).run(assetCode, desc, adapterSerial, macAddress, techId, modelId, responsible);
        
        if (r.changes > 0) {
          ontId = r.lastInsertRowid;
          ontsByCode[assetCode] = ontId;
        }
      } else {
        // Update status to devuelta
        db.prepare("UPDATE onts SET status = 'devuelta', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status != 'devuelta'").run(ontId);
      }
      
      if (ontId) {
        const techId = matchTech(techName, techsMap, db);
        
        // Insert devolucion record
        db.prepare(`
          INSERT OR IGNORE INTO devoluciones (ont_id, return_type, return_date, reason_detail, returned_by, new_owner, created_at)
          VALUES (?, 'Retiro', ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(ontId, returnDetail || '', desc, responsible, newOwner);
        
        importedDevueltos++;
      }
    }
    
    console.log(`  Devueltos importados: ${importedDevueltos}`);
    
    // ========================================
    // 5. IMPORTAR DEUDORES
    // ========================================
    console.log('\n--- Importando hoja Deudores ---');
    const wsDeudores = wb.Sheets['Deudores'];
    const dataDeudores = XLSX.utils.sheet_to_json(wsDeudores, { header: 1, defval: null });
    
    let importedDeudores = 0;
    
    // Headers: Item(0), Cant(1), Unidad(2), Codigo(3), Detalle(4), N Serie(5), 
    //          Responsable(6), Nota Instruccion(7), Fecha(8), ..., Estado(10), ..., Propietario(12)
    
    for (let i = 3; i < dataDeudores.length; i++) {
      const row = dataDeudores[i];
      if (!row) continue;
      
      const assetCode = cleanText(row[3]);
      if (!assetCode || !assetCode.startsWith('CTP')) continue;
      
      const desc = cleanText(row[4]);
      const responsible = cleanText(row[6]);
      const instructionNote = cleanText(row[7]);
      const fecha = excelDateToISO(row[8]);
      const proprietor = cleanText(row[12]);
      
      let ontId = ontsByCode[assetCode];
      if (!ontId) {
        const r = db.prepare(`
          INSERT OR IGNORE INTO onts (asset_code, description, status, responsible_name, updated_at)
          VALUES (?, ?, 'deudor', ?, CURRENT_TIMESTAMP)
        `).run(assetCode, desc, responsible);
        
        if (r.changes > 0) {
          ontId = r.lastInsertRowid;
          ontsByCode[assetCode] = ontId;
        }
      } else {
        db.prepare("UPDATE onts SET status = 'deudor', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(ontId);
      }
      
      if (ontId) {
        const techId = matchTech(proprietor || responsible, techsMap, db);
        
        db.prepare(`
          INSERT OR IGNORE INTO deudores (ont_id, technician_id, instruction_note, instruction_date, status, created_at)
          VALUES (?, ?, ?, ?, 'pendiente', CURRENT_TIMESTAMP)
        `).run(ontId, techId, instructionNote, fecha);
        
        importedDeudores++;
      }
    }
    
    console.log(`  Deudores importados: ${importedDeudores}`);
    
    // ========================================
    // RESUMEN FINAL
    // ========================================
    console.log('\n=== RESUMEN ===');
    const stats = {
      onts: db.prepare('SELECT COUNT(*) as c FROM onts').get().c,
      vales: db.prepare('SELECT COUNT(*) as c FROM vales').get().c,
      vale_items: db.prepare('SELECT COUNT(*) as c FROM vale_items').get().c,
      kardex: db.prepare('SELECT COUNT(*) as c FROM kardex_movements').get().c,
      devoluciones: db.prepare('SELECT COUNT(*) as c FROM devoluciones').get().c,
      deudores: db.prepare('SELECT COUNT(*) as c FROM deudores').get().c,
      zones: db.prepare('SELECT COUNT(*) as c FROM zones').get().c,
      techs: db.prepare('SELECT COUNT(*) as c FROM technicians').get().c,
      models: db.prepare('SELECT COUNT(*) as c FROM ont_models').get().c,
    };
    
    console.log(`  ONTs total: ${stats.onts}`);
    console.log(`  Vales: ${stats.vales} (items: ${stats.vale_items})`);
    console.log(`  Movimientos kardex: ${stats.kardex}`);
    console.log(`  Devoluciones: ${stats.devoluciones}`);
    console.log(`  Deudores: ${stats.deudores}`);
    console.log(`  Zonas: ${stats.zones}`);
    console.log(`  Tecnicos: ${stats.techs}`);
    console.log(`  Modelos: ${stats.models}`);
    
    // Status breakdown
    console.log('\n--- ONTs por estado ---');
    const statuses = db.prepare('SELECT status, COUNT(*) as c FROM onts GROUP BY status ORDER BY c DESC').all();
    statuses.forEach(s => console.log(`  ${s.status}: ${s.c}`));
  });
  
  importTransaction();
  
  db.close();
  console.log('\n=== IMPORTACION COMPLETADA ===');
}

main();
