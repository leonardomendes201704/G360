import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bookPath = path.join(__dirname, 'modals-evidence-handbook.html');
const fragPath = path.join(__dirname, '_modal-grid-fragment.html');

let book = fs.readFileSync(bookPath, 'utf8');
const frag = fs.readFileSync(fragPath, 'utf8');

const start = book.indexOf('<h2 id="e2e">');
const end = book.indexOf('<h2 id="inventario">');
if (start === -1 || end === -1) throw new Error('markers not found');

const replacement = `  <h2 id="grelha-49">Grelha das 49 evidências — <code class="path">components/modals/</code></h2>
  <p class="legend-grid">
    <span class="tag e2e">Playwright</span> <strong>5</strong> modais com captura automática no repositório (PNG). &nbsp;
    <span class="tag manual">Pendente</span> <strong>44</strong> com moldura para <strong>captura manual</strong> — substituir o conteúdo cinzento por print ou colar &lt;img&gt; no HTML antes do PDF.
  </p>
  <p class="muted">Regenerar a grelha (após editar dados): <code class="path">node docs/qa/_gen-modal-grid.mjs</code> e voltar a aplicar este patch, ou editar <code class="path">modals-evidence-handbook.html</code> diretamente.</p>

  <div class="modal-grid">
${frag.trimEnd()}
  </div>

  <p class="note">
    <strong>Snapshots E2E:</strong> os PNG estão em <code class="path">FRONTEND/e2e/*.spec.ts-snapshots/</code> (Chromium win32). <strong>Login</strong> (<code class="path">auth-login-page-chromium-win32.png</code>) não é modal.
  </p>

`;

book = book.slice(0, start) + replacement + book.slice(end);

fs.writeFileSync(bookPath, book, 'utf8');
console.log('Patched', bookPath);
