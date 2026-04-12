import api from './api';

const getAll = async () => {
  const response = await api.get('/fiscal-years');
  return response.data;
};

const create = async (data) => {
  const response = await api.post('/fiscal-years', data);
  return response.data;
};

const update = async (id, data) => {
  const response = await api.put(`/fiscal-years/${id}`, data);
  return response.data;
};

const remove = async (id) => {
  await api.delete(`/fiscal-years/${id}`);
};

export default {
  getAll,
  create,
  update,
  delete: remove
};