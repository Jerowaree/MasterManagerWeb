import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustProductStockDto } from './dto/adjust-product-stock.dto';
import { tenantStorage } from '../../common/store/tenant.store';
import {
  ActorContext,
  assertActorBranchScope,
  resolveActorBranchFilter,
} from '../../common/utils/branch-access.utils';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { resolvePagination, toPaginatedResult } from '../../common/utils/pagination.utils';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private resolveCompanyId(actor: ActorContext) {
    const context = tenantStorage.getStore();
    const contextCompanyId = context?.companyId;

    if (!actor.companyId) {
      throw new BadRequestException('Usuario autenticado sin contexto de empresa');
    }

    if (contextCompanyId && contextCompanyId !== actor.companyId) {
      throw new BadRequestException('Contexto de tenant inconsistente');
    }

    return actor.companyId;
  }

  private async ensureBranchBelongsToCompany(companyId: string, branchId: string) {
    const branch = await this.prisma.client.branch.findFirst({
      where: {
        id: branchId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada para tu empresa');
    }
  }

  private normalizeProductId(productId: string) {
    return productId.trim();
  }

  private async ensureProductExists(companyId: string, productId: string) {
    const product = await this.prisma.client.product.findFirst({
      where: {
        companyId,
        productId,
        deletedAt: null,
      },
      select: { productId: true },
    });

    if (!product) {
      throw new NotFoundException(
        `Producto ${productId} no encontrado. Debes crearlo primero en Inventario.`,
      );
    }
  }

  async createProduct(dto: CreateProductDto, actor: ActorContext) {
    const companyId = this.resolveCompanyId(actor);
    const productId = this.normalizeProductId(dto.productId);
    const name = dto.name.trim();
    const category = dto.category.trim();
    const price = Number(dto.price);
    const minStock = Number(dto.minStock ?? 0);
    const initialStock = Number(dto.initialStock ?? 0);
    const initialCost = dto.initialCost === undefined ? undefined : Number(dto.initialCost);

    if (!Number.isFinite(price) || price <= 0) {
      throw new BadRequestException('El precio del producto debe ser mayor a cero');
    }

    if (!Number.isFinite(initialStock) || initialStock < 0) {
      throw new BadRequestException('El stock inicial no puede ser negativo');
    }
    if (!Number.isFinite(minStock) || minStock < 0) {
      throw new BadRequestException('El stock minimo no puede ser negativo');
    }

    if (initialStock > 0) {
      if (!dto.branchId) {
        throw new BadRequestException(
          'Debes seleccionar una sucursal para registrar stock inicial',
        );
      }
      assertActorBranchScope(actor, dto.branchId);
      await this.ensureBranchBelongsToCompany(companyId, dto.branchId);

      if (!Number.isFinite(initialCost) || Number(initialCost) <= 0) {
        throw new BadRequestException(
          'Debes enviar un costo inicial valido cuando registras stock inicial',
        );
      }
    }

    return this.prisma.client.$transaction(async (tx: typeof this.prisma.client) => {
      return tenantStorage.run({ companyId }, async () => {
        const existing = await tx.product.findFirst({
          where: { companyId, productId, deletedAt: null },
          select: { id: true },
        });

        if (existing) {
          throw new ConflictException(
            `Ya existe un producto con codigo ${productId} en tu empresa`,
          );
        }

        const created = await tx.product.create({
          data: {
            companyId,
            productId,
            name,
            category,
            price,
            minStock,
          },
        });

        if (initialStock > 0 && dto.branchId && initialCost !== undefined) {
          await tx.productStock.upsert({
            where: {
              companyId_branchId_productId: {
                companyId,
                branchId: dto.branchId,
                productId,
              },
            },
            create: {
              companyId,
              branchId: dto.branchId,
              productId,
              quantity: initialStock,
            },
            update: {
              quantity: { increment: initialStock },
            },
          });

          await tx.inventoryMovement.create({
            data: {
              companyId,
              branchId: dto.branchId,
              productId,
              type: 'IN',
              quantity: initialStock,
              unitCost: initialCost,
            },
          });
        }

        return created;
      });
    });
  }

  async updateProduct(productId: string, dto: UpdateProductDto, actor: ActorContext) {
    const companyId = this.resolveCompanyId(actor);
    const normalizedProductId = this.normalizeProductId(productId);

    const existing = await this.prisma.client.product.findFirst({
      where: {
        companyId,
        productId: normalizedProductId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Producto ${normalizedProductId} no encontrado en tu empresa`,
      );
    }

    const data: {
      name?: string;
      category?: string;
      price?: number;
      minStock?: number;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.category !== undefined) {
      data.category = dto.category.trim();
    }

    if (dto.price !== undefined) {
      const price = Number(dto.price);
      if (!Number.isFinite(price) || price <= 0) {
        throw new BadRequestException('El precio del producto debe ser mayor a cero');
      }
      data.price = price;
    }

    if (dto.minStock !== undefined) {
      const minStock = Number(dto.minStock);
      if (!Number.isFinite(minStock) || minStock < 0) {
        throw new BadRequestException('El stock minimo no puede ser negativo');
      }
      data.minStock = minStock;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No se enviaron cambios para actualizar');
    }

    return this.prisma.client.product.update({
      where: { id: existing.id },
      data,
    });
  }

  async adjustProductStock(
    productId: string,
    dto: AdjustProductStockDto,
    actor: ActorContext,
  ) {
    const companyId = this.resolveCompanyId(actor);
    const effectiveBranchId = resolveActorBranchFilter(actor, dto.branchId);
    if (!effectiveBranchId) {
      throw new BadRequestException('Debes seleccionar una sucursal para ajustar stock');
    }

    await this.ensureBranchBelongsToCompany(companyId, effectiveBranchId);

    const normalizedProductId = this.normalizeProductId(productId);
    const product = await this.prisma.client.product.findFirst({
      where: {
        companyId,
        productId: normalizedProductId,
        deletedAt: null,
      },
      select: {
        productId: true,
        price: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Producto ${normalizedProductId} no encontrado en tu empresa`,
      );
    }

    const targetQuantity = Number(dto.quantity);
    if (!Number.isFinite(targetQuantity) || targetQuantity < 0) {
      throw new BadRequestException('La cantidad objetivo debe ser un numero mayor o igual a cero');
    }

    const unitCost = Number(dto.unitCost ?? product.price);
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      throw new BadRequestException('El costo unitario del ajuste debe ser mayor a cero');
    }

    return this.prisma.client.$transaction(async (tx: typeof this.prisma.client) => {
      const snapshot = await tx.productStock.findFirst({
        where: {
          companyId,
          branchId: effectiveBranchId,
          productId: normalizedProductId,
        },
        select: {
          id: true,
          quantity: true,
        },
      });

      const previousQuantity = Number(snapshot?.quantity ?? 0);
      const adjustedQuantity = Number((targetQuantity - previousQuantity).toFixed(2));

      if (!snapshot && targetQuantity === 0) {
        return {
          productId: normalizedProductId,
          branchId: effectiveBranchId,
          previousQuantity: 0,
          currentQuantity: 0,
          adjustedQuantity: 0,
          movementCreated: false,
        };
      }

      if (snapshot) {
        await tx.productStock.update({
          where: { id: snapshot.id },
          data: { quantity: targetQuantity },
        });
      } else {
        await tx.productStock.create({
          data: {
            companyId,
            branchId: effectiveBranchId,
            productId: normalizedProductId,
            quantity: targetQuantity,
          },
        });
      }

      if (adjustedQuantity !== 0) {
        await tx.inventoryMovement.create({
          data: {
            branchId: effectiveBranchId,
            productId: normalizedProductId,
            type: adjustedQuantity > 0 ? 'IN' : 'OUT',
            quantity: Math.abs(adjustedQuantity),
            unitCost,
          },
        });
      }

      return {
        productId: normalizedProductId,
        branchId: effectiveBranchId,
        previousQuantity,
        currentQuantity: targetQuantity,
        adjustedQuantity,
        movementCreated: adjustedQuantity !== 0,
      };
    });
  }

  async createMovement(createMovementDto: CreateMovementDto, actor: ActorContext) {
    const companyId = this.resolveCompanyId(actor);

    assertActorBranchScope(actor, createMovementDto.branchId);
    await this.ensureBranchBelongsToCompany(companyId, createMovementDto.branchId);

    const quantity = Number(createMovementDto.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('La cantidad del movimiento debe ser mayor a cero');
    }

    const unitCost = Number(createMovementDto.unitCost);
    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      throw new BadRequestException('El costo unitario debe ser mayor a cero');
    }

    if (createMovementDto.type === 'TRANSFER') {
      throw new BadRequestException('TRANSFER aun no esta soportado en snapshot de stock');
    }

    const productId = this.normalizeProductId(createMovementDto.productId);
    await this.ensureProductExists(companyId, productId);

    return this.prisma.client.$transaction(async (tx: typeof this.prisma.client) => {
      return tenantStorage.run({ companyId }, async () => {
        const movement = await tx.inventoryMovement.create({
          data: {
            companyId,
            branchId: createMovementDto.branchId,
            productId,
            type: createMovementDto.type,
            quantity,
            unitCost,
          },
        });

        if (createMovementDto.type === 'IN') {
          await tx.productStock.upsert({
            where: {
              companyId_branchId_productId: {
                companyId,
                branchId: createMovementDto.branchId,
                productId,
              },
            },
            create: {
              companyId,
              branchId: createMovementDto.branchId,
              productId,
              quantity,
            },
            update: {
              quantity: { increment: quantity },
            },
          });
        }

        if (createMovementDto.type === 'OUT') {
          const decremented = await tx.productStock.updateMany({
            where: {
              companyId,
              branchId: createMovementDto.branchId,
              productId,
              quantity: { gte: quantity },
            },
            data: {
              quantity: { decrement: quantity },
            },
          });

          if (decremented.count === 0) {
            throw new BadRequestException(
              `Stock insuficiente para ${productId} en la sucursal indicada`
            );
          }
        }

        return movement;
      });
    });
  }

  async findAll(actor: ActorContext, pagination: PaginationQueryDto) {
    const companyId = this.resolveCompanyId(actor);
    const branchId = resolveActorBranchFilter(actor);
    const { page, limit, skip, take } = resolvePagination(pagination);
    const where = {
      companyId,
      deletedAt: null,
      ...(branchId ? { branchId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.inventoryMovement.findMany({
        include: {
          branch: true,
        },
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.client.inventoryMovement.count({ where }),
    ]);

    const uniqueProductIds = [...new Set(items.map((item: { productId: string }) => item.productId))];
    const products = uniqueProductIds.length
      ? await this.prisma.client.product.findMany({
          where: {
            companyId,
            productId: { in: uniqueProductIds },
            deletedAt: null,
          },
          select: {
            productId: true,
            name: true,
            category: true,
            price: true,
          },
        })
      : [];

    const productById = new Map(
      products.map((product: { productId: string; name: string; category: string; price: number }) => [
        product.productId,
        {
          name: product.name,
          category: product.category,
          price: Number(product.price),
        },
      ]),
    );

    const enrichedItems = items.map((item: { productId: string; [key: string]: unknown }) => ({
      ...item,
      product: productById.get(item.productId) ?? null,
    }));

    return toPaginatedResult(enrichedItems, page, limit, total);
  }

  async findByProduct(productId: string, actor: ActorContext) {
    const companyId = this.resolveCompanyId(actor);
    const branchId = resolveActorBranchFilter(actor);
    const normalizedProductId = this.normalizeProductId(productId);

    return this.prisma.client.inventoryMovement.findMany({
      where: {
        companyId,
        productId: normalizedProductId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStock(productId: string, branchId: string | undefined, actor: ActorContext) {
    const companyId = this.resolveCompanyId(actor);
    const effectiveBranchId = resolveActorBranchFilter(actor, branchId);
    const normalizedProductId = this.normalizeProductId(productId);

    if (effectiveBranchId) {
      await this.ensureBranchBelongsToCompany(companyId, effectiveBranchId);

      const snapshot = await this.prisma.client.productStock.findFirst({
        where: {
          companyId,
          productId: normalizedProductId,
          branchId: effectiveBranchId,
        },
        select: { quantity: true },
      });

      return Number(snapshot?.quantity ?? 0);
    }

    const total = await this.prisma.client.productStock.aggregate({
      _sum: { quantity: true },
      where: { companyId, productId: normalizedProductId },
    });

    return Number(total._sum.quantity ?? 0);
  }

  async listProducts(
    branchId: string | undefined,
    actor: ActorContext,
    pagination: PaginationQueryDto,
  ) {
    const companyId = this.resolveCompanyId(actor);
    const effectiveBranchId = resolveActorBranchFilter(actor, branchId);
    const { page, limit, skip, take } = resolvePagination(pagination);

    if (effectiveBranchId) {
      await this.ensureBranchBelongsToCompany(companyId, effectiveBranchId);
    }

    const whereProducts = { companyId, deletedAt: null };
    const [products, total] = await Promise.all([
      this.prisma.client.product.findMany({
        where: whereProducts,
        select: {
          productId: true,
          name: true,
          category: true,
          price: true,
          minStock: true,
          updatedAt: true,
        },
        orderBy: [{ productId: 'asc' }],
        skip,
        take,
      }),
      this.prisma.client.product.count({ where: whereProducts }),
    ]);

    if (products.length === 0) {
      return toPaginatedResult([], page, limit, total);
    }

    const productIds = products.map((product: { productId: string }) => product.productId);
    const stocks = await this.prisma.client.productStock.findMany({
      where: {
        companyId,
        productId: { in: productIds },
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      },
      select: {
        productId: true,
        quantity: true,
        updatedAt: true,
      },
    });

    const stockByProduct = new Map<string, { quantity: number; updatedAt?: Date }>();
    for (const stock of stocks) {
      const current = stockByProduct.get(stock.productId);
      const nextQuantity = Number(stock.quantity) + Number(current?.quantity ?? 0);
      const nextUpdatedAt =
        !current?.updatedAt || stock.updatedAt > current.updatedAt
          ? stock.updatedAt
          : current.updatedAt;
      stockByProduct.set(stock.productId, {
        quantity: nextQuantity,
        updatedAt: nextUpdatedAt,
      });
    }

    const items = products.map(
      (product: {
        productId: string;
        name: string;
        category: string;
        price: number;
        minStock: number;
        updatedAt: Date;
      }) => {
        const stock = stockByProduct.get(product.productId);
        const quantity = Number(stock?.quantity ?? 0);
        const minStock = Number(product.minStock ?? 0);
        return {
          productId: product.productId,
          name: product.name,
          category: product.category,
          price: Number(product.price),
          minStock,
          quantity,
          isLowStock: minStock > 0 && quantity <= minStock,
          unitCost: Number(product.price),
          updatedAt: stock?.updatedAt ?? product.updatedAt,
          branchId: effectiveBranchId ?? null,
        };
      }
    );

    return toPaginatedResult(items, page, limit, total);
  }

  async listLowStock(
    branchId: string | undefined,
    actor: ActorContext,
    pagination: PaginationQueryDto,
  ) {
    const companyId = this.resolveCompanyId(actor);
    const effectiveBranchId = resolveActorBranchFilter(actor, branchId);
    const { page, limit, skip, take } = resolvePagination(pagination);

    if (effectiveBranchId) {
      await this.ensureBranchBelongsToCompany(companyId, effectiveBranchId);
    }

    const branchJoinFilter = effectiveBranchId
      ? Prisma.sql`AND ps."branchId" = CAST(${effectiveBranchId} AS uuid)`
      : Prisma.empty;

    const countRows = (await this.prisma.client.$queryRaw(Prisma.sql`
      SELECT COUNT(*)::bigint AS "count"
      FROM (
        SELECT p."productId"
        FROM "Product" p
        LEFT JOIN "ProductStock" ps
          ON ps."companyId" = p."companyId"
          AND ps."productId" = p."productId"
          ${branchJoinFilter}
        WHERE p."companyId" = CAST(${companyId} AS uuid)
          AND p."deletedAt" IS NULL
          AND p."minStock" > 0
        GROUP BY p."productId", p."minStock"
        HAVING COALESCE(SUM(ps."quantity"), 0) <= p."minStock"
      ) AS low_stock
    `)) as Array<{ count: bigint | number | string }>;

    const rows = (await this.prisma.client.$queryRaw(Prisma.sql`
      SELECT
        p."productId" AS "productId",
        p."name" AS "name",
        p."category" AS "category",
        p."minStock" AS "minStock",
        COALESCE(SUM(ps."quantity"), 0) AS "quantity",
        MAX(ps."updatedAt") AS "updatedAt"
      FROM "Product" p
      LEFT JOIN "ProductStock" ps
        ON ps."companyId" = p."companyId"
        AND ps."productId" = p."productId"
        ${branchJoinFilter}
      WHERE p."companyId" = CAST(${companyId} AS uuid)
        AND p."deletedAt" IS NULL
        AND p."minStock" > 0
      GROUP BY p."productId", p."name", p."category", p."minStock"
      HAVING COALESCE(SUM(ps."quantity"), 0) <= p."minStock"
      ORDER BY (p."minStock" - COALESCE(SUM(ps."quantity"), 0)) DESC, p."productId" ASC
      OFFSET ${skip}
      LIMIT ${take}
    `)) as Array<{
      productId: string;
      name: string;
      category: string;
      minStock: Prisma.Decimal;
      quantity: Prisma.Decimal;
      updatedAt: Date | null;
    }>;

    const items = rows.map((row: {
      productId: string;
      name: string;
      category: string;
      minStock: Prisma.Decimal;
      quantity: Prisma.Decimal;
      updatedAt: Date | null;
    }) => ({
      productId: row.productId,
      name: row.name,
      category: row.category,
      minStock: Number(row.minStock),
      quantity: Number(row.quantity),
      isLowStock: true,
      updatedAt: row.updatedAt,
      branchId: effectiveBranchId ?? null,
    }));

    const total = Number(countRows[0]?.count ?? 0);
    return toPaginatedResult(items, page, limit, total);
  }
}
