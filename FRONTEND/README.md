# G360 — Frontend (React + Vite)

## E2E e auditoria de consola

- **Suite habitual:** `npm run test:e2e` (Playwright, `playwright.g360.config.ts`, Vite tipicamente na porta **5176**).
- **Auditoria de consola com browser visível:** `npm run test:e2e:console-headed` — imprime no terminal cada passo (`[console-smoke] 1/N → /rota`). Para saída Playwright mais explícita: `npm run test:e2e:console-headed:line` (`--reporter=line`). Timeout **20 min**; `PLAYWRIGHT_HEADED_SLOW_MO=80` opcional. Falha se houver `console.error` ou `pageerror`.

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
