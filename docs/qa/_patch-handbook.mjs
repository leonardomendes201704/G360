import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bookPath = path.join(__dirname, 'modals-evidence-handbook.html');
const fragPath = path.join(__dirname, '_modal-grid-fragment.html');

let book = fs.readFileSync(bookPath, 'utf8');
const frag = fs.readFileSync(fragPath, 'utf8');

/** Substitui apenas o bloco `<div class="modal-grid">…</div>` antes da nota de snapshots. */
const pattern = /<div class="modal-grid">[\s\S]*?\r?\n  <\/div>\r?\n\r?\n  <p class="note">/;
if (!pattern.test(book)) throw new Error('modal-grid block not found');

const newGrid = `<div class="modal-grid">
${frag.trimEnd()}
  </div>

  <p class="note">`;

book = book.replace(pattern, newGrid);

/** Atualiza contadores na legenda (Playwright vs pendente) — ajustar ao mapa em _gen-modal-grid.mjs. */
book = book.replace(
    /<span class="tag e2e">Playwright<\/span> <strong>\d+<\/strong>/,
    '<span class="tag e2e">Playwright</span> <strong>20</strong>'
);
book = book.replace(
    /<span class="tag manual">Pendente<\/span> <strong>\d+<\/strong>/,
    '<span class="tag manual">Pendente</span> <strong>29</strong>'
);

fs.writeFileSync(bookPath, book, 'utf8');
console.log('Patched', bookPath);
