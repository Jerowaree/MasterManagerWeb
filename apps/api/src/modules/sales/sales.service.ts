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

  async create(
    createSaleDto: CreateSaleDto,
    actor: { companyId: string; branchId?: string; role: string },
    idempotencyKey?: string
  ) {
    const normalizedIdempotencyKey = idempotencyKey?.trim();
    const requestHash = this.computeRequestHash({
      branchId: createSaleDto.branchId,
      customerId: createSaleDto.customerId ?? null,
      status: createSaleDto.status,
      total: createSaleDto.total ?? null,
      items: (createSaleDto.items ?? []).map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    });
    const now = new Date();
    const cutoff = this.resolveIdempotencyCutoff(now);

    if (normalizedIdempotencyKey) {
      const existing = await this.prisma.client.sale.findFirst({
        where: {
          companyId: actor.companyId,
          idempotencyKey: normalizedIdempotencyKey,
          deletedAt: null,
        },
        include: { items: true, customer: true, branch: true },
      });

      if (existing) {
        if (existing.idempotencyHash && existing.idempotencyHash !== requestHash) {
          this.logger.warn(
            `idempotency_mismatch company=${actor.companyId} key=${normalizedIdempotencyKey}`
          );
          throw new ConflictException(
            'La idempotency-key ya fue usada con un payload distinto'
          );
        }

        if (existing.createdAt < cutoff) {
          this.logger.warn(
            `idempotency_expired company=${actor.companyId} key=${normalizedIdempotencyKey}`
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
          `idempotency_replay company=${actor.companyId} key=${normalizedIdempotencyKey} saleId=${existing.id}`
        );
        return existing;
      }
    }

    const branch = await this.prisma.client.branch.findFirst({
      where: {
        id: createSaleDto.branchId,
        companyId: actor.companyId,
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
          companyId: actor.companyId,
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
      unitPrice: Number(item.unitPrice),
    }));

    for (const item of sanitizedItems) {
      if (!item.productId || item.quantity <= 0 || item.unitPrice < 0) {
        throw new BadRequestException('Hay items de venta invalidos');
      }
    }

    const computedTotal = sanitizedItems.reduce(
      (acc, item) => acc + item.quantity * item.unitPrice,
      0
    );

    if (createSaleDto.total && sanitizedItems.length > 0) {
      const diff = Math.abs(Number(createSaleDto.total) - computedTotal);
      if (diff > 0.01) {
        throw new BadRequestException('El total enviado no coincide con el detalle de items');
      }
    }

    const effectiveTotal = sanitizedItems.length > 0 ? computedTotal : Number(createSaleDto.total ?? 0);

    if (effectiveTotal <= 0) {
      throw new BadRequestException('Debes enviar un total mayor a cero o items validos');
    }

    return this.prisma.client.$transaction(async (tx: any) => {
      return tenantStorage.run({ companyId: actor.companyId }, async () => {
        if (sanitizedItems.length > 0 && createSaleDto.status === SaleStatus.PAID) {
          const requestedByProduct = sanitizedItems.reduce((acc, item) => {
            acc.set(item.productId, (acc.get(item.productId) ?? 0) + item.quantity);
            return acc;
          }, new Map<string, number>());

          const productIds = [...requestedByProduct.keys()];
          const snapshots = await tx.productStock.findMany({
            where: {
              companyId: actor.companyId,
              branchId: createSaleDto.branchId,
              productId: { in: productIds },
            },
            select: { productId: true, quantity: true },
          });

          const availableByProduct = new Map<string, number>(
            snapshots.map((s: { productId: string; quantity: number }) => [
              s.productId,
              Number(s.quantity),
            ])
          );

          for (const productId of productIds) {
            if (!availableByProduct.has(productId)) {
              throw new NotFoundException(`Producto no encontrado: ${productId}`);
            }
          }

          for (const [productId, requestedQty] of requestedByProduct.entries()) {
            const decremented = await tx.productStock.updateMany({
              where: {
                companyId: actor.companyId,
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
            status: createSaleDto.status ?? SaleStatus.PAID,
            idempotencyKey: normalizedIdempotencyKey || null,
            idempotencyHash: normalizedIdempotencyKey ? requestHash : null,
            idempotencyFirstSeenAt: normalizedIdempotencyKey ? now : null,
            idempotencyLastSeenAt: normalizedIdempotencyKey ? now : null,
            items:
              sanitizedItems.length > 0
                ? {
                    create: sanitizedItems.map((item) => ({
                      companyId: actor.companyId,
                      productId: item.productId,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice,
                    })),
                  }
                : undefined,
          },
          include: { items: true, customer: true, branch: true },
        });

          if (sanitizedItems.length > 0 && sale.status === SaleStatus.PAID) {
            for (const item of sanitizedItems) {
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
        } catch (error: any) {
          if (normalizedIdempotencyKey && error?.code === 'P2002') {
            const existing = await tx.sale.findFirst({
              where: {
                companyId: actor.companyId,
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
                `idempotency_replay_race company=${actor.companyId} key=${normalizedIdempotencyKey} saleId=${existing.id}`
              );
              return existing;
            }
          }

          if (error?.code === 'P2002') {
            throw new ConflictException('Conflicto de venta duplicada');
          }
          throw error;
        }
      });
    });
  }

  async findAll() {
    return this.prisma.client.sale.findMany({
      include: {
        customer: true,
        branch: true,
        items: true,
      },
      where: { deletedAt: null },
    });
  }

  async findOne(id: string) {
    const sale = await this.prisma.client.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        items: true,
      },
    });

    if (!sale || sale.deletedAt) {
      throw new NotFoundException('Venta no encontrada');
    }

    return sale;
  }

  async update(id: string, updateSaleDto: UpdateSaleDto) {
    try {
      return await this.prisma.client.sale.update({
        where: { id },
        data: updateSaleDto,
      });
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundException('Venta no encontrada');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.client.sale.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundException('Venta no encontrada');
      }
      throw error;
    }
  }
}
