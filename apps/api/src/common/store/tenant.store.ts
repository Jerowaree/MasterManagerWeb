import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  companyId?: string;
  isPublic?: boolean;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();
