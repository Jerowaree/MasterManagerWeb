import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { tenantStorage } from '../../common/store/tenant.store';
import type { ActorContext } from '../../common/utils/branch-access.utils';

async function main() {
  // Ajusta estos IDs a la empresa y sede con la que estas logueado en el frontend
  const companyId = 'e053c8be-2628-41b5-894c-5caa4bd2416f'; // Fintech
  const branchPrincipalId = '2dadfc52-db37-4d16-af5e-fbeee443460a'; // Sede Principal (Fintech)

  const prismaService = new PrismaService();
  await prismaService.onModuleInit();

  const inventoryService = new InventoryService(prismaService as any);

  const actor: ActorContext = {
    companyId,
    role: 'owner',
    branchId: undefined,
  };

  // Simula lo que hace el interceptor Tenant + extension de Prisma
  await tenantStorage.run({ companyId }, async () => {
    console.log('=== Llamada equivalente a /inventory/products (sin branchId) ===');
    const allBranchesResult = await inventoryService.listProducts(
      undefined,
      actor,
      { page: 1, limit: 50 } as any,
    );
    console.dir(allBranchesResult, { depth: null });

    console.log(
      `\n=== Llamada equivalente a /inventory/products?branchId=${branchPrincipalId} ===`,
    );
    const branchResult = await inventoryService.listProducts(
      branchPrincipalId,
      actor,
      { page: 1, limit: 50 } as any,
    );
    console.dir(branchResult, { depth: null });
  });

  await prismaService.onModuleDestroy();
}

main().catch((err) => {
  console.error('Error en debug-call-list-products:', err);
  process.exit(1);
});

