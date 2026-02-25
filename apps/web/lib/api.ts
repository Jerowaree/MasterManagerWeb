const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const target = `${name}=`;
  const found = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(target));
  return found ? decodeURIComponent(found.slice(target.length)) : null;
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const method = (options.method ?? 'GET').toUpperCase();
  const needsCsrf = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
  const csrfToken = needsCsrf ? getCookie('csrf_token') : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
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
    create: (data: unknown, idempotencyKey?: string) =>
      fetchWithAuth('/sales', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : undefined,
      }),
  },
  inventory: {
    getMovements: () => fetchWithAuth('/inventory/movements'),
    create: (data: unknown) => fetchWithAuth('/inventory/movements', { method: 'POST', body: JSON.stringify(data) }),
    getStock: (productId: string, branchId?: string) => 
      fetchWithAuth(`/inventory/stock/${productId}${branchId ? `?branchId=${branchId}` : ''}`),
  },
  customers: {
    findAll: () => fetchWithAuth('/customers'),
    create: (data: unknown) => fetchWithAuth('/customers', { method: 'POST', body: JSON.stringify(data) }),
  },
  branches: {
    findAll: () => fetchWithAuth('/branches'),
    create: (data: unknown) => fetchWithAuth('/branches', { method: 'POST', body: JSON.stringify(data) }),
  },
  users: {
    getProfile: () => fetchWithAuth('/users/profile'),
    listCompanyUsers: () => fetchWithAuth('/users/company-users'),
    createCompanyUser: (data: {
      username: string;
      password: string;
      role?: 'admin' | 'employee';
      branchId?: string;
      confirmAction?: boolean;
      currentPassword?: string;
    }) =>
      fetchWithAuth('/users/company-users', { method: 'POST', body: JSON.stringify(data) }),
    changePassword: (data: unknown) => fetchWithAuth('/users/change-password', { method: 'POST', body: JSON.stringify(data) }),
  },
  companies: {
    getCurrent: () => fetchWithAuth('/companies/me'),
    updateCurrent: (data: {
      name?: string;
      emailDomain?: string;
      country?: string;
      currency?: string;
      timezone?: string;
      confirmAction?: boolean;
      currentPassword?: string;
    }) => fetchWithAuth('/companies/me', { method: 'PATCH', body: JSON.stringify(data) }),
  }
};
