const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const mdDir = '/Users/lmuniz/.gemini/antigravity/brain/b76fcdbc-c8ab-4189-bfd7-e93d7d39c11b';
const outputFile = '/Users/lmuniz/Documents/Projetos/ITBM/ITBM_Wiki.html';

const files = [
    '01_Gestao_Servicos_ITSM.md',
    '02_Gestao_Ativos_CMDB.md',
    '03_Gestao_Mudancas_Aprovacoes.md',
    '04_Gestao_Projetos_Tarefas_PPM.md',
    '05_Gestao_Financeira_ITBM.md',
    '06_Gestao_Fornecedores_Contratos.md',
    '07_Gestao_Conhecimento_Riscos.md',
    '08_Admin_Config_Global.md',
    '09_Dashboards_Relatorios.md',
    '10_Inter_Relacionamento_Modulos.md'
];

let navHtml = '';
let contentHtml = '';

files.forEach((file, index) => {
    const filePath = path.join(mdDir, file);
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return;
    }
    
    const markdown = fs.readFileSync(filePath, 'utf-8');
    const html = marked.parse(markdown);
    
    // Extract title from h1
    const match = markdown.match(/^#\s+(.+)$/m);
    const title = match ? match[1] : file.replace('.md', '');
    const id = `section-${index + 1}`;
    
    navHtml += `
        <a href="#${id}" class="nav-link ${index === 0 ? 'active' : ''}" data-target="${id}">
            <span class="nav-icon">${index + 1}</span>
            <span class="nav-text" style="flex:1;">${title}</span>
        </a>
    `;
    
    contentHtml += `
        <section id="${id}" class="wiki-section ${index === 0 ? 'active' : ''}">
            <div class="wiki-content content-card">
                ${html}
            </div>
        </section>
    `;
});

