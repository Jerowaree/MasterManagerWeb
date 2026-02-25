const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(error.message || `Error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  reports: {
    getDashboard: () => fetchWithAuth('/reports/dashboard'),
    getCashClosing: () => fetchWithAuth('/reports/cash-closing'),
    getInventoryValorization: () => fetchWithAuth('/reports/inventory-valorization'),
    sendEmailReport: (type: 'sales' | 'inventory') => 
      fetchWithAuth('/reports/email-report', { method: 'POST', body: JSON.stringify({ type }) }),
  },
  sales: {
    findAll: () => fetchWithAuth('/sales'),
    create: (data: any) => fetchWithAuth('/sales', { method: 'POST', body: JSON.stringify(data) }),
  },
  inventory: {
    getMovements: () => fetchWithAuth('/inventory/movements'),
    create: (data: any) => fetchWithAuth('/inventory/movements', { method: 'POST', body: JSON.stringify(data) }),
    getStock: (productId: string, branchId?: string) => 
      fetchWithAuth(`/inventory/stock/${productId}${branchId ? `?branchId=${branchId}` : ''}`),
  },
  customers: {
    findAll: () => fetchWithAuth('/customers'),
    create: (data: any) => fetchWithAuth('/customers', { method: 'POST', body: JSON.stringify(data) }),
  },
  branches: {
    findAll: () => fetchWithAuth('/branches'),
    create: (data: any) => fetchWithAuth('/branches', { method: 'POST', body: JSON.stringify(data) }),
  },
  users: {
    getProfile: () => fetchWithAuth('/users/profile'),
    changePassword: (data: any) => fetchWithAuth('/users/change-password', { method: 'POST', body: JSON.stringify(data) }),
  }
};
