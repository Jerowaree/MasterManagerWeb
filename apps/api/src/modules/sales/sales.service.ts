import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SaleStatus } from '../../common/types/enums';
import { tenantStorage } from '../../common/store/tenant.store';
import {
  ActorContext,
  assertActorBranchScope,
  resolveActorBranchFilter,
} from '../../common/utils/branch-access.utils';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { resolvePagination, toPaginatedResult } from '../../common/utils/pagination.utils';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);
  private readonly idempotencyTtlMinutes = Number(
    process.env.IDEMPOTENCY_TTL_MINUTES ?? '1440'
  );

  constructor(private prisma: PrismaService) {}

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map((v) => this.stableStringify(v)).join(',')}]`;
    }
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return `{${entries
      .map(([k, v]) => `${JSON.stringify(k)}:${this.stableStringify(v)}`)
      .join(',')}}`;
  }

  private computeRequestHash(payload: unknown) {
    const raw = this.stableStringify(payload);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private resolveIdempotencyCutoff(now: Date) {
    return new Date(now.getTime() - this.idempotencyTtlMinutes * 60 * 1000);
  }

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

  async create(
    createSaleDto: CreateSaleDto,
    actor: ActorContext,
    idempotencyKey?: string
  ) {
    const companyId = this.resolveCompanyId(actor);
    assertActorBranchScope(actor, createSaleDto.branchId);

    const normalizedIdempotencyKey = idempotencyKey?.trim();
    const effectiveStatus = createSaleDto.status ?? SaleStatus.PAID;
    const requestHash = this.computeRequestHash({
      branchId: createSaleDto.branchId,
      customerId: createSaleDto.customerId ?? null,
      status: effectiveStatus,
      total: createSaleDto.total ?? null,
      items: (createSaleDto.items ?? []).map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
    });
    const now = new Date();
    const cutoff = this.resolveIdempotencyCutoff(now);

    if (normalizedIdempotencyKey) {
      const existing = await this.prisma.client.sale.findFirst({
        where: {
          companyId,
          idempotencyKey: normalizedIdempotencyKey,
          deletedAt: null,
        },
        include: { items: true, customer: true, branch: true },
      });

      if (existing) {
        if (existing.idempotencyHash && existing.idempotencyHash !== requestHash) {
          this.logger.warn(
            `idempotency_mismatch company=${companyId} key=${normalizedIdempotencyKey}`
          );
          throw new ConflictException(
            'La idempotency-key ya fue usada con un payload distinto'
          );
        }

        if (existing.createdAt < cutoff) {
          this.logger.warn(
            `idempotency_expired company=${companyId} key=${normalizedIdempotencyKey}`
          );
          throw new ConflictException(
            `La idempotency-key expiro (TTL ${this.idempotencyTtlMinutes} min). Usa una nueva.`
          );
        }

        await this.prisma.client.sale.update({
          where: { id: existing.id },
          data: {
            idempotencyReplayCount: { increment: 1 },
            idempotencyLastSeenAt: now,
          },
        });
        this.logger.log(
          `idempotency_replay company=${companyId} key=${normalizedIdempotencyKey} saleId=${existing.id}`
        );
        return existing;
      }
    }

    const branch = await this.prisma.client.branch.findFirst({
      where: {
        id: createSaleDto.branchId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada para tu empresa');
    }

    if (createSaleDto.customerId) {
      const customer = await this.prisma.client.customer.findFirst({
        where: {
          id: createSaleDto.customerId,
          companyId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!customer) {
        throw new NotFoundException('Cliente no encontrado para tu empresa');
      }
    }

    const sanitizedItems = (createSaleDto.items ?? []).map((item) => ({
      productId: item.productId.trim(),
      quantity: Number(item.quantity),
    }));

    for (const item of sanitizedItems) {
      if (!item.productId || item.quantity <= 0) {
        throw new BadRequestException('Hay items de venta invalidos');
      }
    }

    return this.prisma.client.$transaction(async (tx: typeof this.prisma.client) => {
      return tenantStorage.run({ companyId }, async () => {
        const requestedByProduct = sanitizedItems.reduce((acc, item) => {
          acc.set(item.productId, (acc.get(item.productId) ?? 0) + item.quantity);
          return acc;
        }, new Map<string, number>());

        const productIds = [...requestedByProduct.keys()];
        const availableByProduct = new Map<string, number>();
        const priceByProduct = new Map<string, number>();

        if (productIds.length > 0) {
          const products = await tx.product.findMany({
            where: {
              companyId,
              productId: { in: productIds },
              deletedAt: null,
            },
            select: { productId: true, price: true },
          });

          products.forEach((product: { productId: string; price: number }) => {
            priceByProduct.set(product.productId, Number(product.price));
          });

          for (const productId of productIds) {
            if (!priceByProduct.has(productId)) {
              throw new NotFoundException(`Producto no encontrado en catalogo: ${productId}`);
            }
          }

          const snapshots = await tx.productStock.findMany({
            where: {
              companyId,
              branchId: createSaleDto.branchId,
              productId: { in: productIds },
            },
            select: { productId: true, quantity: true },
          });

          snapshots.forEach((s: { productId: string; quantity: number }) => {
            availableByProduct.set(s.productId, Number(s.quantity));
          });
        }

        const pricedItems = sanitizedItems.map((item) => {
          const unitPrice = priceByProduct.get(item.productId);
          if (!Number.isFinite(unitPrice)) {
            throw new NotFoundException(`Precio no configurado para ${item.productId}`);
          }
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: Number(unitPrice),
          };
        });

        const computedTotal = pricedItems.reduce(
          (acc, item) => acc + item.quantity * item.unitPrice,
          0,
        );

        if (createSaleDto.total && pricedItems.length > 0) {
          const diff = Math.abs(Number(createSaleDto.total) - computedTotal);
          if (diff > 0.01) {
            throw new BadRequestException(
              'El total enviado no coincide con el total oficial del catalogo de productos',
            );
          }
        }

        const effectiveTotal =
          pricedItems.length > 0 ? computedTotal : Number(createSaleDto.total ?? 0);
        if (effectiveTotal <= 0) {
          throw new BadRequestException('Debes enviar un total mayor a cero o items validos');
        }

        if (effectiveStatus === SaleStatus.PAID) {
          for (const [productId, requestedQty] of requestedByProduct.entries()) {
            const decremented = await tx.productStock.updateMany({
              where: {
                companyId,
                branchId: createSaleDto.branchId,
                productId,
                quantity: { gte: requestedQty },
              },
              data: {
                quantity: { decrement: requestedQty },
              },
            });

            if (decremented.count === 0) {
              const available = availableByProduct.get(productId) ?? 0;
              throw new BadRequestException(
                `Stock insuficiente para ${productId}. Disponible: ${available}`
              );
            }
          }
        }

        try {
          const sale = await tx.sale.create({
          data: {
            branchId: createSaleDto.branchId,
            customerId: createSaleDto.customerId,
            total: effectiveTotal,
            status: effectiveStatus,
            idempotencyKey: normalizedIdempotencyKey || null,
            idempotencyHash: normalizedIdempotencyKey ? requestHash : null,
            idempotencyFirstSeenAt: normalizedIdempotencyKey ? now : null,
            idempotencyLastSeenAt: normalizedIdempotencyKey ? now : null,
            items:
              pricedItems.length > 0
                ? {
                    create: pricedItems.map((item) => ({
                      companyId,
                      productId: item.productId,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice,
                    })),
                  }
                : undefined,
          },
          include: { items: true, customer: true, branch: true },
        });

          if (pricedItems.length > 0 && effectiveStatus === SaleStatus.PAID) {
            for (const item of pricedItems) {
              await tx.inventoryMovement.create({
                data: {
                  branchId: createSaleDto.branchId,
                  productId: item.productId,
                  type: 'OUT',
                  quantity: item.quantity,
                  unitCost: item.unitPrice,
                },
              });
            }
          }

          return sale;
        } catch (error: unknown) {
          const errorCode = (error as { code?: string })?.code;
          if (normalizedIdempotencyKey && errorCode === 'P2002') {
            const existing = await tx.sale.findFirst({
              where: {
                companyId,
                idempotencyKey: normalizedIdempotencyKey,
                deletedAt: null,
              },
              include: { items: true, customer: true, branch: true },
            });
            if (existing) {
              if (existing.idempotencyHash && existing.idempotencyHash !== requestHash) {
                throw new ConflictException(
                  'La idempotency-key ya fue usada con un payload distinto'
                );
              }
              if (existing.createdAt < cutoff) {
                throw new ConflictException(
                  `La idempotency-key expiro (TTL ${this.idempotencyTtlMinutes} min). Usa una nueva.`
                );
              }
              await tx.sale.update({
                where: { id: existing.id },
                data: {
                  idempotencyReplayCount: { increment: 1 },
                  idempotencyLastSeenAt: now,
                },
              });
              this.logger.log(
                `idempotency_replay_race company=${companyId} key=${normalizedIdempotencyKey} saleId=${existing.id}`
              );
              return existing;
            }
          }

          if (errorCode === 'P2002') {
            throw new ConflictException('Conflicto de venta duplicada');
          }
          throw error;
        }
      });
    });
  }

  async findAll(actor: ActorContext, pagination: PaginationQueryDto) {
    const branchId = resolveActorBranchFilter(actor);
    const { page, limit, skip, take } = resolvePagination(pagination);
    const where = {
      deletedAt: null,
      ...(branchId ? { branchId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.sale.findMany({
        include: {
          customer: true,
          branch: true,
          items: true,
        },
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.client.sale.count({ where }),
    ]);

    return toPaginatedResult(items, page, limit, total);
  }

  async findOne(id: string, actor: ActorContext) {
    const branchId = resolveActorBranchFilter(actor);

    const sale = await this.prisma.client.sale.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        customer: true,
        branch: true,
        items: true,
      },
    });

    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }

    return sale;
  }

  async update(id: string, updateSaleDto: UpdateSaleDto, actor: ActorContext) {
    await this.findOne(id, actor);

    if (updateSaleDto.items !== undefined || updateSaleDto.total !== undefined) {
      throw new BadRequestException('No se permite editar items o total de una venta existente');
    }

    if (updateSaleDto.branchId !== undefined || updateSaleDto.customerId !== undefined) {
      throw new BadRequestException(
        'No se permite editar sucursal o cliente de una venta existente',
      );
    }

    try {
      return await this.prisma.client.sale.update({
        where: { id },
        data: {
          ...(updateSaleDto.status !== undefined ? { status: updateSaleDto.status } : {}),
        },
      });
    } catch (error: unknown) {
      const errorCode = (error as { code?: string })?.code;
      if (errorCode === 'P2025') {
        throw new NotFoundException('Venta no encontrada');
      }
      throw error;
    }
  }

  async remove(id: string, actor: ActorContext) {
    await this.findOne(id, actor);

    try {
      return await this.prisma.client.sale.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error: unknown) {
      const errorCode = (error as { code?: string })?.code;
      if (errorCode === 'P2025') {
        throw new NotFoundException('Venta no encontrada');
      }
      throw error;
    }
  }
}
