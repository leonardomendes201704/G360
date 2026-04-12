const ServiceCatalogService = require('../services/service-catalog.service');

class ServiceCatalogController {
  static async index(req, res) {
    try {
      const services = await ServiceCatalogService.getAll(req.prisma, req.query);
      return res.status(200).json(services);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async categories(req, res) {
    try {
      const categories = await ServiceCatalogService.getCategories(req.prisma);
      return res.status(200).json(categories);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // CATEGORIES CRUD
  static async createCategory(req, res) {
    try {
      const cat = await ServiceCatalogService.createCategory(req.prisma, req.body);
      return res.status(201).json(cat);
    } catch(err) { return res.status(400).json({error: err.message}); }
  }

  static async updateCategory(req, res) {
    try {
      const cat = await ServiceCatalogService.updateCategory(req.prisma, req.params.id, req.body);
      return res.status(200).json(cat);
    } catch(err) { return res.status(400).json({error: err.message}); }
  }

  static async deleteCategory(req, res) {
    try {
      await ServiceCatalogService.deleteCategory(req.prisma, req.params.id);
      return res.status(204).send();
    } catch(err) { return res.status(400).json({error: err.message}); }
  }

  // SERVICES CRUD
  static async createService(req, res) {
    try {
      const svc = await ServiceCatalogService.createService(req.prisma, req.body);
      return res.status(201).json(svc);
    } catch(err) { return res.status(400).json({error: err.message}); }
  }

  static async updateService(req, res) {
    try {
      const svc = await ServiceCatalogService.updateService(req.prisma, req.params.id, req.body);
      return res.status(200).json(svc);
    } catch(err) { return res.status(400).json({error: err.message}); }
  }

  static async deleteService(req, res) {
    try {
      await ServiceCatalogService.deleteService(req.prisma, req.params.id);
      return res.status(204).send();
    } catch(err) { return res.status(400).json({error: err.message}); }
  }
}

module.exports = ServiceCatalogController;
