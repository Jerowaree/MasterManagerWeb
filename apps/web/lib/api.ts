const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
let refreshPromise: Promise<boolean> | null = null;

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const target = `${name}=`;
  const found = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(target));
  return found ? decodeURIComponent(found.slice(target.length)) : null;
}

async function refreshSession() {
  const csrfToken = getCookie('csrf_token');
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
    credentials: 'include',
  });

  return response.ok;
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const currentPath = window.location.pathname;
  if (currentPath === '/login' || currentPath === '/register') return;
  window.location.href = '/login';
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}, allowRetry = true) {
  const method = (options.method ?? 'GET').toUpperCase();
  const needsCsrf = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
  const csrfToken = needsCsrf ? getCookie('csrf_token') : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && allowRetry && endpoint !== '/auth/refresh') {
    if (!refreshPromise) {
      refreshPromise = refreshSession().finally(() => {
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;
    if (refreshed) {
      return fetchWithAuth(endpoint, options, false);
    }

    redirectToLogin();
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'Error desconocido' }));
    const message = Array.isArray(error.message)
      ? error.message.join(', ')
      : error.message || `Error: ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}

export const api = {
  auth: {
    me: () => fetchWithAuth('/auth/me'),
    logout: () => fetchWithAuth('/auth/logout', { method: 'POST' }),
  },
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
    listProducts: (branchId?: string) =>
      fetchWithAuth(`/inventory/products${branchId ? `?branchId=${branchId}` : ''}`),
    getStock: (productId: string, branchId?: string) => 
      fetchWithAuth(`/inventory/stock/${productId}${branchId ? `?branchId=${branchId}` : ''}`),
  },
  geo: {
    searchAddress: (q: string, countryCode?: string) =>
      fetchWithAuth(`/geo/search?q=${encodeURIComponent(q)}${countryCode ? `&countryCode=${encodeURIComponent(countryCode)}` : ''}`),
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
