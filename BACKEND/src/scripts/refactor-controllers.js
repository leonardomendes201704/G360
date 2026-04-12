/**
 * Script de Refatoração Automatizada — Controllers
 * 
 * Transforma os controllers para:
 * 1. Remover import global do prisma 
 * 2. Substituir uso direto de `prisma.` por `req.prisma.`
 * 3. Propagar `req.prisma` como primeiro argumento nas chamadas de Service
 */

const fs = require('fs');
const path = require('path');

const CTRL_DIR = path.resolve(__dirname, '../controllers');

// Controllers que precisam de tratamento manual
const SKIP_FILES = [
    'auth.controller.js', // Já tem lógica multi-tenant especial
];

function refactorController(filePath) {
    const fileName = path.basename(filePath);
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // 1. Remover import global do prisma
    content = content.replace(
        /const\s*\{\s*prisma\s*\}\s*=\s*require\s*\(\s*['"]\.\.\/config\/database['"]\s*\)\s*;?\s*\n?/g,
        ''
    );
    // Também pode estar como ../../config/database nos project controllers
    content = content.replace(
        /const\s*\{\s*prisma\s*\}\s*=\s*require\s*\(\s*['"]\.\.\/\.\.\/config\/database['"]\s*\)\s*;?\s*\n?/g,
        ''
    );

    // 2. Substituir usos diretos de `prisma.` por `req.prisma.`
    // Mas APENAS dentro de funções (req, res) — precisamos de cuidado
    // Pattern: prisma.model.method → req.prisma.model.method
    // NÃO substituir em: require('prisma'), PrismaClient, etc
    content = content.replace(
        /(?<![.\w])prisma\.(\w+)\./g,
        (match, model) => {
            // Evitar substituir coisas como "const prisma = ..."
            if (model === 'client' || model === 'PrismaClient') return match;
            return `req.prisma.${model}.`;
        }
    );

    // 3. Propagar req.prisma nas chamadas de Service
    // Pattern: SomeService.method(args) → SomeService.method(req.prisma, args)
    // Mas NÃO métodos que não precisam (validate, etc)
    content = content.replace(
        /(\w+Service)\.(\w+)\(\s*/g,
        (match, service, method) => {
            // Métodos que não são async/não usam banco
            const skipMethods = ['calculateTotalValue', 'formatCurrency', 'validateData'];
            if (skipMethods.includes(method)) return match;

            return `${service}.${method}(req.prisma, `;
        }
    );

    // 4. Corrigir chamadas com args vazios: (req.prisma, )
    content = content.replace(/\(req\.prisma,\s*\)/g, '(req.prisma)');

    // 5. Propagar para chamadas de Repository diretas (se houver nos controllers)
    content = content.replace(
        /(\w+Repository)\.(\w+)\(\s*/g,
        (match, repo, method) => {
            return `${repo}.${method}(req.prisma, `;
        }
    );
    content = content.replace(/\(req\.prisma,\s*\)/g, '(req.prisma)');

    // 6. Tratar getUserAccessScope se usado diretamente no controller
    content = content.replace(
        /getUserAccessScope\((?!req\.prisma)/g,
        'getUserAccessScope(req.prisma, '
    );

    // 7. Limpar linhas em branco extras
    content = content.replace(/^\s*\n\s*\n/, '\n');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf-8');
        return true;
    }
    return false;
}

// Recursively find all controllers
function findControllers(dir) {
    let results = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            results = results.concat(findControllers(fullPath));
        } else if (item.endsWith('.controller.js')) {
            results.push(fullPath);
        }
    }

    return results;
}

// Main
const files = findControllers(CTRL_DIR);
let modified = 0;
let skipped = 0;

console.log(`\n🔄 Refatorando ${files.length} controllers...\n`);

for (const filePath of files) {
    const fileName = path.basename(filePath);

    if (SKIP_FILES.includes(fileName)) {
        console.log(`  ⏭️  ${fileName} (skip)`);
        skipped++;
        continue;
    }

    const wasModified = refactorController(filePath);

    if (wasModified) {
        console.log(`  ✅ ${fileName}`);
        modified++;
    } else {
        console.log(`  ⚪ ${fileName} (sem mudanças)`);
    }
}

console.log(`\n📊 Resultado: ${modified} modificados, ${skipped} pulados, ${files.length - modified - skipped} sem mudanças\n`);
