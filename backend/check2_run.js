const Database = require('better-sqlite3');
const db = new Database('D:\\Bienes\\ont-bienes\\backend\\database\\ont_bienes.db');

const first5 = db.prepare("SELECT asset_code, description, modelo FROM equipos ORDER BY id DESC LIMIT 5").all();
console.log('Primeros 5 (ORDER BY id DESC):');
first5.forEach(r => console.log(`  ${r.asset_code} | desc="${r.description}" | modelo="${r.modelo}"`));

console.log('\nPrimeros 5 con descripcion:');
const withDesc = db.prepare("SELECT asset_code, description, modelo FROM equipos WHERE description != '' ORDER BY id DESC LIMIT 5").all();
withDesc.forEach(r => console.log(`  ${r.asset_code} | desc="${r.description.substring(0,60)}" | modelo="${r.modelo}"`));

console.log('\nSin descripcion:');
const empty = db.prepare("SELECT asset_code FROM equipos WHERE description = '' LIMIT 10").all();
empty.forEach(r => console.log(`  ${r.asset_code}`));

db.close();
