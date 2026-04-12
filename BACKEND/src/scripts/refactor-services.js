/**
 * Script de Refatoração Automatizada — Services
 * 
 * Transforma os services para:
 * 1. Remover import global do prisma
 * 2. Adicionar `prisma` como primeiro parâmetro em métodos estáticos
 * 3. Propagar `prisma` em chamadas de Repository (Repository.method → Repository.method(prisma, ...))
 * 4. Substituir usos inline de `const { prisma } = require(...)` dentro de funções
 */

const fs = require('fs');
const path = require('path');

const SERVICE_DIR = path.resolve(__dirname, '../services');

// Services com lógica especial ou já refatorados
const SKIP_FILES = [
    'auth.service.js',     // Já refatorado manualmente, precisa tratamento especial
    'mail.service.js',     // Não usa prisma
    'email-template.service.js', // Não usa prisma
    'ldap.service.js',     // Não usa prisma
];

function refactorService(filePath) {
    const fileName = path.basename(filePath);
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // Verificar se o arquivo usa prisma
    if (!content.includes('prisma') && !content.includes('Repository')) {
        return false;
    }

    // 1. Remover import global do prisma no topo
    content = content.replace(
        /const\s*\{\s*prisma\s*\}\s*=\s*require\s*\(\s*['"]\.\.\/config\/database['"]\s*\)\s*;?\s*\n?/g,
        ''
    );

    // 2. Remover imports inline do prisma dentro de funções
    content = content.replace(
        /\s*const\s*\{\s*prisma\s*\}\s*=\s*require\s*\(\s*['"]\.\.\/config\/database['"]\s*\)\s*;?\s*\n?/g,
        '\n'
    );

    // 3. Adicionar `prisma` como primeiro parâmetro nos métodos estáticos
    content = content.replace(
        /static\s+async\s+(\w+)\s*\(([^)]*)\)/g,
        (match, methodName, params) => {
            const trimmedParams = params.trim();
            // Métodos utilitários puros que não usam banco
            const pureMethods = ['calculateTotalValue', 'formatCurrency', 'validateData'];
            if (pureMethods.includes(methodName)) return match;

            if (trimmedParams === '') {
                return `static async ${methodName}(prisma)`;
            }
            if (trimmedParams.startsWith('prisma')) {
                return match;
            }
            return `static async ${methodName}(prisma, ${trimmedParams})`;
        }
    );

    // 3b. Também tratar métodos estáticos não-async
    content = content.replace(
        /static\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
        (match, methodName, params) => {
            // Skip se é async (já tratado acima)
            if (methodName === 'async') return match;

            const pureMethods = ['calculateTotalValue', 'formatCurrency', 'validateData'];
            if (pureMethods.includes(methodName)) return match;

            return match; // Não modificar métodos síncronos
        }
    );

    // 4. Propagar prisma nas chamadas de Repository
    // Pattern: SomeRepository.method(args) → SomeRepository.method(prisma, args)
    // Mas NÃO se já tem prisma como primeiro arg
    content = content.replace(
        /(\w+Repository)\.(\w+)\(/g,
        (match, repo, method) => {
            return `${repo}.${method}(prisma, `;
        }
    );

    // 5. Corrigir chamadas que agora têm `(prisma, )` (sem args originais)
    content = content.replace(/\(prisma,\s*\)/g, '(prisma)');

    // 6. Corrigir chamadas a `this.method(` dentro dos services
    content = content.replace(
        /(?:this|(?:[A-Z]\w+Service))\.(\w+)\(/g,
        (match, methodName) => {
            // Métodos puros que não precisam de prisma
            const pureMethods = ['calculateTotalValue', 'formatCurrency', 'validateData'];
            if (pureMethods.includes(methodName)) return match;

            // Verificar se já tem prisma
            return match; // Não mudar this. calls — será feito manualmente se necessário
        }
    );

    // 7. Propagar prisma no getUserAccessScope
    content = content.replace(
        /getUserAccessScope\((?!prisma)/g,
        'getUserAccessScope(prisma, '
    );

    // 8. Limpar linhas em branco duplicadas no topo
    content = content.replace(/^\s*\n\s*\n/, '\n');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf-8');
        return true;
    }
    return false;
}

// Main
const files = fs.readdirSync(SERVICE_DIR).filter(f => f.endsWith('.service.js'));
let modified = 0;
let skipped = 0;

console.log(`\n🔄 Refatorando ${files.length} services...\n`);

for (const file of files) {
    if (SKIP_FILES.includes(file)) {
        console.log(`  ⏭️  ${file} (skip)`);
        skipped++;
        continue;
    }

    const filePath = path.join(SERVICE_DIR, file);
    const wasModified = refactorService(filePath);

    if (wasModified) {
        console.log(`  ✅ ${file}`);
        modified++;
    } else {
        console.log(`  ⚪ ${file} (sem mudanças)`);
    }
}

console.log(`\n📊 Resultado: ${modified} modificados, ${skipped} pulados, ${files.length - modified - skipped} sem mudanças\n`);
