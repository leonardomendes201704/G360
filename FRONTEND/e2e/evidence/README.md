# Evidencias E2E (Playwright)

Pasta para **prints, traces ou exports** ad-hoc ligados a uma tarefa (quando nao basta o snapshot versionado ao lado do spec).

## Convencao

```
FRONTEND/e2e/evidence/<US-xxx|BUG-xxx|slug-descritivo>/
  README.md          (opcional: contexto, data, comando)
  *.png              (screenshots nomeados)
  playwright-report  (opcional: copia ou zip do report HTML)
```

- Preferir IDs de work item no nome da pasta para rastreio.
- Evidencias versionadas em Git: apenas o que fizer sentido para revisao (evitar dados sensiveis).

## Comandos uteis

- Suite com config G360 (porta livre): `npm run test:e2e`
- Spec especifico: `npm run test:e2e -- e2e/config.spec.ts`
- Atualizar baselines visuais: `npm run test:e2e:update-snapshots`

Snapshots oficiais dos specs continuam em `e2e/**/*.spec.ts-snapshots/`.
