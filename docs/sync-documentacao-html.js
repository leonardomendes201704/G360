#!/usr/bin/env node
/**
 * Reincorpora DOCUMENTACAO.md em docs/documentacao-modulos-itbm.html (secção #documentacao-md).
 * Executar na raiz do repositório: node docs/sync-documentacao-html.js
 * Requer: npm install em BACKEND (pacote marked).
 */
const fs = require('fs');
const path = require('path');
const { marked } = require(path.join(__dirname, '..', 'BACKEND', 'node_modules', 'marked'));

const root = path.join(__dirname, '..');
const mdPath = path.join(root, 'DOCUMENTACAO.md');
const htmlPath = path.join(__dirname, 'documentacao-modulos-itbm.html');

const md = fs.readFileSync(mdPath, 'utf8');
marked.setOptions({ gfm: true, headerIds: true, mangle: false });
let body = marked.parse(md);
body = body.replace(/id="/g, 'id="md-').replace(/href="#/g, 'href="#md-');
body = body.replace(/^<h1[^>]*>/, '<h2 class="doc-md-title">').replace(/<\/h1>/, '</h2>');

const html = fs.readFileSync(htmlPath, 'utf8');
const markerStart = '<div class="doc-md-content">';
const markerEnd = '\n        </div>\n      </section>';

const i0 = html.indexOf(markerStart);
const i1 = html.indexOf(markerEnd, i0);
if (i0 === -1 || i1 === -1) {
  console.error('Secção doc-md-content não encontrada em', htmlPath);
  process.exit(1);
}

const head = html.slice(0, i0 + markerStart.length);
const tail = html.slice(i1);
const out = `${head}\n${body}${tail}`;
fs.writeFileSync(htmlPath, out, 'utf8');
console.log('Atualizado:', htmlPath);
