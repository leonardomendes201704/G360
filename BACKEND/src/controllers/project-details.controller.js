/**
 * Facade — mantém backward compatibility com as rotas existentes.
 * 
 * O controller original (37KB, ~1080 linhas) foi decomposto em 6 sub-controllers:
 *   - project-risk.controller.js
 *   - project-minute.controller.js
 *   - project-proposal.controller.js
 *   - project-cost.controller.js
 *   - project-followup.controller.js
 *   - project-activity.controller.js
 * 
 * Este arquivo re-exporta todos os métodos para que project.routes.js
 * continue funcionando sem alterações.
 */

const ProjectRiskController = require('./project/project-risk.controller');
const ProjectMinuteController = require('./project/project-minute.controller');
const ProjectProposalController = require('./project/project-proposal.controller');
const ProjectCostController = require('./project/project-cost.controller');
const ProjectFollowUpController = require('./project/project-followup.controller');
const ProjectActivityController = require('./project/project-activity.controller');

class ProjectDetailsController {
  // Riscos
  static getRisks(...args) { return ProjectRiskController.getRisks(...args); }
  static createRisk(...args) { return ProjectRiskController.createRisk(...args); }
  static updateRisk(...args) { return ProjectRiskController.updateRisk(...args); }
  static deleteRisk(...args) { return ProjectRiskController.deleteRisk(...args); }

  // Atas de Reunião
  static getMinutes(...args) { return ProjectMinuteController.getMinutes(...args); }
  static uploadMinute(...args) { return ProjectMinuteController.uploadMinute(...args); }
  static updateMinute(...args) { return ProjectMinuteController.updateMinute(...args); }
  static deleteMinute(...args) { return ProjectMinuteController.deleteMinute(...args); }
  static submitMinute(...args) { return ProjectMinuteController.submitMinute(...args); }
  static approveMinute(...args) { return ProjectMinuteController.approveMinute(...args); }
  static rejectMinute(...args) { return ProjectMinuteController.rejectMinute(...args); }

  // Propostas
  static getProposals(...args) { return ProjectProposalController.getProposals(...args); }
  static createProposal(...args) { return ProjectProposalController.createProposal(...args); }
  static updateProposal(...args) { return ProjectProposalController.updateProposal(...args); }
  static deleteProposal(...args) { return ProjectProposalController.deleteProposal(...args); }
  static submitProposal(...args) { return ProjectProposalController.submitProposal(...args); }
  static setPaymentCondition(...args) { return ProjectProposalController.setPaymentCondition(...args); }
  static generateCostsFromProposal(...args) { return ProjectProposalController.generateCostsFromProposal(...args); }

  // Custos
  static getCosts(...args) { return ProjectCostController.getCosts(...args); }
  static createCost(...args) { return ProjectCostController.createCost(...args); }
  static updateCost(...args) { return ProjectCostController.updateCost(...args); }
  static deleteCost(...args) { return ProjectCostController.deleteCost(...args); }
  static submitCostForApproval(...args) { return ProjectCostController.submitCostForApproval(...args); }
  static approveCost(...args) { return ProjectCostController.approveCost(...args); }
  static rejectCost(...args) { return ProjectCostController.rejectCost(...args); }

  // Follow-up
  static getFollowUps(...args) { return ProjectFollowUpController.getFollowUps(...args); }
  static createFollowUp(...args) { return ProjectFollowUpController.createFollowUp(...args); }
  static updateFollowUp(...args) { return ProjectFollowUpController.updateFollowUp(...args); }
  static deleteFollowUp(...args) { return ProjectFollowUpController.deleteFollowUp(...args); }
  static completeFollowUp(...args) { return ProjectFollowUpController.completeFollowUp(...args); }
  static rescheduleFollowUp(...args) { return ProjectFollowUpController.rescheduleFollowUp(...args); }

  // Atividades
  static getActivities(...args) { return ProjectActivityController.getActivities(...args); }
}

module.exports = ProjectDetailsController;
