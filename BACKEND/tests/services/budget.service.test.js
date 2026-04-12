const BudgetService = require('../../src/services/budget.service');
const BudgetRepository = require('../../src/repositories/budget.repository');
const FiscalYearRepository = require('../../src/repositories/fiscal-year.repository');
const AccountRepository = require('../../src/repositories/account.repository');
const CostCenterRepository = require('../../src/repositories/cost-center.repository');
const SupplierRepository = require('../../src/repositories/supplier.repository');
const AuditLogRepository = require('../../src/repositories/audit-log.repository');
const ExpenseRepository = require('../../src/repositories/expense.repository');
const accessScope = require('../../src/utils/access-scope');
const logger = require('../../src/config/logger');
const xlsx = require('xlsx');

jest.mock('../../src/repositories/budget.repository');
jest.mock('../../src/repositories/fiscal-year.repository');
jest.mock('../../src/repositories/account.repository');
jest.mock('../../src/repositories/cost-center.repository');
jest.mock('../../src/repositories/supplier.repository');
jest.mock('../../src/repositories/audit-log.repository');
jest.mock('../../src/repositories/expense.repository');
jest.mock('../../src/utils/access-scope');
jest.mock('xlsx');
jest.spyOn(logger, 'warn').mockImplementation(() => {});

