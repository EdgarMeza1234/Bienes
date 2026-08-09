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

function cleanText(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function main() {
  console.log('=== REIMPORTACION DE VALES (NUEVA ESTRUCTURA FLATA) ===\n');

  const wb = XLSX.readFile(EXCEL_PATH);
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  const wsVale = wb.Sheets['Vale'];
  const data = XLSX.utils.sheet_to_json(wsVale, { header: 1, defval: null });

  const insert = db.prepare(`INSERT INTO vale_salidas
    (vale_number, solicitado, seccion, destino, dia, mes, anio, fecha, codigo_bien, detalle, cantidad, unidad, observaciones, autorizado, recibido)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const seen = new Set();
  let imported = 0;
  let totalItems = 0;

  const importTransaction = db.transaction(() => {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      const col0 = cleanText(row[0]);
      const col4 = cleanText(row[4]);

      // Detectar inicio de vale
      if (col0.includes('SALIDA DE MATERIALES') && col4.includes('N')) {
        const numMatch = col4.match(/(\d+)/);
        const num = numMatch ? parseInt(numMatch[1]) : null;
        if (!num || seen.has(num)) continue;
        seen.add(num);

        let solicitado = '', seccion = '', destino = '';
        let dia = '', mes = '', anio = '';
        let autorizado = '', recibido = '';
        let items = [];
        let notas = [];

        // Scan next rows for this vale
        for (let j = i + 1; j < Math.min(i + 55, data.length); j++) {
          const r = data[j];
          if (!r) continue;
          const c0 = cleanText(r[0]);

          // Stop at next vale or company header
          if (j > i + 2 && c0.includes('SALIDA DE MATERIALES') && cleanText(r[4]).includes('N')) break;
          if (c0.includes('Cooperativa de Telecomunicaciones')) break;

          // Solicitado
          if (c0.includes('SOLICITADO POR')) {
            solicitado = c0.replace(/SOLICITADO POR\s*:\s*/i, '').trim();
          }

          // Seccion + fecha
          if (c0.includes('SECCION')) {
            seccion = cleanText(r[2]);
            if (r[4]) dia = String(r[4]);
            if (r[5]) mes = String(r[5]);
            if (r[6]) anio = String(r[6]);
          }

          // Destino
          if (c0.includes('DESTINO')) {
            destino = cleanText(r[2]);
          }

          // Items (CTP codes)
          const code = cleanText(r[2]);
          if (code.startsWith('CTP')) {
            items.push({
              codigo: code,
              descripcion: cleanText(r[3]),
              cantidad: parseInt(r[0]) || 1,
              unidad: cleanText(r[1]) || 'Pieza'
            });
          }

          // Observaciones (notes in col 3)
          const col3 = cleanText(r[3]);
          if (col3 && !col3.startsWith('CTP') && col3.length > 5 &&
              !col3.includes('C  R  I  P  C  I  O  N') &&
              !col3.includes('CODIGO DEL')) {
            if (col3.includes('cada uno') || col3.includes('adaptador') || col3.includes('con cable') ||
                col3.includes('caja') || col3.includes('No cuentan')) {
              notas.push(col3);
            }
          }

          // Autorizado / firmas
          if (c0.includes('AUTORIZADO') || c0.includes('JEFE DE DIVISION')) {
            autorizado = c0;
            const nextR = data[j + 1];
            if (nextR) {
              recibido = cleanText(nextR[0]);
            }
          }
        }

        // Build full date
        const fecha = (dia && mes && anio) ? `${dia}/${mes}/${anio}` : '';
        const observaciones = notas.join('; ');
        const autorizadoClean = autorizado.replace(/\s+/g, ' ').trim();

        // Insert one row per ONT item
        for (const item of items) {
          insert.run(
            num, solicitado, seccion, destino,
            dia || null, mes || null, anio || null, fecha,
            item.codigo, item.descripcion,
            item.cantidad, item.unidad,
            observaciones, autorizadoClean, recibido
          );
          totalItems++;
        }

        imported++;
      }
    }
  });

  importTransaction();

  console.log(`Vales procesados: ${imported}`);
  console.log(`Total filas insertadas (ONTs): ${totalItems}`);

  // Verify
  const count = db.prepare('SELECT COUNT(*) as c FROM vale_salidas').get();
  const vales = db.prepare('SELECT vale_number, COUNT(*) as items FROM vale_salidas GROUP BY vale_number ORDER BY vale_number').all();

  console.log('\nVerificacion - Total filas en DB:', count.c);
  console.log('\nVales importados:');
  for (const v of vales) {
    console.log(`  Vale N° ${v.vale_number}: ${v.items} ONTs`);
  }

  db.close();
  console.log('\n=== IMPORTACION COMPLETADA ===');
}

main();
