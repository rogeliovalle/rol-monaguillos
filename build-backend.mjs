import fs from 'node:fs';
const files=['dist/model.js','dist/importer.js','backend/sync-core.js','backend/bridge.gs'];
const content=files.map(f=>fs.readFileSync(f,'utf8').replace(/^import .*?;\n/gm,'').replace(/export /g,'')).join('\n');
fs.writeFileSync('backend/Code.gs',content);
console.log('backend/Code.gs preparado. Sin claves ni datos privados.');
