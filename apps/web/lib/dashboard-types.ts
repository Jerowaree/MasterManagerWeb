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

export type Supplier = {
  id: string;
  name: string;
  tradeName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  ruc?: string | null;
  status?: 'active' | 'inactive' | string | null;
  isRetentionAgent?: boolean | null;
  appliesDetraction?: boolean | null;
  taxRegime?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  paymentCondition?: 'cash' | 'credit' | string | null;
  creditDays?: number | null;
  currency?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankCci?: string | null;
  bankAccountType?: string | null;
  category?: string | null;
  tags?: string[] | null;
  createdAt: string;
};

export type CashMovement = {
  id: string;
  type: string;
  amount: number;
  description?: string | null;
  reference?: string | null;
  createdAt: string;
  branch?: {
    name?: string | null;
  } | null;
};

export type ReceivableStatus = 'open' | 'overdue' | 'paid' | 'cancelled' | string;

export type ReceivablePayment = {
  id: string;
  amount: number;
  paymentDate: string;
  method?: string | null;
  reference?: string | null;
  createdAt: string;
};

export type Receivable = {
  id: string;
  totalAmount: number;
  amountPaid: number;
  currency: string;
  status: ReceivableStatus;
  dueDate: string;
  documentRef?: string | null;
  reminderIntervalDays: number;
  nextReminderAt?: string | null;
  lastReminderAt?: string | null;
  reminderCount: number;
  remindersPaused: boolean;
  createdAt: string;
  customer?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  branch?: {
    id: string;
    name?: string | null;
  } | null;
};
