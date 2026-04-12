const EmailTemplateService = require('../../src/services/email-template.service');

describe('EmailTemplateService', () => {
    describe('getTaskAssignmentTemplate', () => {
        it('should generate HTML with task details (HIGH)', () => {
            const html = EmailTemplateService.getTaskAssignmentTemplate('User', 'Task 1', 'HIGH', 100);
            expect(html).toContain('Task 1');
            expect(html).toContain('HIGH');
            expect(html).toContain('User');
        });
        it('should generate HTML with task details (CRITICAL)', () => {
            const html = EmailTemplateService.getTaskAssignmentTemplate('User', 'Task 2', 'CRITICAL', 100);
            expect(html).toContain('CRITICAL');
        });
        it('should generate HTML with task details (MEDIUM)', () => {
            const html = EmailTemplateService.getTaskAssignmentTemplate('User', 'Task 3', 'MEDIUM', 100);
            expect(html).toContain('MEDIUM');
        });
        it('should generate HTML with task details (LOW)', () => {
            const html = EmailTemplateService.getTaskAssignmentTemplate('User', 'Task 4', 'LOW', 100);
            expect(html).toContain('LOW');
        });
    });

    describe('getProjectAssignmentTemplate', () => {
        it('should generate HTML with project details and role (TECH_LEAD)', () => {
            const html = EmailTemplateService.getProjectAssignmentTemplate('User', 'Project X', 1, 'TECH_LEAD');
            expect(html).toContain('Project X');
            expect(html).toContain('Tech Lead');
        });
        it('should generate HTML with project details and role (MANAGER)', () => {
            const html = EmailTemplateService.getProjectAssignmentTemplate('User', 'Project X', 1, 'MANAGER');
            expect(html).toContain('Gerente');
        });
    });

    describe('getLicenseExpiryTemplate', () => {
        it('should generate HTML list of licenses', () => {
            const licenses = [
                { name: 'Office', expirationDate: '2024-01-01' },
                { name: 'Windows', expirationDate: '2024-01-02' }
            ];
            const html = EmailTemplateService.getLicenseExpiryTemplate('User', 2, licenses);
            expect(html).toContain('Office');
            expect(html).toContain('Windows');
        });
        it('should show truncated message if more than 10 licenses', () => {
            const licenses = Array(11).fill({ name: 'L', expirationDate: '2024-01-01' });
            const html = EmailTemplateService.getLicenseExpiryTemplate('User', 11, licenses);
            expect(html).toContain('e outras');
        });
    });

    describe('getTaskCompletionTemplate', () => {
        it('should generate HTML for completed task', () => {
            const html = EmailTemplateService.getTaskCompletionTemplate('User', 'Completed Task', 99);
            expect(html).toContain('Completed Task');
            expect(html).toContain('User');
        });
    });

    describe('getGmudApprovalTemplate', () => {
        it('should generate HTML for GMUD approval', () => {
            const gmud = { code: 'GMUD-001', title: 'Deploy v2', scheduledStart: '2025-01-15T12:00:00Z', riskLevel: 'CRITICO' };
            const html = EmailTemplateService.getGmudApprovalTemplate('User', gmud);
            expect(html).toContain('GMUD-001');
            expect(html).toContain('Deploy v2');
            expect(html).toContain('CRITICO');
        });
        it('should generate HTML with non-critical risk', () => {
            const gmud = { code: 'GMUD-002', title: 'Deploy v2', scheduledStart: '2025-01-15T12:00:00Z', riskLevel: 'BAIXO' };
            const html = EmailTemplateService.getGmudApprovalTemplate('User', gmud);
            expect(html).toContain('BAIXO');
        });
    });

    describe('getContractExpiryTemplate', () => {
        it('should generate HTML for contract expiry', () => {
            const html = EmailTemplateService.getContractExpiryTemplate('User', 'CNT-001', '2025-03-01');
            expect(html).toContain('CNT-001');
            expect(html).toContain('User');
        });
    });

    describe('getProjectUpdateTemplate', () => {
        it('should generate HTML for project update', () => {
            const changes = [{ field: 'status', oldValue: 'PLANNING', newValue: 'IN_PROGRESS' }];
            const html = EmailTemplateService.getProjectUpdateTemplate('User', 'Project X', 1, JSON.stringify(changes));
            expect(html).toContain('Project X');
            expect(html).toContain('User');
        });
    });

    describe('getProjectApprovalOutcomeTemplate', () => {
        it('should generate HTML for approved project with reason', () => {
            const html = EmailTemplateService.getProjectApprovalOutcomeTemplate('User', 'Project X', 1, 'APPROVED', 'Looks good');
            expect(html).toContain('Project X');
            expect(html).toContain('Aprovado! 🚀');
            expect(html).toContain('Looks good');
        });

        it('should generate HTML for rejected project without reason', () => {
            const html = EmailTemplateService.getProjectApprovalOutcomeTemplate('User', 'Project Y', 2, 'REJECTED', null);
            expect(html).toContain('Project Y');
            expect(html).toContain('Não Aprovado 🛑');
        });
    });

    describe('getGmudConclusionTemplate', () => {
        it('should generate HTML for GMUD conclusion success', () => {
            const html = EmailTemplateService.getGmudConclusionTemplate('User', 'GMUD-001', 'Deploy v2', 'EXECUTED', 'All good');
            expect(html).toContain('GMUD-001');
            expect(html).toContain('Sucesso');
            expect(html).toContain('All good');
        });

        it('should generate HTML for GMUD conclusion failure without notes', () => {
            const html = EmailTemplateService.getGmudConclusionTemplate('User', 'GMUD-002', 'Rollback', 'FAILED', null);
            expect(html).toContain('GMUD-002');
            expect(html).toContain('Falhou / Cancelada');
        });
    });

    describe('getIncidentCreatedTemplate', () => {
        it('should generate HTML for incident created', () => {
            const html = EmailTemplateService.getIncidentCreatedTemplate('User', { code: 'INC-1', title: 'T', priority: 'HIGH', id: '1' });
            expect(html).toContain('INC-1');
            expect(html).toContain('HIGH');
        });
    });

    describe('getIncidentResolvedTemplate', () => {
        it('should generate HTML for incident resolved', () => {
            const html = EmailTemplateService.getIncidentResolvedTemplate('User', { code: 'INC-1', id: '1' }, 'Solution');
            expect(html).toContain('INC-1');
            expect(html).toContain('Solution');
        });
    });

    describe('getNewCommentTemplate', () => {
        it('should generate HTML for new comment', () => {
            const html = EmailTemplateService.getNewCommentTemplate('User', 'Module', 'Entity', 'Author', 'Hello', '/link');
            expect(html).toContain('Author');
            expect(html).toContain('Hello');
            expect(html).toContain('Entity');
        });
    });

    describe('getContractActionTemplate', () => {
        it('should generate HTML for contract action', () => {
            const html = EmailTemplateService.getContractActionTemplate('User', 'CNT-1', 'Supplier', 'RENEWAL', 'Info');
            expect(html).toContain('CNT-1');
            expect(html).toContain('RENEWAL');
            expect(html).toContain('Info');
        });
    });

    describe('getExpenseCreatedTemplate', () => {
        it('should generate HTML for expense created with supplier', () => {
            const html = EmailTemplateService.getExpenseCreatedTemplate('User', 100, 'Supplier', 'Desc', '/link');
            expect(html).toContain('100');
            expect(html).toContain('Supplier');
            expect(html).toContain('Desc');
        });
        it('should generate HTML for expense created without supplier', () => {
            const html = EmailTemplateService.getExpenseCreatedTemplate('User', 100, null, 'Desc', '/link');
            expect(html).toContain('100');
            expect(html).toContain('N/A');
        });
    });

    describe('getBudgetOverflowTemplate', () => {
        it('should generate HTML for budget overflow', () => {
            const html = EmailTemplateService.getBudgetOverflowTemplate('User', 'IT Dept', 1500, 1000, 500);
            expect(html).toContain('IT Dept');
            expect(html).toContain('1500');
            expect(html).toContain('1000');
            expect(html).toContain('500');
        });
    });

    describe('getTicketUpdateTemplate', () => {
        it('should generate HTML for ticket update (RESOLVED)', () => {
            const html = EmailTemplateService.getTicketUpdateTemplate('User', 'HD-1', 'Title', 'RESOLVED', '/link');
            expect(html).toContain('HD-1');
            expect(html).toContain('RESOLVED');
        });
        it('should generate HTML for ticket update (CLOSED)', () => {
            const html = EmailTemplateService.getTicketUpdateTemplate('User', 'HD-1', 'Title', 'CLOSED', '/link');
            expect(html).toContain('CLOSED');
        });
        it('should generate HTML for ticket update (IN_PROGRESS)', () => {
            const html = EmailTemplateService.getTicketUpdateTemplate('User', 'HD-1', 'Title', 'IN_PROGRESS', '/link');
            expect(html).toContain('IN_PROGRESS');
        });
        it('should generate HTML for ticket update (OPEN)', () => {
            const html = EmailTemplateService.getTicketUpdateTemplate('User', 'HD-1', 'Title', 'OPEN', '/link');
            expect(html).toContain('OPEN');
        });
    });

    describe('getWrapper', () => {
        it('should wrap content in base template', () => {
            const html = EmailTemplateService.getWrapper('Title', '<p>Content</p>');
            expect(html).toContain('Title');
            expect(html).toContain('<p>Content</p>');
        });
    });
});
