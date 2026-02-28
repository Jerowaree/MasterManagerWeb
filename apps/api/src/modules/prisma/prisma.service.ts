import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@master-manager/database';
import { tenantStorage } from '../../common/store/tenant.store';

const TENANT_MODELS = [
  'User', 
  'Branch', 
  'Customer', 
  'Supplier', 
  'Sale', 
  'SaleItem',
  'Purchase', 
  'InventoryMovement', 
  'ProductStock',
  'Product',
  'ElectronicDocument',
  'Subscription', 
  'PaymentLog', 
  'AuditLog',
  'CashMovement'
];

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prisma: PrismaClient;
  public client: any;

  constructor() {
    this.prisma = new PrismaClient();
    this.client = this.prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const context = tenantStorage.getStore();
            const companyId = context?.companyId;

            if (TENANT_MODELS.includes(model)) {
              const anyArgs = args as any;

              if (companyId) {
                if (['findFirst', 'findMany', 'findUnique', 'count', 'aggregate', 'groupBy', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'].includes(operation)) {
                  anyArgs.where = { ...anyArgs.where, companyId };
                }
                
                if (['create', 'createMany'].includes(operation)) {
                  if (anyArgs.data) {
                    if (Array.isArray(anyArgs.data)) {
                      anyArgs.data = anyArgs.data.map((item: any) => ({ ...item, companyId }));
                    } else {
                      anyArgs.data = { ...anyArgs.data, companyId };
                    }
                  }
                }
              } else if (!context?.isPublic) {
                throw new Error(`Data Leakage Prevention: Attempted to access ${model} without companyId context.`);
              }
            }

            return query(args);
          },
        },
      },
    });
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  // Allow transaction usage
  get $transaction() {
    return this.client.$transaction;
  }
}
