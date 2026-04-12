import api from './api';

const objectToQuery = (params) => {
  const query = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.append(key, params[key]);
    }
  });
  return query.toString();
};

export const getBudgetOverview = async (year, filters = {}) => {
  const query = objectToQuery({ year, ...filters });
  const response = await api.get(`/finance-dashboard/overview?${query}`);
  return response.data;
};

export const getMonthlyEvolution = async (year, filters = {}) => {
  const query = objectToQuery({ year, ...filters });
  const response = await api.get(`/finance-dashboard/evolution?${query}`);
  return response.data;
};

export const getCostCenterPerformance = async (year, filters = {}) => {
  const query = objectToQuery({ year, ...filters });
  const response = await api.get(`/finance-dashboard/cost-centers?${query}`);
  return response.data;
};

export const getInsights = async (year, filters = {}) => {
  const query = objectToQuery({ year, ...filters });
  const response = await api.get(`/finance-dashboard/insights?${query}`);
  return response.data;
};

export const getRecentActivities = async () => {
  const response = await api.get('/finance-dashboard/recent-activities');
  return response.data;
};

export const getAccountPerformance = async (year, filters = {}) => {
  const query = objectToQuery({ year, ...filters });
  const response = await api.get(`/finance-dashboard/accounts?${query}`);
  return response.data;
};

export const getAdvancedStats = async (year, filters = {}) => {
  const query = objectToQuery({ year, ...filters });
  const response = await api.get(`/finance-dashboard/advanced-stats?${query}`);
  return response.data;
};

export const getDREDetails = async (year, monthIndex, filters = {}) => {
  const query = objectToQuery({ year, monthIndex, ...filters });
  const response = await api.get(`/finance-dashboard/dre-details?${query}`);
  return response.data;
};