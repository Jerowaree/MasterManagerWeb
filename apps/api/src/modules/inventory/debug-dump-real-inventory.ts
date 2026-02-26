import { PrismaClient } from '@master-manager/database';

async function main() {
  const prisma = new PrismaClient();

  try {
    const companies = await prisma.company.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });

    if (companies.length === 0) {
      console.log('No hay empresas registradas en la base de datos.');
      return;
    }

    for (const company of companies) {
      console.log('='.repeat(80));
      console.log(`Company: ${company.name} (${company.id})`);

      const branches = await prisma.branch.findMany({
        where: { companyId: company.id, deletedAt: null },
        select: { id: true, name: true },
        orderBy: { createdAt: 'asc' },
      });

      if (branches.length === 0) {
        console.log('  Sin sedes activas.');
        continue;
      }

      const products = await prisma.product.findMany({
        where: { companyId: company.id, deletedAt: null },
        select: {
          productId: true,
          name: true,
          category: true,
        },
        orderBy: { productId: 'asc' },
      });

      if (products.length === 0) {
        console.log('  Sin productos en el catálogo.');
        continue;
      }

      console.log(`  Productos en catálogo: ${products.length}`);

      for (const branch of branches) {
        console.log('-'.repeat(60));
        console.log(`  Sede: ${branch.name} (${branch.id})`);

        const productIds = products.map((p) => p.productId);
        const stocks = await prisma.productStock.findMany({
          where: {
            companyId: company.id,
            branchId: branch.id,
            productId: { in: productIds },
          },
          select: {
            productId: true,
            quantity: true,
            updatedAt: true,
          },
        });

        const stockByProduct = new Map<
          string,
          { quantity: number; updatedAt?: Date }
        >();

        for (const stock of stocks) {
          const current = stockByProduct.get(stock.productId);
          const nextQuantity =
            Number(stock.quantity) + Number(current?.quantity ?? 0);
          const nextUpdatedAt =
            !current?.updatedAt || stock.updatedAt > current.updatedAt
              ? stock.updatedAt
              : current.updatedAt;

          stockByProduct.set(stock.productId, {
            quantity: nextQuantity,
            updatedAt: nextUpdatedAt,
          });
        }

        const summary = products.map((product) => {
          const stock = stockByProduct.get(product.productId);
          const quantity = Number(stock?.quantity ?? 0);

          return {
            productId: product.productId,
            name: product.name,
            category: product.category,
            quantity,
            updatedAt: stock?.updatedAt ?? null,
          };
        });

        const totalWithStock = summary.filter((p) => p.quantity > 0).length;

        console.log(
          `  Resultados tipo /inventory/products?branchId=${branch.id}:`,
        );
        console.log(
          `    Productos totales para empresa: ${summary.length}, con stock > 0 en esta sede: ${totalWithStock}`,
        );

        for (const item of summary) {
          console.log(
            `    - ${item.productId} | ${item.name} | ${item.category} | stock=${item.quantity}`,
          );
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Error en debug-dump-real-inventory:', err);
  process.exit(1);
});

