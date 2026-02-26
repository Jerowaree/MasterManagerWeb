import { describe, it, expect, vi } from 'vitest';
import { InventoryService } from './inventory.service';
import { SalesService } from '../sales/sales.service';
import { ActorContext } from '../../common/utils/branch-access.utils';

type DecimalLike = number;

type ProductRow = {
  id: string;
  companyId: string;
  productId: string;
  name: string;
  category: string;
  price: DecimalLike;
  minStock: DecimalLike;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ProductStockRow = {
  id: string;
  companyId: string;
  branchId: string;
  productId: string;
  quantity: DecimalLike;
  createdAt: Date;
  updatedAt: Date;
};

type BranchRow = {
  id: string;
  companyId: string;
  name: string;
  deletedAt: Date | null;
};

type SaleRow = {
  id: string;
  companyId: string;
  branchId: string;
  total: DecimalLike;
  status: string;
  createdAt: Date;
  deletedAt: Date | null;
};

const randomId = () => `id_${Math.random().toString(36).slice(2, 10)}`;

function createInMemoryPrisma() {
  const products: ProductRow[] = [];
  const productStocks: ProductStockRow[] = [];
  const branches: BranchRow[] = [];
  const sales: SaleRow[] = [];

  const client: any = {
    // Product
    product: {
      findFirst: vi.fn(async (args: any) => {
        const where = args?.where ?? {};
        return (
          products.find((p) => {
            if (where.companyId && p.companyId !== where.companyId) return false;
            if (where.productId && p.productId !== where.productId) return false;
            if (where.id && p.id !== where.id) return false;
            if (where.deletedAt === null && p.deletedAt !== null) return false;
            return true;
          }) ?? null
        );
      }),
      findMany: vi.fn(async (args: any) => {
        const where = args?.where ?? {};
        let results = products.filter((p) => {
          if (where.companyId && p.companyId !== where.companyId) return false;
          if (where.deletedAt === null && p.deletedAt !== null) return false;
          return true;
        });
        if (args?.orderBy?.[0]?.productId === 'asc') {
          results = results.slice().sort((a, b) => a.productId.localeCompare(b.productId));
        }
        const skip = args?.skip ?? 0;
        const take = args?.take ?? results.length;
        return results.slice(skip, skip + take);
      }),
      count: vi.fn(async (args: any) => {
        const where = args?.where ?? {};
        return products.filter((p) => {
          if (where.companyId && p.companyId !== where.companyId) return false;
          if (where.deletedAt === null && p.deletedAt !== null) return false;
          return true;
        }).length;
      }),
      create: vi.fn(async (args: any) => {
        const data = args.data;
        const row: ProductRow = {
          id: randomId(),
          companyId: data.companyId,
          productId: data.productId,
          name: data.name,
          category: data.category,
          price: data.price,
          minStock: data.minStock,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        products.push(row);
        return row;
      }),
    },

    // ProductStock
    productStock: {
      findFirst: vi.fn(async (args: any) => {
        const where = args?.where ?? {};
        return (
          productStocks.find((s) => {
            if (where.companyId && s.companyId !== where.companyId) return false;
            if (where.branchId && s.branchId !== where.branchId) return false;
            if (where.productId && s.productId !== where.productId) return false;
            return true;
          }) ?? null
        );
      }),
      findMany: vi.fn(async (args: any) => {
        const where = args?.where ?? {};
        return productStocks.filter((s) => {
          if (where.companyId && s.companyId !== where.companyId) return false;
          if (where.branchId && s.branchId !== where.branchId) return false;
          if (where.productId?.in && !where.productId.in.includes(s.productId)) return false;
          if (typeof where.productId === 'string' && s.productId !== where.productId) return false;
          return true;
        });
      }),
      upsert: vi.fn(async (args: any) => {
        const where = args.where.companyId_branchId_productId;
        let existing = productStocks.find(
          (s) =>
            s.companyId === where.companyId &&
            s.branchId === where.branchId &&
            s.productId === where.productId,
        );
        if (!existing) {
          const data = args.create;
          existing = {
            id: randomId(),
            companyId: data.companyId,
            branchId: data.branchId,
            productId: data.productId,
            quantity: data.quantity,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          productStocks.push(existing);
        } else {
          if (args.update?.quantity?.increment) {
            existing.quantity += args.update.quantity.increment;
          } else if (typeof args.update?.quantity === 'number') {
            existing.quantity = args.update.quantity;
          }
          existing.updatedAt = new Date();
        }
        return existing;
      }),
      updateMany: vi.fn(async (args: any) => {
        const where = args.where ?? {};
        let count = 0;
        productStocks.forEach((s) => {
          if (where.companyId && s.companyId !== where.companyId) return;
          if (where.branchId && s.branchId !== where.branchId) return;
          if (where.productId && s.productId !== where.productId) return;
          if (where.quantity?.gte !== undefined && !(s.quantity >= where.quantity.gte)) return;
          if (args.data?.quantity?.decrement) {
            s.quantity -= args.data.quantity.decrement;
            s.updatedAt = new Date();
            count++;
          }
        });
        return { count };
      }),
      create: vi.fn(async (args: any) => {
        const data = args.data;
        const row: ProductStockRow = {
          id: randomId(),
          companyId: data.companyId,
          branchId: data.branchId,
          productId: data.productId,
          quantity: data.quantity,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        productStocks.push(row);
        return row;
      }),
    },

    // Branch
    branch: {
      findFirst: vi.fn(async (args: any) => {
        const where = args?.where ?? {};
        return (
          branches.find((b) => {
            if (where.id && b.id !== where.id) return false;
            if (where.companyId && b.companyId !== where.companyId) return false;
            if (where.deletedAt === null && b.deletedAt !== null) return false;
            return true;
          }) ?? null
        );
      }),
    },

    // Sale
    sale: {
      findFirst: vi.fn(async (args: any) => {
        const where = args?.where ?? {};
        return (
          sales.find((s) => {
            if (where.companyId && s.companyId !== where.companyId) return false;
            if (where.id && s.id !== where.id) return false;
            if (where.idempotencyKey && (s as any).idempotencyKey !== where.idempotencyKey) return false;
            if (where.deletedAt === null && s.deletedAt !== null) return false;
            return true;
          }) ?? null
        );
      }),
      create: vi.fn(async (args: any) => {
        const data = args.data;
        const row: SaleRow = {
          id: randomId(),
          companyId: data.companyId ?? 'company-1',
          branchId: data.branchId,
          total: data.total,
          status: data.status,
          createdAt: new Date(),
          deletedAt: null,
        };
        sales.push(row);
        return row;
      }),
      count: vi.fn(async () => sales.length),
      update: vi.fn(async () => {
        return {};
      }),
    },

    // Customer (no lo usamos en este flujo)
    customer: {
      findFirst: vi.fn(async () => null),
    },

    // InventoryMovement
    inventoryMovement: {
      create: vi.fn(async () => ({})),
    },

    // $transaction como en PrismaClient
    $transaction: async <T>(cb: (tx: any) => Promise<T>): Promise<T> => {
      return cb(client);
    },
  };

  const prismaMock = { client };

  return { prismaMock, state: { products, productStocks, branches, sales } };
}

describe('Flujo Inventario + Venta con multi-sede', () => {
  const companyId = 'company-1';
  const branchId = 'branch-1';
  const actor: ActorContext = {
    companyId,
    role: 'owner',
    branchId: undefined,
  };

  it('debe crear producto con stock en una sede, listarlo por sede y permitir la venta', async () => {
    const { prismaMock, state } = createInMemoryPrisma();

    // Seed de la sede
    state.branches.push({
      id: branchId,
      companyId,
      name: 'Sede Principal',
      deletedAt: null,
    });

    const inventoryService = new InventoryService(prismaMock as any);
    const salesService = new SalesService(prismaMock as any);

    const productPayload: any = {
      productId: 'SKU-001',
      name: 'Producto Test',
      category: 'Test',
      price: 10.0,
      minStock: 1,
      branchId,
      initialStock: 5,
      initialCost: 8.0,
    };

    // 1) Crear producto con stock inicial en la sede
    const created = await inventoryService.createProduct(productPayload, actor);
    expect(created.productId).toBe('SKU-001');

    // Debe existir snapshot de stock en esa sede
    const initialStockRow = state.productStocks.find(
      (s) =>
        s.companyId === companyId &&
        s.branchId === branchId &&
        s.productId === 'SKU-001',
    );
    expect(initialStockRow).toBeDefined();
    expect(initialStockRow?.quantity).toBe(5);

    // 2) Listar productos para ESA sede: debe aparecer con cantidad > 0
    const paginated = await inventoryService.listProducts(branchId, actor, {
      page: 1,
      limit: 10,
    } as any);

    const items = paginated.items as Array<{
      productId: string;
      quantity: number;
      branchId: string | null;
    }>;

    const productForBranch = items.find((i) => i.productId === 'SKU-001');
    expect(productForBranch).toBeDefined();
    expect(productForBranch?.branchId).toBe(branchId);
    expect(productForBranch?.quantity).toBeGreaterThan(0);

    // 3) Registrar una venta de 2 unidades en esa sede
    const salePayload: any = {
      branchId,
      status: 'paid',
      total: 20.0, // 2 * 10
      items: [
        {
          productId: 'SKU-001',
          quantity: 2,
          unitPrice: 10.0,
        },
      ],
    };

    const sale = await salesService.create(
      salePayload,
      actor,
      'test-idempotency-key',
    );

    expect(sale).toBeDefined();
    expect(state.sales.length).toBe(1);

    // 4) Comprobar que el stock se haya decrementado en esa sede (5 - 2 = 3)
    const stockAfterSale = state.productStocks.find(
      (s) =>
        s.companyId === companyId &&
        s.branchId === branchId &&
        s.productId === 'SKU-001',
    );
    expect(stockAfterSale).toBeDefined();
    expect(stockAfterSale!.quantity).toBe(3);
  });
});
