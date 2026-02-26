export type SaleStatus = 'paid' | 'pending' | string;

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
};

export type PaginatedData<T> = {
  items: T[];
  meta: PaginationMeta;
};

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
  product?: {
    name?: string | null;
    category?: string | null;
    price?: number | null;
  } | null;
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
  name: string;
  category: string;
  price: number;
  minStock: number;
  branchId: string | null;
  quantity: number;
  isLowStock?: boolean;
  unitCost: number;
  updatedAt: string;
};

export type LowStockProduct = {
  productId: string;
  name: string;
  category: string;
  minStock: number;
  quantity: number;
  isLowStock: boolean;
  updatedAt?: string | null;
  branchId?: string | null;
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

export type SunatStatus = {
  enabled: boolean;
  country: string;
  provider: string;
  environment: string;
};

export type SunatDocument = {
  id: string;
  saleId: string;
  documentType: 'factura' | 'boleta' | string;
  series: string;
  correlative: string;
  status: string;
  externalId?: string | null;
  issuedAt?: string | null;
  createdAt: string;
  sale?: {
    id: string;
    total: number;
    status: string;
    createdAt: string;
  } | null;
  branch?: {
    id: string;
    name: string;
  } | null;
};
