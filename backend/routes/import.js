const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const upload = multer({ dest: path.join(__dirname, '../../uploads/') });

function excelDateToISO(serial) {
  if (!serial || isNaN(serial)) return null;
  const s = parseInt(serial);
  if (s < 30000 || s > 50000) return null;
  const d = new Date((s - 25569) * 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

router.post('/excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se subio archivo' });

    const workbook = XLSX.readFile(req.file.path);
    const results = {};

    // ========== 1. EQUIPO ==========
    if (workbook.SheetNames.includes('equipo')) {
      const data = XLSX.utils.sheet_to_json(workbook.Sheets['equipo'], { header: 1 });
      let imported = 0, skipped = 0, errors = 0;
      const seen = {};

      for (let i = 2; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[0]) continue;
        const assetCode = row[0].toString().trim();
        if (!assetCode.startsWith('CTP')) continue;

        if (seen[assetCode]) {
          // Subsequent row for same code: merge unique data
          const existing = seen[assetCode];
          if (!existing.delivery_note_af && row[2]) existing.delivery_note_af = row[2].toString().trim();
          if (!existing.return_stt_note && row[8]) existing.return_stt_note = row[8].toString().trim();
          if (!existing.adapter_serial && row[3]) existing.adapter_serial = row[3].toString().trim();
          if (!existing.mac_address && row[4]) existing.mac_address = row[4].toString().trim();
          if (!existing.modelo && row[5]) existing.modelo = row[5].toString().trim();
          if (!existing.fsan && row[6]) existing.fsan = row[6].toString().trim();
          continue;
        }

        seen[assetCode] = {
          assetCode,
          description: (row[1] || '').toString().trim(),
          delivery_note_af: (row[2] || '').toString().trim(),
          adapter_serial: (row[3] || '').toString().trim(),
          mac_address: (row[4] || '').toString().trim(),
          modelo: (row[5] || '').toString().trim(),
          fsan: (row[6] || '').toString().trim(),
          observation: (row[7] || '').toString().trim(),
          return_stt_note: (row[8] || '').toString().trim(),
        };
      }

      const insertEq = req.db.prepare(`
        INSERT OR IGNORE INTO equipos (asset_code, description, delivery_note_af, adapter_serial,
          mac_address, modelo, fsan, observation, return_stt_note, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'disponible')
      `);

      for (const eq of Object.values(seen)) {
        try {
          const result = insertEq.run(eq.assetCode, eq.description, eq.delivery_note_af,
            eq.adapter_serial, eq.mac_address, eq.modelo, eq.fsan, eq.observation, eq.return_stt_note);
          if (result.changes > 0) imported++; else skipped++;
        } catch (e) { errors++; }
      }

      console.log(`[IMPORT] equipo: imported=${imported} skipped=${skipped} errors=${errors}`);
      results.equipo = { imported, skipped, errors };
    }

    // ========== 2. ABONADO ==========
    if (workbook.SheetNames.includes('abonado')) {
      const data = XLSX.utils.sheet_to_json(wbSheet(workbook, 'abonado'), { header: 1 });
      let imported = 0, skipped = 0, errors = 0;

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;
        const code = (row[1] || '').toString().trim();
        const parsed = parseInt(code);
        const name = (row[0] || '').toString().trim();
        if (isNaN(parsed) || parsed < 100) continue;
        if (!name) continue;

        try {
          const r = req.db.prepare(`
            INSERT OR IGNORE INTO abonados (client_code, name, zone, street)
            VALUES (?, ?, ?, ?)
          `).run(code, name, (row[2] || '').toString().trim(), (row[3] || '').toString().trim());
          if (r.changes > 0) imported++; else skipped++;
        } catch (e) { errors++; }
      }

      console.log(`[IMPORT] abonado: imported=${imported} skipped=${skipped} errors=${errors}`);
      results.abonado = { imported, skipped, errors };
    }

    // ========== 3. INSTALACION ==========
    if (workbook.SheetNames.includes('instalcion')) {
      const data = XLSX.utils.sheet_to_json(wbSheet(workbook, 'instalcion'), { header: 1 });
      let imported = 0, skipped = 0, errors = 0;

      for (let i = 2; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[0]) continue;
        const assetCode = row[0].toString().trim();
        if (!assetCode.startsWith('CTP')) continue;

        const eq = req.db.prepare('SELECT id FROM equipos WHERE asset_code = ?').get(assetCode);
        if (!eq) { skipped++; continue; }

        let abonadoName = '';
        let abonadoCode = '';
        const rawCode = row[1];
        if (rawCode !== null && rawCode !== undefined && rawCode !== '') {
          const clientCodeStr = rawCode.toString().trim();
          if (clientCodeStr && clientCodeStr !== 'NaN') {
            abonadoCode = clientCodeStr;
            const ab = req.db.prepare('SELECT name FROM abonados WHERE client_code = ?').get(clientCodeStr);
            if (ab) abonadoName = ab.name || '';
          }
        }

        const fecha = excelDateToISO(row[2]);
        const tecnico = (row[3] || '').toString().trim();

        if (!fecha && !tecnico && !abonadoName) { skipped++; continue; }

        try {
          req.db.prepare(`
            INSERT INTO instalaciones (asset_code, abonado_code, abonado_name, fecha, tecnico)
            VALUES (?, ?, ?, ?, ?)
          `).run(assetCode, abonadoCode, abonadoName, fecha, tecnico);
          imported++;
        } catch (e) { errors++; }
      }

      console.log(`[IMPORT] instalacion: imported=${imported} skipped=${skipped} errors=${errors}`);
      results.instalacion = { imported, skipped, errors };
    }

    // ========== 4. VALE ==========
    if (workbook.SheetNames.includes('vale')) {
      const data = XLSX.utils.sheet_to_json(wbSheet(workbook, 'vale'), { header: 1 });
      let imported = 0, skipped = 0, errors = 0;

      for (let i = 2; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[0]) continue;
        const assetCode = row[0].toString().trim();
        if (!assetCode.startsWith('CTP')) continue;

        const eq = req.db.prepare('SELECT id FROM equipos WHERE asset_code = ?').get(assetCode);
        if (!eq) { skipped++; continue; }

        try {
          req.db.prepare(`
            INSERT INTO vales (equipo_id, solicitado, salida_materiales, fecha)
            VALUES (?, ?, ?, ?)
          `).run(
            eq.id,
            (row[2] || '').toString().trim(),
            (row[3] || '').toString().trim(),
            excelDateToISO(row[4])
          );
          imported++;
        } catch (e) { errors++; }
      }

      console.log(`[IMPORT] vale: imported=${imported} skipped=${skipped} errors=${errors}`);
      results.vale = { imported, skipped, errors };
    }

    // ========== UPDATE STATUS ==========
    req.db.prepare(`UPDATE equipos SET status = 'instalada' WHERE asset_code IN (SELECT DISTINCT asset_code FROM instalaciones)`).run();
    req.db.prepare(`UPDATE equipos SET status = 'despachada' WHERE status = 'disponible' AND asset_code IN (SELECT DISTINCT asset_code FROM vales v JOIN equipos e ON v.equipo_id = e.id)`).run();
    req.db.prepare(`UPDATE equipos SET status = 'disponible' WHERE status = 'despachada' AND asset_code IN (SELECT DISTINCT asset_code FROM vales v JOIN equipos e ON v.equipo_id = e.id INTERSECT SELECT DISTINCT asset_code FROM instalaciones)`).run();

    fs.unlinkSync(req.file.path);
    res.json({ message: 'Importacion completada', results });
  } catch (e) {
    console.error('[IMPORT ERROR]', e.message);
    res.status(500).json({ error: e.message });
  }
});

function wbSheet(workbook, name) {
  return workbook.Sheets[name] || workbook.Sheets[name.toLowerCase()] || workbook.Sheets[name.toUpperCase()];
}

module.exports = router;
