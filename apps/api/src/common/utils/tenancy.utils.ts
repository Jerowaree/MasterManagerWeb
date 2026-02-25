export interface TenantFilter {
  companyId: string;
}

export interface BranchFilter extends TenantFilter {
  branchId?: string;
}

export function withTenant<T>(filter: TenantFilter, where: T): T & TenantFilter {
  return {
    ...where,
    companyId: filter.companyId,
  };
}

export function withBranch<T>(filter: BranchFilter, where: T): T & BranchFilter {
  return {
    ...where,
    companyId: filter.companyId,
    ...(filter.branchId ? { branchId: filter.branchId } : {}),
  };
}