const template = `<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ITBM - Wiki de Documentação</title>
    <!-- Modern Font: Inter -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            /* Light Theme */
            --bg-body: #f1f5f9;
            --bg-sidebar: #ffffff;
            --bg-card: #ffffff;
            --text-main: #0f172a;
            --text-muted: #475569;
            --accent: #2563eb;
            --accent-hover: #1d4ed8;
            --border: #e2e8f0;
            --sidebar-width: 340px;
            --nav-hover: #f8fafc;
            --nav-active: #eff6ff;
            --nav-active-text: #1d4ed8;
            --nav-active-icon: #3b82f6;
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
            --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05);
            
            /* Typography */
            --font-family: 'Inter', system-ui, -apple-system, sans-serif;
            --radius-md: 12px;
            --radius-lg: 16px;
        }

        [data-theme="dark"] {
            /* Dark Theme with Glassmorphism hints */
            --bg-body: #0b1120;
            --bg-sidebar: #111827;
            --bg-card: #1f2937;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --accent: #3b82f6;
            --accent-hover: #60a5fa;
            --border: rgba(255, 255, 255, 0.1);
            --nav-hover: rgba(255, 255, 255, 0.03);
            --nav-active: rgba(59, 130, 246, 0.1);
            --nav-active-text: #60a5fa;
            --nav-active-icon: #3b82f6;
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.5);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4);
            --shadow-lg: 0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--font-family);
            background-color: var(--bg-body);
            color: var(--text-main);
            display: flex;
            height: 100vh;
            overflow: hidden;
            transition: background-color 0.4s ease, color 0.4s ease;
            -webkit-font-smoothing: antialiased;
        }

        /* Sidebar Styling */
        .sidebar {
            width: var(--sidebar-width);
            background-color: var(--bg-sidebar);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            transition: background-color 0.4s ease, border-color 0.4s ease;
            z-index: 10;
            box-shadow: var(--shadow-md);
        }

        .sidebar-header {
            padding: 28px 24px 24px;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .sidebar-header h2 {
            font-size: 1.25rem;
            font-weight: 800;
            background: linear-gradient(135deg, var(--text-main), var(--text-muted));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.025em;
        }

        .theme-toggle {
            background: var(--nav-hover);
            border: 1px solid var(--border);
            color: var(--text-main);
            cursor: pointer;
            padding: 10px;
            border-radius: 50%;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .theme-toggle:hover {
            transform: scale(1.05) rotate(10deg);
            background-color: var(--border);
        }

        .nav-menu {
            overflow-y: auto;
            padding: 20px 16px;
            flex: 1;
        }

        .nav-menu::-webkit-scrollbar { width: 4px; }
        .nav-menu::-webkit-scrollbar-track { background: transparent; }
        .nav-menu::-webkit-scrollbar-thumb { background-color: var(--border); border-radius: 10px; }

        .nav-link {
            display: flex;
            align-items: center;
            padding: 14px 16px;
            text-decoration: none;
            color: var(--text-muted);
            border-radius: var(--radius-md);
            margin-bottom: 6px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 500;
            font-size: 0.95rem;
            border: 1px solid transparent;
        }

        .nav-link:hover {
            background-color: var(--nav-hover);
            color: var(--text-main);
            transform: translateX(4px);
        }

        .nav-link.active {
            background-color: var(--nav-active);
            color: var(--nav-active-text);
            border-color: rgba(59, 130, 246, 0.2);
            box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.02);
        }

        .nav-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 8px;
            background-color: var(--nav-hover);
            color: var(--text-muted);
            margin-right: 14px;
            font-size: 0.8rem;
            font-weight: 700;
            transition: all 0.4s ease;
        }

        .nav-link.active .nav-icon {
            background-color: var(--nav-active-icon);
            color: #ffffff;
            box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
        }

        /* Main Content Styling */
        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            position: relative;
            scroll-behavior: smooth;
        }

        .wiki-section {
            display: none;
            padding: 40px;
            max-width: 950px;
            margin: 0 auto;
            width: 100%;
        }

        .wiki-section.active {
            display: block;
            animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .content-card {
            background-color: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: 56px;
            box-shadow: var(--shadow-lg);
            transition: background-color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease;
            position: relative;
            overflow: hidden;
        }

        /* Subtle top gradient line on card */
        .content-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, var(--accent), #10b981, var(--accent));
        }

        /* Markdown Rendering Styles */
        .wiki-content h1 {
            font-size: 2.5rem;
            font-weight: 800;
            margin-bottom: 32px;
            color: var(--text-main);
            letter-spacing: -0.03em;
            line-height: 1.2;
        }

        .wiki-content h2 {
            font-size: 1.6rem;
            font-weight: 700;
            margin-top: 48px;
            margin-bottom: 20px;
            color: var(--text-main);
            letter-spacing: -0.02em;
            display: flex;
            align-items: center;
        }

        .wiki-content h2::before {
            content: '';
            display: inline-block;
            width: 8px;
            height: 24px;
            background-color: var(--accent);
            border-radius: 4px;
            margin-right: 12px;
        }

        .wiki-content h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-top: 36px;
            margin-bottom: 14px;
            color: var(--text-main);
        }

        .wiki-content p {
            font-size: 1.05rem;
            line-height: 1.75;
            margin-bottom: 20px;
            color: var(--text-muted);
        }

        .wiki-content ul, .wiki-content ol {
            margin-bottom: 28px;
            padding-left: 24px;
            color: var(--text-muted);
            line-height: 1.75;
            font-size: 1.05rem;
        }

        .wiki-content li { margin-bottom: 10px; }
        .wiki-content li::marker { color: var(--accent); font-weight: bold; }
        .wiki-content strong { color: var(--text-main); font-weight: 600; }

        .wiki-content code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            background-color: var(--nav-hover);
            color: #ef4444; /* Modern red/pink tint for code */
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 0.9em;
            border: 1px solid var(--border);
        }
        
        [data-theme="dark"] .wiki-content code {
            color: #fca5a5;
        }

        .wiki-content hr {
            height: 1px;
            background-color: var(--border);
            border: none;
            margin: 48px 0;
        }

        .wiki-content blockquote {
            position: relative;
            padding: 24px 32px;
            margin: 32px 0;
            background-color: var(--nav-hover);
            border-radius: var(--radius-md);
            border: 1px solid var(--border);
            color: var(--text-main);
            font-style: italic;
        }

        .wiki-content blockquote::after {
            content: '"';
            position: absolute;
            top: 8px;
            left: 12px;
            font-size: 3rem;
            color: var(--accent);
            opacity: 0.2;
            font-family: serif;
        }

        .wiki-content blockquote p:last-child { margin-bottom: 0; }

        /* Mobile Adjustments */
        @media (max-width: 1024px) {
            .wiki-section { padding: 32px; }
            .content-card { padding: 40px; }
        }

        @media (max-width: 768px) {
            body { flex-direction: column; }
            .sidebar {
                width: 100%;
                height: auto;
                max-height: 50vh;
                border-right: none;
                border-bottom: 1px solid var(--border);
            }
            .sidebar-header { padding: 16px 20px; }
            .wiki-section { padding: 16px; }
            .content-card { padding: 24px; }
            .wiki-content h1 { font-size: 2rem; }
            .nav-menu { padding: 10px; }
            .nav-link { padding: 10px 12px; margin-bottom: 4px; }
        }
    </style>
</head>
<body>

    <aside class="sidebar">
        <div class="sidebar-header">
            <h2>ITBM Wiki</h2>
            <button class="theme-toggle" id="theme-toggle" aria-label="Toggle Theme">
                <svg id="moon-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                <svg id="sun-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            </button>
        </div>
        <nav class="nav-menu" id="nav-menu">
            ${navHtml}
        </nav>
    </aside>

    <main class="main-content" id="main-content">
        ${contentHtml}
    </main>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const navLinks = document.querySelectorAll('.nav-link');
            const sections = document.querySelectorAll('.wiki-section');
            const mainContent = document.getElementById('main-content');

            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    navLinks.forEach(l => l.classList.remove('active'));
                    sections.forEach(s => s.classList.remove('active'));
                    
                    link.classList.add('active');
                    
                    const targetId = link.getAttribute('data-target');
                    const targetSection = document.getElementById(targetId);
                    
                    // Trigger reflow for animation restart
                    targetSection.style.animation = 'none';
                    targetSection.offsetHeight;
                    targetSection.style.animation = null;
                    
                    targetSection.classList.add('active');
                    mainContent.scrollTop = 0;
                });
            });

            const themeToggleBtn = document.getElementById('theme-toggle');
            const htmlElement = document.documentElement;
            const sunIcon = document.getElementById('sun-icon');
            const moonIcon = document.getElementById('moon-icon');

            const savedTheme = localStorage.getItem('itbm-wiki-theme') || 'dark';
            htmlElement.setAttribute('data-theme', savedTheme);
            updateIcons(savedTheme);

            themeToggleBtn.addEventListener('click', () => {
                const currentTheme = htmlElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                htmlElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('itbm-wiki-theme', newTheme);
                updateIcons(newTheme);
            });

            function updateIcons(theme) {
                if (theme === 'dark') {
                    sunIcon.style.display = 'block';
                    moonIcon.style.display = 'none';
                } else {
                    sunIcon.style.display = 'none';
                    moonIcon.style.display = 'block';
                }
            }
        });
    </script>
</body>
</html>`;

fs.writeFileSync(outputFile, template);
console.log('HTML Wiki successfully generated at:', outputFile);
