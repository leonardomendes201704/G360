/**
 * Playwright Screenshot Audit Script
 * Automatically logs in and captures screenshots of all G360 pages.
 * 
 * Usage: npx playwright test scripts/screenshot-audit.js --project=chromium
 * Or:    node scripts/screenshot-audit.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://localhost:5173';
const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots-audit');

// Credentials - try tenant admin first (most complete view)
const CREDENTIALS = {
    email: 'admin@liotencica.com.br',
    password: 'admin123',
};

// All pages to capture
const PAGES = [
    { name: '01-login', path: '/login', skipAuth: true },
    { name: '02-dashboard', path: '/dashboard' },
    { name: '03-projetos', path: '/projects' },
    { name: '04-tarefas', path: '/tasks' },
    { name: '05-gmud', path: '/changes' },
    { name: '06-financeiro', path: '/finance' },
    { name: '07-riscos', path: '/risks' },
    { name: '08-contratos', path: '/contracts' },
    { name: '09-fornecedores', path: '/suppliers' },
    { name: '10-ativos', path: '/assets' },
    { name: '11-base-conhecimento', path: '/knowledge-base' },
    { name: '12-incidentes', path: '/incidents' },
    { name: '13-aprovacoes', path: '/approvals' },
    { name: '14-configuracoes', path: '/config' },
    { name: '15-log-atividades', path: '/admin/activity-log' },
];

async function run() {
    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log('🚀 Starting screenshot audit...');
    console.log(`📁 Output: ${OUTPUT_DIR}\n`);

    const browser = await chromium.launch({
        headless: true,
        args: ['--ignore-certificate-errors'],
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    // 1. Capture login page
    console.log('📸 01-login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01-login.png'), fullPage: true });
    console.log('   ✅ Done');

    // 2. Login
    console.log('\n🔐 Logging in...');
    try {
        await page.fill('input[type="email"], input[name="email"]', CREDENTIALS.email);
        await page.fill('input[type="password"], input[name="password"]', CREDENTIALS.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard**', { timeout: 10000 });
        console.log('   ✅ Login successful!\n');
    } catch (e) {
        console.error('   ❌ Login failed:', e.message);
        console.log('   Trying with alternative credentials...');
        try {
            await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
            await page.fill('input[type="email"], input[name="email"]', 'admin@g360.com.br');
            await page.fill('input[type="password"], input[name="password"]', '12345678@aA');
            await page.click('button[type="submit"]');
            await page.waitForURL('**/dashboard**', { timeout: 10000 });
            console.log('   ✅ Login successful with fallback credentials!\n');
        } catch (e2) {
            console.error('   ❌ Both logins failed. Aborting.');
            await browser.close();
            process.exit(1);
        }
    }

    // 3. Navigate & capture each page
    for (const pg of PAGES) {
        if (pg.skipAuth) continue; // Already captured login

        const url = `${BASE_URL}${pg.path}`;
        console.log(`📸 ${pg.name}...`);

        try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(2000); // Let animations settle

            await page.screenshot({
                path: path.join(OUTPUT_DIR, `${pg.name}.png`),
                fullPage: true,
            });
            console.log('   ✅ Done');
        } catch (e) {
            console.log(`   ⚠️ Error: ${e.message.slice(0, 80)}`);
            // Still try to capture whatever is on screen
            try {
                await page.screenshot({ path: path.join(OUTPUT_DIR, `${pg.name}-error.png`) });
            } catch (_) { }
        }
    }

    await browser.close();

    // Summary
    const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'));
    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ Audit complete! ${files.length} screenshots captured.`);
    console.log(`📁 ${OUTPUT_DIR}`);
    console.log(`${'='.repeat(50)}\n`);
    files.forEach(f => console.log(`   - ${f}`));
}

run().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