describe('BudgetService', () => {
    let mockPrisma = {};

    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma = {
            fiscalYear: { findFirst: jest.fn() },
            budget: { findFirst: jest.fn() }
        };
        accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: true, scopes: [] });
        accessScope.getScopedCostCenterIds.mockReturnValue([]);
    });

    describe('create', () => {
        it('should throw if FiscalYear not found', async () => {
            FiscalYearRepository.findById.mockResolvedValue(null);
            await expect(BudgetService.create(mockPrisma, { fiscalYearId: '1' })).rejects.toEqual({
                statusCode: 404, message: 'Ano Fiscal não encontrado.'
            });
        });

        it('should create budget and audit log', async () => {
            FiscalYearRepository.findById.mockResolvedValue({ id: 'fy1' });
            BudgetRepository.create.mockResolvedValue({ id: 'b1' });
            AuditLogRepository.create.mockResolvedValue(true);

            const result = await BudgetService.create(mockPrisma, { fiscalYearId: 'fy1', createdBy: 'u1', name: 'B' });
            expect(BudgetRepository.create).toHaveBeenCalledWith(mockPrisma, expect.objectContaining({ name: 'B', status: 'DRAFT' }));
            expect(AuditLogRepository.create).toHaveBeenCalled();
            expect(result).toEqual({ id: 'b1' });
        });
        
        it('should fallback audit log createdBy to system', async () => {
            FiscalYearRepository.findById.mockResolvedValue({ id: 'fy1' });
            BudgetRepository.create.mockResolvedValue({ id: 'b1' });
            await BudgetService.create(mockPrisma, { fiscalYearId: 'fy1' });
            expect(AuditLogRepository.create).toHaveBeenCalledWith(mockPrisma, expect.objectContaining({ userId: 'system' }));
        });
    });

    describe('getAll', () => {
        it('should return all without user filtering if no userId is provided', async () => {
            BudgetRepository.findAll.mockResolvedValue(['b1']);
            const result = await BudgetService.getAll(mockPrisma);
            expect(result).toEqual(['b1']);
            expect(BudgetRepository.findAll).toHaveBeenCalledWith(mockPrisma, null);
        });

        it('should return all if user is admin', async () => {
            accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: true });
            BudgetRepository.findAll.mockResolvedValue(['b1', 'b2']);
            const result = await BudgetService.getAll(mockPrisma, 'u1');
            expect(BudgetRepository.findAll).toHaveBeenCalledWith(mockPrisma, null);
            expect(result).toHaveLength(2);
        });

        it('should restrict by cost center if not admin', async () => {
            accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: false });
            accessScope.getScopedCostCenterIds.mockReturnValue(['cc1']);
            await BudgetService.getAll(mockPrisma, 'u1');
            expect(BudgetRepository.findAll).toHaveBeenCalledWith(mockPrisma, ['cc1']);
        });
    });

    describe('getById', () => {
        it('should throw if not found', async () => {
            BudgetRepository.findById.mockResolvedValue(null);
            await expect(BudgetService.getById(mockPrisma, '1')).rejects.toEqual({
                statusCode: 404, message: 'Orcamento nao encontrado.'
            });
        });
        
        it('should allow generic access if no userId provided', async () => {
            BudgetRepository.findById.mockResolvedValue({ id: 'b1' });
            const result = await BudgetService.getById(mockPrisma, 'b1');
            expect(result.id).toBe('b1');
        });

        it('should allow access to non-admins if budget has no items', async () => {
            BudgetRepository.findById.mockResolvedValue({ id: '1', items: [] });
            accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: false });
            const res = await BudgetService.getById(mockPrisma, '1', 'u1');
            expect(res.id).toBe('1');
        });

        it('should deny access if non-admin and no items match scoped cost centers and no general items exist', async () => {
            BudgetRepository.findById.mockResolvedValue({
                id: '1',
                items: [{ id: 'i1', costCenterId: 'cc2' }] // user doesn't have cc2
            });
            accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: false });
            accessScope.getScopedCostCenterIds.mockReturnValue(['cc1']);

            await expect(BudgetService.getById(mockPrisma, '1', 'u1')).rejects.toEqual({
                statusCode: 403, message: 'Acesso negado.'
            });
        });

        it('should filter items leaving only matching cc or general items (null cc)', async () => {
            BudgetRepository.findById.mockResolvedValue({
                id: '1',
                items: [
                    { id: 'i1', costCenterId: 'cc1' }, // Matches
                    { id: 'i2', costCenterId: 'cc2' }, // Does not match
                    { id: 'i3', costCenterId: null }   // General
                ]
            });
            accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: false });
            accessScope.getScopedCostCenterIds.mockReturnValue(['cc1']);

            const res = await BudgetService.getById(mockPrisma, '1', 'u1');
            expect(res.items).toHaveLength(2);
            expect(res.items.map(i => i.id)).toEqual(['i1', 'i3']);
        });
        
        it('should block if user has NO mapped Ccs and budget has only specific items', async () => {
            BudgetRepository.findById.mockResolvedValue({
                id: '1', items: [{ id: 'i1', costCenterId: 'cc2' }]
            });
            accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: false });
            accessScope.getScopedCostCenterIds.mockReturnValue([]);
            await expect(BudgetService.getById(mockPrisma, '1', 'u1')).rejects.toEqual({
                statusCode: 403, message: 'Acesso negado.'
            });
        });
    });

    describe('update', () => {
        beforeEach(() => {
            jest.spyOn(BudgetService, 'getById').mockImplementation(async (p, id) => {
                if (id === 'approved') return { id, status: 'APPROVED' };
                return { id, status: 'DRAFT' };
            });
        });
        afterEach(() => { BudgetService.getById.mockRestore(); });

        it('should block updating an approved budget', async () => {
             await expect(BudgetService.update(mockPrisma, 'approved', {})).rejects.toEqual({
                 statusCode: 400, message: expect.stringContaining('APROVADO')
             });
        });

        it('should clean payload, reconnect fiscalYear, and update', async () => {
            BudgetRepository.update.mockResolvedValue({ id: 'draft', name: 'New' });
            await BudgetService.update(mockPrisma, 'draft', {
                 userId: 'u1', items: [], scenarios: [], fiscalYearId: 'fy2', name: 'New'
            });

            expect(BudgetRepository.update).toHaveBeenCalledWith(mockPrisma, 'draft', expect.objectContaining({
                name: 'New', fiscalYear: { connect: { id: 'fy2' } }
            }));
            expect(AuditLogRepository.create).toHaveBeenCalled();
        });
        
        it('should fallback audit log to system if user null', async () => {
            BudgetRepository.update.mockResolvedValue({ id: 'draft' });
            await BudgetService.update(mockPrisma, 'draft', { name: 'X' });
            expect(AuditLogRepository.create).toHaveBeenCalledWith(mockPrisma, expect.objectContaining({ userId: 'system' }));
        });
    });

    describe('delete', () => {
        beforeEach(() => {
            jest.spyOn(BudgetService, 'getById').mockImplementation(async (p, id) => {
                if (id === 'approved') return { id, status: 'APPROVED' };
                return { id, status: 'DRAFT' };
            });
        });
        afterEach(() => { BudgetService.getById.mockRestore(); });

        it('should block deleting approved', async () => {
             await expect(BudgetService.delete(mockPrisma, 'approved')).rejects.toEqual({
                 statusCode: 400, message: expect.stringContaining('APROVADO')
             });
        });

        it('should delete draft', async () => {
            BudgetRepository.delete.mockResolvedValue(true);
            await BudgetService.delete(mockPrisma, 'draft');
            expect(BudgetRepository.delete).toHaveBeenCalledWith(mockPrisma, 'draft');
        });
    });

    describe('approve', () => {
        beforeEach(() => {
            jest.spyOn(BudgetService, 'getById').mockResolvedValue({ id: '1' });
        });
        afterEach(() => { BudgetService.getById.mockRestore(); });

        it('should throw if budget not found in Repo', async () => {
             BudgetRepository.findById.mockResolvedValue(null);
             await expect(BudgetService.approve(mockPrisma, '1', 'u1')).rejects.toEqual({
                 statusCode: 404, message: 'Orçamento não encontrado.'
             });
        });

        it('should throw if fiscalYear invalid', async () => {
             BudgetRepository.findById.mockResolvedValue({ id: '1', fiscalYearId: 'fy1' });
             FiscalYearRepository.findById.mockResolvedValue(null);
             await expect(BudgetService.approve(mockPrisma, '1', 'u1')).rejects.toEqual({
                 statusCode: 400, message: 'Ano Fiscal inválido.'
             });
        });

        it('should approve budget and generate expenses exactly equal to populated months', async () => {
             BudgetRepository.findById.mockResolvedValue({
                 id: '1', fiscalYearId: 'fy1',
                 items: [
                     { accountId: 'a1', type: 'OPERATIONAL', jan: 100, feb: 0, mar: 50, dec: 99, account: { name: 'Acct 1' } }, // 3 expenses created
                     { accountId: 'a2', type: 'CAPITAL', jan: 200, account: { name: 'Acct 2' } } // 1 expense created (CAPITAL fallbacks to OPEX)
                 ]
             });
             FiscalYearRepository.findById.mockResolvedValue({ id: 'fy1', year: 2024 });

             await BudgetService.approve(mockPrisma, '1', 'u1');

             expect(BudgetRepository.update).toHaveBeenCalledWith(mockPrisma, '1', expect.objectContaining({ status: 'APPROVED' }));
             // 3 expenses + 1 expense = 4 created expenses
             expect(ExpenseRepository.create).toHaveBeenCalledTimes(4);
             
             // Inspect one of the expense calls
             const firstExpenseData = ExpenseRepository.create.mock.calls[0][1];
             expect(firstExpenseData.amount).toBe(100);
             expect(firstExpenseData.type).toBe('OPEX');
             expect(firstExpenseData.date).toEqual(new Date(2024, 0, 1)); // jan 2024
             expect(AuditLogRepository.create).toHaveBeenCalled();
        });
        
        it('should map CAPEX explicitly', async () => {
             BudgetRepository.findById.mockResolvedValue({
                 id: '1', fiscalYearId: 'fy1',
                 items: [ { accountId: 'a2', type: 'CAPEX', jan: 200, account: { name: 'Acct 2' } } ]
             });
             FiscalYearRepository.findById.mockResolvedValue({ id: 'fy1', year: 2024 });
             await BudgetService.approve(mockPrisma, '1', 'u1');
             const data = ExpenseRepository.create.mock.calls[ExpenseRepository.create.mock.calls.length - 1][1];
             expect(data.type).toBe('CAPEX');
        });
    });

    describe('duplicate', () => {
        it('should copy budget headers and all items resetting to draft', async () => {
            BudgetRepository.findById.mockResolvedValue({
                 id: 'old', fiscalYearId: 'fy1', type: 'A', description: 'Desc', isOBZ: false,
                 items: [{ accountId: 'a1', jan: 10 }]
            });
            BudgetRepository.create.mockResolvedValue({ id: 'new' });

            const result = await BudgetService.duplicate(mockPrisma, 'old', 'Copy Header', 'u1');

            expect(BudgetRepository.create).toHaveBeenCalledWith(mockPrisma, expect.objectContaining({
                 name: 'Copy Header', description: 'Desc (Cópia)', status: 'DRAFT', totalOpex: 0
            }));
            expect(BudgetRepository.createManyItems).toHaveBeenCalledWith(mockPrisma, expect.arrayContaining([
                 expect.objectContaining({ budgetId: 'new', jan: 10, isNewExpense: true })
            ]));
            expect(BudgetRepository.calculateTotals).toHaveBeenCalledWith(mockPrisma, 'new');
            expect(result.id).toBe('new');
        });

        it('should fail if original does not exist', async () => {
            BudgetRepository.findById.mockResolvedValue(null);
            await expect(BudgetService.duplicate(mockPrisma, 'old')).rejects.toBeDefined();
        });
        
        it('should handle budgets without items seamlessly', async () => {
             BudgetRepository.findById.mockResolvedValue({ id: 'old', items: null });
             BudgetRepository.create.mockResolvedValue({ id: 'new' });
             await BudgetService.duplicate(mockPrisma, 'old', 'Header');
             expect(BudgetRepository.createManyItems).not.toHaveBeenCalled();
        });
    });

    describe('addItem', () => {
        beforeEach(() => {
            jest.spyOn(BudgetService, 'getById').mockImplementation(async (p, id) => {
                if (id === 'approved') return { id, status: 'APPROVED' };
                return { id, status: 'DRAFT', fiscalYearId: 'fy_current' };
            });
        });
        afterEach(() => { BudgetService.getById.mockRestore(); });

        it('should check if approved', async () => {
            await expect(BudgetService.addItem(mockPrisma, 'approved', {})).rejects.toEqual({
                 statusCode: 400, message: expect.stringContaining('APROVADO')
            });
        });

        it('should validate account, costCenter, supplier mappings', async () => {
            AccountRepository.findById.mockResolvedValue(null);
            await expect(BudgetService.addItem(mockPrisma, 'draft', { accountId: 'a1' })).rejects.toEqual({ statusCode: 404, message: 'Conta Contábil não encontrada.' });

            AccountRepository.findById.mockResolvedValue({ id: 'a1', type: 'OPEX' });
            CostCenterRepository.findById.mockResolvedValue(null);
            await expect(BudgetService.addItem(mockPrisma, 'draft', { accountId: 'a1', costCenterId: 'cc1' })).rejects.toEqual({ statusCode: 404, message: 'Centro de Custo não encontrado.' });
            
            CostCenterRepository.findById.mockResolvedValue({ id: 'cc1' });
            SupplierRepository.findById.mockResolvedValue(null);
            await expect(BudgetService.addItem(mockPrisma, 'draft', { accountId: 'a1', costCenterId: 'cc1', supplierId: 's1' })).rejects.toEqual({ statusCode: 404, message: 'Fornecedor não encontrado.' });
        });

        it('should block scoped non-admin if accessing unrelated cost center', async () => {
             AccountRepository.findById.mockResolvedValue({ id: 'a1' });
             CostCenterRepository.findById.mockResolvedValue({ id: 'cc2' });
             accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: false });
             accessScope.getScopedCostCenterIds.mockReturnValue(['cc99']); // Doesn't have cc2

             await expect(BudgetService.addItem(mockPrisma, 'draft', { accountId: 'a1', costCenterId: 'cc2' }, 'u1')).rejects.toEqual({
                 statusCode: 403, message: expect.stringContaining('só pode lançar')
             });
             
             await expect(BudgetService.addItem(mockPrisma, 'draft', { accountId: 'a1' }, 'u1')).rejects.toEqual({
                 statusCode: 400, message: expect.stringContaining('obrigatório')
             });
        });

        it('should calculate OBZ variance vs previous year if available', async () => {
             AccountRepository.findById.mockResolvedValue({ id: 'a1', type: 'OPEX' });
             CostCenterRepository.findById.mockResolvedValue({ id: 'cc1' });
             accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: true });
             
             FiscalYearRepository.findById.mockResolvedValue({ id: 'fy_current', year: 2025 });
             mockPrisma.fiscalYear.findFirst.mockResolvedValue({ id: 'fy_prev' });
             mockPrisma.budget.findFirst.mockResolvedValue({
                 items: [
                     { accountId: 'a1', costCenterId: 'cc1', supplierId: undefined, total: 200 } // prev year value = 200
                 ]
             });

             await BudgetService.addItem(mockPrisma, 'draft', { accountId: 'a1', costCenterId: 'cc1', jan: 250, feb: 50 }, 'u1');

             // Total new = 300 vs Prev = 200. Variance = 50%
             expect(BudgetRepository.createItem).toHaveBeenCalledWith(mockPrisma, expect.objectContaining({
                 type: 'OPEX', total: 300, isNewExpense: false, previousYearValue: 200, variancePercent: 50
             }));
             expect(BudgetRepository.calculateTotals).toHaveBeenCalledWith(mockPrisma, 'draft');
        });
        
        it('should handle OBZ logger warning gracefully', async () => {
             AccountRepository.findById.mockResolvedValue({ id: 'a', type: 'OPEX' });
             FiscalYearRepository.findById.mockRejectedValue(new Error('fail async'));
             
             await BudgetService.addItem(mockPrisma, 'draft', { accountId: 'a', jan: 100 }, 'u1');
             expect(logger.warn).toHaveBeenCalledWith('Erro ao buscar valor do ano anterior:', 'fail async');
        });
    });

    describe('updateItem & deleteItem', () => {
        beforeEach(() => {
            jest.spyOn(BudgetService, 'getById').mockImplementation(async (p, id) => {
                if (id === 'approved') return { id, status: 'APPROVED' };
                return { id, status: 'DRAFT' };
            });
        });
        afterEach(() => { BudgetService.getById.mockRestore(); });

        describe('updateItem', () => {
            it('should throw if item not found', async () => {
                BudgetRepository.findItemById.mockResolvedValue(null);
                await expect(BudgetService.updateItem(mockPrisma, 'i1', {})).rejects.toEqual({ statusCode: 404, message: 'Item não encontrado.' });
            });

            it('should block if budget approved', async () => {
                BudgetRepository.findItemById.mockResolvedValue({ id: 'i1', budgetId: 'approved' });
                await expect(BudgetService.updateItem(mockPrisma, 'i1', {})).rejects.toEqual({ statusCode: 400, message: expect.stringContaining('APROVADO') });
            });

            it('should calculate new totals merging item data', async () => {
                BudgetRepository.findItemById.mockResolvedValue({ id: 'i1', budgetId: 'draft', jan: 10, feb: 20 });
                BudgetRepository.updateItem.mockResolvedValue(true);

                await BudgetService.updateItem(mockPrisma, 'i1', { feb: 30, mar: 10 }, 'u1');

                // Jan: 10 (old), Feb: 30 (new), Mar: 10 (new) -> Total = 50
                expect(BudgetRepository.updateItem).toHaveBeenCalledWith(mockPrisma, 'i1', expect.objectContaining({
                    feb: 30, mar: 10, total: 50
                }));
                expect(BudgetRepository.calculateTotals).toHaveBeenCalledWith(mockPrisma, 'draft');
            });
        });

        describe('deleteItem', () => {
            it('should check requirements and delete', async () => {
                BudgetRepository.findItemById.mockResolvedValue({ id: 'i1', budgetId: 'draft' });
                await BudgetService.deleteItem(mockPrisma, 'i1', 'u1');
                expect(BudgetRepository.deleteItem).toHaveBeenCalled();
            });
            it('should block if approved', async () => {
                BudgetRepository.findItemById.mockResolvedValue({ id: 'i1', budgetId: 'approved' });
                await expect(BudgetService.deleteItem(mockPrisma, 'i1', 'u1')).rejects.toBeDefined();
            });
            it('should block if not found', async () => {
                BudgetRepository.findItemById.mockResolvedValue(null);
                await expect(BudgetService.deleteItem(mockPrisma, 'i1', 'u1')).rejects.toBeDefined();
            });
        });
    });

    describe('importItems', () => {
        beforeEach(() => {
            jest.spyOn(BudgetService, 'getById').mockImplementation(async (p, id) => {
                if (id === 'approved') return { id, status: 'APPROVED' };
                return { id, status: 'DRAFT' };
            });
        });
        afterEach(() => { BudgetService.getById.mockRestore(); });

        it('should reject if budget approved', async () => {
            await expect(BudgetService.importItems(mockPrisma, 'approved', Buffer.from(''))).rejects.toBeDefined();
        });

        it('should throw if rows empty', async () => {
             const wb = { SheetNames: ['Sh1'], Sheets: { Sh1: {} } };
             xlsx.read.mockReturnValue(wb);
             xlsx.utils.sheet_to_json.mockReturnValue([]);
             
             await expect(BudgetService.importItems(mockPrisma, 'draft', null)).rejects.toEqual({
                 statusCode: 400, message: expect.stringContaining('vazio ou inválido')
             });
        });

        it('should map, validate Accounts and CostCenters and compute Excel numeric logic', async () => {
             const wb = { SheetNames: ['Sh1'], Sheets: { Sh1: {} } };
             xlsx.read.mockReturnValue(wb);
             xlsx.utils.sheet_to_json.mockReturnValue([
                 { Conta: 'A001', CC: 'CC001', Jan: 'R$ 1.000,50', Feb: 200, Mar: '' },
                 { Conta: 'A002', Jan: 0 } // No CC
             ]);

             AccountRepository.findAll.mockResolvedValue([
                 { id: 'acc1', code: 'A001', type: 'OPEX' },
                 { id: 'acc2', code: 'A002', type: 'CAPEX' }
             ]);
             CostCenterRepository.findAll.mockResolvedValue([{ id: 'ccId', code: 'CC001' }]);
             accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: true });
             accessScope.getScopedCostCenterIds.mockReturnValue(null); // All access

             const result = await BudgetService.importItems(mockPrisma, 'draft', null);

             expect(result.importedCount).toBe(2);
             // Verify the first item amounts
             const callArg = BudgetRepository.createManyItems.mock.calls[0][1];
             expect(callArg[0].accountId).toBe('acc1');
             expect(callArg[0].costCenterId).toBe('ccId');
             expect(callArg[0].jan).toBe(1000.5); // parsed from R$ 1.000,50
             expect(callArg[0].feb).toBe(200);
             expect(callArg[0].total).toBe(1200.5);

             expect(callArg[1].accountId).toBe('acc2');
             expect(callArg[1].costCenterId).toBeNull(); // it mapped to null appropriately
        });

        it('should throw errors arrays if validation fails', async () => {
            const wb = { SheetNames: ['Sh1'], Sheets: { Sh1: {} } };
             xlsx.read.mockReturnValue(wb);
             xlsx.utils.sheet_to_json.mockReturnValue([
                 { Conta: '', Jan: 100 }, // Missing account
                 { Conta: 'A009', Jan: 100 }, // Missing in DB
                 { Conta: 'A001', CC: 'CC999', Jan: 100 }, // Missing CC in DB
                 { Conta: 'A001', CC: 'CC001', Jan: 100 } // User unauthorized
             ]);

             AccountRepository.findAll.mockResolvedValue([{ id: 'acc1', code: 'A001' }]);
             CostCenterRepository.findAll.mockResolvedValue([{ id: 'ccId', code: 'CC001' }]);
             
             // Restrict to something else where user DOES NOT have CC001
             accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: false });
             accessScope.getScopedCostCenterIds.mockReturnValue(['other_cc']);

             let thrownError;
             try {
                 await BudgetService.importItems(mockPrisma, 'draft', null);
             } catch(e) { thrownError = e; }
             
             expect(thrownError.errors).toHaveLength(4);
             expect(thrownError.errors[0]).toContain("Coluna 'Conta' não informada");
             expect(thrownError.errors[1]).toContain("não encontrada no sistema");
             expect(thrownError.errors[2]).toContain("Centro de Custo 'CC999' não encontrado");
             expect(thrownError.errors[3]).toContain("VOCÊ NÃO TEM PERMISSÃO para lançar");
        });
    });
});
