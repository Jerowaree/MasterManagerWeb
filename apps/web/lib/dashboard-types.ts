export type SaleStatus = 'paid' | 'pending' | string;

export type UserSummary = {
  id: string;
  email: string;
  role: string;
};

export type Branch = {
  id: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone: string;
};

export type Customer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  documentType: string;
  documentNumber: string;
  address?: string | null;
  createdAt: string;
};

export type Sale = {
  id: string;
  total: number;
  status: SaleStatus;
  createdAt: string;
  customer?: {
    name?: string | null;
    email?: string | null;
  } | null;
  branch?: {
    name?: string | null;
  } | null;
};

export type CashClosing = {
  date: string;
  totalAmount: number;
  count: number;
  sales: Sale[];
};

export type InventoryMovement = {
  id: string;
  productId: string;
  type: 'IN' | 'OUT' | 'TRANSFER' | string;
  quantity: number;
  unitCost: number;
  createdAt: string;
  branch?: {
    name?: string | null;
  } | null;
};

export type InventoryValorizationProduct = {
  productId: string;
  stock: number;
  latestCost: number;
  totalValue: number;
};

export type InventoryValorization = {
  totalPortfolioValue: number;
  products: InventoryValorizationProduct[];
};

export type ProductOption = {
  productId: string;
  branchId: string;
  quantity: number;
  unitCost: number;
  updatedAt: string;
};

export type DashboardStats = {
  totalRevenue: number;
  todayRevenue: number;
  customerCount: number;
  branchCount: number;
  revenueTrend?: number;
};

export type DashboardData = {
  stats: DashboardStats;
  recentSales: Sale[];
};
