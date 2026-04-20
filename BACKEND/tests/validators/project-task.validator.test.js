const {
    createProjectTaskSchema,
    updateProjectTaskSchema,
    updateProjectTaskStatusOnlySchema,
    normalizeStatusForApi,
} = require('../../src/validators/project-task.validator');
const { sanitize } = require('../../src/middlewares/sanitize.middleware');

const uuid = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const validData = {
    projectId: uuid,
    title: 'Implement login page',
};

describe('ProjectTask Validators', () => {
    describe('createProjectTaskSchema', () => {
        it('should pass with valid data', async () => {
            const result = await createProjectTaskSchema.validate(validData);
            expect(result.title).toBe('Implement login page');
            expect(result.priority).toBe('MEDIUM'); // default
            expect(result.status).toBe('TODO'); // default
            expect(result.progress).toBe(0); // default
            expect(result.dependencies).toEqual([]); // default
        });

        it('should reject missing projectId', async () => {
            await expect(createProjectTaskSchema.validate({ title: 'Test' }))
                .rejects.toThrow('ID do projeto é obrigatório');
        });

        it('should reject invalid projectId', async () => {
            await expect(createProjectTaskSchema.validate({ ...validData, projectId: 'bad' }))
                .rejects.toThrow('ID do projeto inválido');
        });

        it('should reject missing title', async () => {
            await expect(createProjectTaskSchema.validate({ projectId: uuid }))
                .rejects.toThrow('Título é obrigatório');
        });

        it('should reject invalid priority', async () => {
            await expect(createProjectTaskSchema.validate({ ...validData, priority: 'INVALID' }))
                .rejects.toThrow('Prioridade inválida');
        });

        it('should reject invalid status', async () => {
            await expect(createProjectTaskSchema.validate({ ...validData, status: 'INVALID' }))
                .rejects.toThrow('Status inválido');
        });

        it('should reject progress > 100', async () => {
            await expect(createProjectTaskSchema.validate({ ...validData, progress: 150 }))
                .rejects.toThrow();
        });

        it('should reject progress < 0', async () => {
            await expect(createProjectTaskSchema.validate({ ...validData, progress: -10 }))
                .rejects.toThrow();
        });

        it('should accept ON_HOLD status (Kanban project tasks)', async () => {
            const result = await createProjectTaskSchema.validate({ ...validData, status: 'ON_HOLD' });
            expect(result.status).toBe('ON_HOLD');
        });

        it('should accept storyPoints as integer', async () => {
            const result = await createProjectTaskSchema.validate({ ...validData, storyPoints: 5 });
            expect(result.storyPoints).toBe(5);
        });

        it('should reject non-integer storyPoints', async () => {
            await expect(createProjectTaskSchema.validate({ ...validData, storyPoints: 2.5 }))
                .rejects.toThrow('Story points deve ser inteiro');
        });
    });

    describe('updateProjectTaskSchema', () => {
        it('should pass with partial data', async () => {
            const result = await updateProjectTaskSchema.validate({ title: 'Updated task' });
            expect(result.title).toBe('Updated task');
        });

        it('should accept Kanban statuses (TODO, ON_HOLD, IN_PROGRESS, DONE)', async () => {
            for (const status of ['TODO', 'ON_HOLD', 'IN_PROGRESS', 'DONE']) {
                // eslint-disable-next-line no-await-in-loop
                const r = await updateProjectTaskSchema.validate(
                    { status },
                    { stripUnknown: true },
                );
                expect(r.status).toBe(status);
            }
        });

        it('should normalize alias "IN" to IN_PROGRESS (Kanban drag / legacy)', async () => {
            const r = await updateProjectTaskSchema.validate(
                { status: 'IN' },
                { stripUnknown: true },
            );
            expect(r.status).toBe('IN_PROGRESS');
        });

        it('should accept IN_PROGRESS with trailing zero-width space (ZWSP) after normalize', async () => {
            const dirty = 'IN_PROGRESS\u200b';
            const r = await updateProjectTaskSchema.validate(
                { status: dirty },
                { stripUnknown: true },
            );
            expect(r.status).toBe('IN_PROGRESS');
        });

        it('should reject unknown status on update', async () => {
            await expect(
                updateProjectTaskSchema.validate({ status: 'NOT_A_STATUS' }, { stripUnknown: true }),
            ).rejects.toThrow('Status inválido');
        });

        it('updateProjectTaskStatusOnlySchema: aceita TODO e rejeita corpo vazio / status inválido', async () => {
            const ok = await updateProjectTaskStatusOnlySchema.validate(
                { status: 'IN_PROGRESS' },
                { stripUnknown: true, abortEarly: false },
            );
            expect(ok.status).toBe('IN_PROGRESS');
            // NFKC: subscrito "fullwidth" (comum com IME) → ON_HOLD (evita 422 no Kanban)
            const onHoldNfkc = await updateProjectTaskStatusOnlySchema.validate(
                { status: 'ON＿HOLD' },
                { stripUnknown: true },
            );
            expect(onHoldNfkc.status).toBe('ON_HOLD');
            await expect(
                updateProjectTaskStatusOnlySchema.validate({}, { stripUnknown: true }),
            ).rejects.toThrow('Status é obrigatório');
            await expect(
                updateProjectTaskStatusOnlySchema.validate({ status: 'NOPE' }, { stripUnknown: true }),
            ).rejects.toThrow('Status inválido');
        });

        it('pipeline: sanitize + pré-normalize da rota (simula app.js + validateProjectTaskUpdate) aceita fullwidth', async () => {
            const req = { body: { status: 'ON＿HOLD' } };
            await new Promise((resolve) => {
                sanitize()(req, {}, resolve);
            });
            req.body = { status: normalizeStatusForApi(String(req.body.status)) };
            const r = await updateProjectTaskStatusOnlySchema.validate(req.body, { stripUnknown: true });
            expect(r.status).toBe('ON_HOLD');
        });

        it('should accept re-submit of task API shape with null/empty (evita 422 no Kanban/merge)', async () => {
            const r = await updateProjectTaskSchema.validate(
                {
                    status: 'DONE',
                    progress: null,
                    checklist: null,
                    startDate: '',
                    assigneeId: '',
                    storyPoints: null,
                    dependencies: null,
                },
                { stripUnknown: true },
            );
            expect(r.status).toBe('DONE');
            expect(r.assigneeId).toBeNull();
            expect(r).not.toHaveProperty('progress');
            expect(r).not.toHaveProperty('dependencies');
        });
    });
});
