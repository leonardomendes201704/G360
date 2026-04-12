/**
 * Script de Refatoração Automatizada — Fase 2
 * 
 * Transforma todos os repositories de:
 *   const { prisma } = require('../config/database');
 *   static async findAll() { return prisma.model.findMany(); }
 * Para:
 *   static async findAll(prisma) { return prisma.model.findMany(); }
 * 
 * O script adiciona `prisma` como PRIMEIRO parâmetro de cada método estático.
 * Remove o import global do prisma.
 */

const fs = require('fs');
const path = require('path');

const REPO_DIR = path.resolve(__dirname, '../repositories');

// Repositories que NÃO devem ser modificados (se houver exceções)
const SKIP_FILES = [];

function refactorRepository(filePath) {
    const fileName = path.basename(filePath);
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // 1. Remover o import do prisma
    // Patterns: const { prisma } = require('../config/database');
    //           const { prisma } = require("../config/database");
    content = content.replace(
        /const\s*\{\s*prisma\s*\}\s*=\s*require\s*\(\s*['"]\.\.\/config\/database['"]\s*\)\s*;?\s*\n?/g,
        ''
    );

    // 2. Encontrar todos os métodos estáticos e adicionar `prisma` como primeiro parâmetro
    // Pattern: static async methodName(params) {
    content = content.replace(
        /static\s+async\s+(\w+)\s*\(([^)]*)\)/g,
        (match, methodName, params) => {
            const trimmedParams = params.trim();
            if (trimmedParams === '') {
                return `static async ${methodName}(prisma)`;
            }
            // Evitar duplicar se já tem prisma
            if (trimmedParams.startsWith('prisma')) {
                return match;
            }
            return `static async ${methodName}(prisma, ${trimmedParams})`;
        }
    );

    // 3. Remover linhas em branco extras no topo
    content = content.replace(/^\s*\n\s*\n/, '\n');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf-8');
        return true;
    }
    return false;
}

// Main
const files = fs.readdirSync(REPO_DIR).filter(f => f.endsWith('.repository.js'));
let modified = 0;
let skipped = 0;

console.log(`\n🔄 Refatorando ${files.length} repositories...\n`);

for (const file of files) {
    if (SKIP_FILES.includes(file)) {
        console.log(`  ⏭️  ${file} (skip)`);
        skipped++;
        continue;
    }

    const filePath = path.join(REPO_DIR, file);
    const wasModified = refactorRepository(filePath);

    if (wasModified) {
        console.log(`  ✅ ${file}`);
        modified++;
    } else {
        console.log(`  ⚪ ${file} (sem mudanças)`);
    }
}

console.log(`\n📊 Resultado: ${modified} modificados, ${skipped} pulados, ${files.length - modified - skipped} sem mudanças\n`);
