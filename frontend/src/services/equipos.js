import client from '../api/client';

export const ubicacionesService = {
  list: () => client.get('/ubicaciones/').then(r => (r.data.results ?? r.data)),
  create: (nombre) => client.post('/ubicaciones/', { nombre }).then(r => r.data),
};

export const departamentosService = {
  list: (ubicacionId) => {
    const params = ubicacionId ? { ubicacion: ubicacionId } : {};
    return client.get('/departamentos/', { params }).then(r => (r.data.results ?? r.data));
  },
  create: (nombre, ubicacion) =>
    client.post('/departamentos/', { nombre, ubicacion }).then(r => r.data),
};

export const equiposService = {
  list: (params = {}) => client.get('/equipos/', { params }).then(r => r.data),
  get: (id) => client.get(`/equipos/${id}/`).then(r => r.data),
  create: (data) => client.post('/equipos/', data).then(r => r.data),
  update: (id, data) => client.patch(`/equipos/${id}/`, data).then(r => r.data),
  baja: (id, motivo_baja) => client.post(`/equipos/${id}/baja/`, { motivo_baja }).then(r => r.data),
  mantenimientos: (id) => client.get(`/equipos/${id}/mantenimientos/`).then(r => r.data),

  exportarCSV: async (params = {}) => {
    const response = await client.get('/equipos/exportar-csv/', {
      params,
      responseType: 'blob',
    });
    // Disparamos la descarga programáticamente.
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'equipos.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  importarCSV: async (file) => {
    const fd = new FormData();
    fd.append('archivo', file);
    // Devolvemos response.data en éxito y throw con response.data en error
    // para que el frontend pueda mostrar el detalle por fila.
    try {
      const r = await client.post('/equipos/importar-csv/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return r.data;
    } catch (err) {
      // Re-lanzamos preservando el body de la respuesta del backend.
      const wrapped = new Error(err.response?.data?.detail || err.message);
      wrapped.responseData = err.response?.data;
      throw wrapped;
    }
  },
};
