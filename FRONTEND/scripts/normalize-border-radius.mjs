/**
 * Normaliza border-radius / borderRadius no src para 8px (pedido UI G360).
 * Executar: node scripts/normalize-border-radius.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');

function walk(dir, out) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name === 'node_modules') continue;
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p, out);
    else if (/\.(jsx?|css)$/.test(name.name)) out.push(p);
  }
}

function processContent(content) {
  let s = content;

  // CSS: border-radius: ...
  s = s.replace(/^(\s*)border-radius\s*:\s*([^;]+);/gim, (m, indent) => `${indent}border-radius: 8px;`);

  // -webkit- / -moz-
  s = s.replace(
    /^(\s*)-(webkit|moz)-border-radius\s*:\s*[^;]+;/gim,
    (m, indent, pfx) => `${indent}-${pfx}-border-radius: 8px;`
  );

  // borderRadius: '...' (sem template ${ })
  s = s.replace(/\bborderRadius\s*:\s*'([^']*)'/g, (m, inner) => {
    if (inner.includes('${')) return m;
    if (inner.trim() === '8px') return m;
    return `borderRadius: '8px'`;
  });
  s = s.replace(/\bborderRadius\s*:\s*"([^"]*)"/g, (m, inner) => {
    if (inner.includes('${')) return m;
    if (inner.trim() === '8px') return m;
    return `borderRadius: '8px'`;
  });

  // borderRadius: número
  s = s.replace(/\bborderRadius\s*:\s*(\d+\.?\d*)\s*(?=[,}\n\r])/g, () => `borderRadius: '8px'`);

  return s;
}

const files = [];
walk(SRC, files);
let n = 0;
for (const f of files) {
  // createTheme(shape.borderRadius) exige número — estes ficheiros ajustam-se à mão
  if (f.endsWith(`${path.sep}theme.js`)) continue;
  if (f.includes(`${path.sep}theme${path.sep}`) && f.endsWith('.js')) continue;

  const before = fs.readFileSync(f, 'utf8');
  const after = processContent(before);
  if (after !== before) {
    fs.writeFileSync(f, after, 'utf8');
    n++;
    console.log(path.relative(SRC, f));
  }
}
console.log(`\nAtualizados: ${n} ficheiros.`);
