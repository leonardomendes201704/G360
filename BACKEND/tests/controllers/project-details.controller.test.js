// ProjectDetailsController is a facade that re-exports sub-controllers
const ProjectDetailsController = require('../../src/controllers/project-details.controller');

// Mock the sub-controllers
jest.mock('../../src/controllers/project/project-risk.controller', () => ({
    getRisks: jest.fn().mockResolvedValue(),
    createRisk: jest.fn().mockResolvedValue(),
    updateRisk: jest.fn().mockResolvedValue(),
    deleteRisk: jest.fn().mockResolvedValue()
}));
jest.mock('../../src/controllers/project/project-minute.controller', () => ({
    getMinutes: jest.fn().mockResolvedValue(),
    uploadMinute: jest.fn().mockResolvedValue(),
    updateMinute: jest.fn().mockResolvedValue(),
    deleteMinute: jest.fn().mockResolvedValue(),
    submitMinute: jest.fn().mockResolvedValue(),
    approveMinute: jest.fn().mockResolvedValue(),
    rejectMinute: jest.fn().mockResolvedValue()
}));
jest.mock('../../src/controllers/project/project-proposal.controller', () => ({
    getProposals: jest.fn().mockResolvedValue(),
    createProposal: jest.fn().mockResolvedValue(),
    updateProposal: jest.fn().mockResolvedValue(),
    deleteProposal: jest.fn().mockResolvedValue(),
    submitProposal: jest.fn().mockResolvedValue(),
    setPaymentCondition: jest.fn().mockResolvedValue(),
    generateCostsFromProposal: jest.fn().mockResolvedValue()
}));
jest.mock('../../src/controllers/project/project-cost.controller', () => ({
    getCosts: jest.fn().mockResolvedValue(),
    createCost: jest.fn().mockResolvedValue(),
    updateCost: jest.fn().mockResolvedValue(),
    deleteCost: jest.fn().mockResolvedValue(),
    submitCostForApproval: jest.fn().mockResolvedValue(),
    approveCost: jest.fn().mockResolvedValue(),
    rejectCost: jest.fn().mockResolvedValue()
}));
jest.mock('../../src/controllers/project/project-followup.controller', () => ({
    getFollowUps: jest.fn().mockResolvedValue(),
    createFollowUp: jest.fn().mockResolvedValue(),
    updateFollowUp: jest.fn().mockResolvedValue(),
    deleteFollowUp: jest.fn().mockResolvedValue(),
    completeFollowUp: jest.fn().mockResolvedValue(),
    rescheduleFollowUp: jest.fn().mockResolvedValue()
}));
jest.mock('../../src/controllers/project/project-activity.controller', () => ({
    getActivities: jest.fn().mockResolvedValue()
}));

const ProjectRiskController = require('../../src/controllers/project/project-risk.controller');
const ProjectMinuteController = require('../../src/controllers/project/project-minute.controller');
const ProjectCostController = require('../../src/controllers/project/project-cost.controller');

describe('ProjectDetailsController (Facade)', () => {
    it('delegates getRisks to ProjectRiskController', () => {
        ProjectDetailsController.getRisks('req', 'res');
        expect(ProjectRiskController.getRisks).toHaveBeenCalledWith('req', 'res');
    });

    it('delegates createRisk', () => {
        ProjectDetailsController.createRisk('req', 'res');
        expect(ProjectRiskController.createRisk).toHaveBeenCalledWith('req', 'res');
    });

    it('delegates getMinutes', () => {
        ProjectDetailsController.getMinutes('req', 'res');
        expect(ProjectMinuteController.getMinutes).toHaveBeenCalledWith('req', 'res');
    });

    it('delegates getCosts', () => {
        ProjectDetailsController.getCosts('req', 'res');
        expect(ProjectCostController.getCosts).toHaveBeenCalledWith('req', 'res');
    });

    it('delegates submitCostForApproval', () => {
        ProjectDetailsController.submitCostForApproval('req', 'res');
        expect(ProjectCostController.submitCostForApproval).toHaveBeenCalledWith('req', 'res');
    });

    it('has all expected methods', () => {
        const expectedMethods = [
            'getRisks', 'createRisk', 'updateRisk', 'deleteRisk',
            'getMinutes', 'uploadMinute', 'updateMinute', 'deleteMinute',
            'submitMinute', 'approveMinute', 'rejectMinute',
            'getProposals', 'createProposal', 'updateProposal', 'deleteProposal',
            'submitProposal', 'setPaymentCondition', 'generateCostsFromProposal',
            'getCosts', 'createCost', 'updateCost', 'deleteCost',
            'submitCostForApproval', 'approveCost', 'rejectCost',
            'getFollowUps', 'createFollowUp', 'updateFollowUp', 'deleteFollowUp',
            'completeFollowUp', 'rescheduleFollowUp',
            'getActivities'
        ];
        expectedMethods.forEach(method => {
            expect(typeof ProjectDetailsController[method]).toBe('function');
        });
    });
});
