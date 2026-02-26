const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
let refreshPromise: Promise<boolean> | null = null;

type PaginationParams = {
  page?: number;
  limit?: number;
};

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

function buildQueryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
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
    findAll: (params?: PaginationParams) =>
      fetchWithAuth(`/sales${buildQueryString({ page: params?.page, limit: params?.limit })}`),
    create: (data: unknown, idempotencyKey?: string) =>
      fetchWithAuth('/sales', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : undefined,
      }),
  },
  inventory: {
    getMovements: (params?: PaginationParams) =>
      fetchWithAuth(`/inventory/movements${buildQueryString({ page: params?.page, limit: params?.limit })}`),
    getLowStock: (branchId?: string, params?: PaginationParams) =>
      fetchWithAuth(
        `/inventory/low-stock${buildQueryString({
          branchId,
          page: params?.page,
          limit: params?.limit,
        })}`,
      ),
    createProduct: (data: unknown) =>
      fetchWithAuth('/inventory/products', { method: 'POST', body: JSON.stringify(data) }),
    updateProduct: (productId: string, data: unknown) =>
      fetchWithAuth(`/inventory/products/${encodeURIComponent(productId)}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    adjustProductStock: (
      productId: string,
      data: { branchId?: string; quantity: number; unitCost?: number },
    ) =>
      fetchWithAuth(`/inventory/products/${encodeURIComponent(productId)}/stock`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    create: (data: unknown) => fetchWithAuth('/inventory/movements', { method: 'POST', body: JSON.stringify(data) }),
    listProducts: (branchId?: string, params?: PaginationParams) =>
      fetchWithAuth(
        `/inventory/products${buildQueryString({
          branchId,
          page: params?.page,
          limit: params?.limit,
        })}`,
      ),
    getStock: (productId: string, branchId?: string) => 
      fetchWithAuth(`/inventory/stock/${productId}${branchId ? `?branchId=${branchId}` : ''}`),
  },
  geo: {
    searchAddress: (q: string, countryCode?: string) =>
      fetchWithAuth(`/geo/search?q=${encodeURIComponent(q)}${countryCode ? `&countryCode=${encodeURIComponent(countryCode)}` : ''}`),
  },
  customers: {
    findAll: (params?: PaginationParams) =>
      fetchWithAuth(`/customers${buildQueryString({ page: params?.page, limit: params?.limit })}`),
    create: (data: unknown) => fetchWithAuth('/customers', { method: 'POST', body: JSON.stringify(data) }),
  },
  branches: {
    findAll: (params?: PaginationParams) =>
      fetchWithAuth(`/branches${buildQueryString({ page: params?.page, limit: params?.limit })}`),
    create: (data: unknown) => fetchWithAuth('/branches', { method: 'POST', body: JSON.stringify(data) }),
  },
  users: {
    getProfile: () => fetchWithAuth('/users/profile'),
    listCompanyUsers: (params?: PaginationParams) =>
      fetchWithAuth(`/users/company-users${buildQueryString({ page: params?.page, limit: params?.limit })}`),
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
  },
  payments: {
    listPlans: () => fetchWithAuth('/payments/plans'),
    payPlan: (data: { planId: string; cycle: 'monthly' | 'yearly'; currentPassword: string }) =>
      fetchWithAuth('/payments/pay-plan', { method: 'POST', body: JSON.stringify(data) }),
  },
  peru: {
    getSunatStatus: () => fetchWithAuth('/peru/sunat/status'),
    issueSaleDocument: (saleId: string) =>
      fetchWithAuth(`/peru/sunat/sales/${encodeURIComponent(saleId)}/issue`, { method: 'POST' }),
    listSunatDocuments: (params?: PaginationParams) =>
      fetchWithAuth(`/peru/sunat/documents${buildQueryString({ page: params?.page, limit: params?.limit })}`),
  }
};
