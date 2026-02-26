import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { tenantStorage } from '../../common/store/tenant.store';
import {
  ActorContext,
  assertActorBranchScope,
  resolveActorBranchFilter,
} from '../../common/utils/branch-access.utils';

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

    const productId = createMovementDto.productId.trim();

    return this.prisma.client.$transaction(async (tx: any) => {
      return tenantStorage.run({ companyId }, async () => {
        const movement = await tx.inventoryMovement.create({
          data: {
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

  async findAll(actor: ActorContext) {
    const branchId = resolveActorBranchFilter(actor);

    return this.prisma.client.inventoryMovement.findMany({
      include: {
        branch: true,
      },
      where: {
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
      },
    });
  }

  async findByProduct(productId: string, actor: ActorContext) {
    const branchId = resolveActorBranchFilter(actor);

    return this.prisma.client.inventoryMovement.findMany({
      where: {
        productId: productId.trim(),
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStock(productId: string, branchId: string | undefined, actor: ActorContext) {
    const companyId = this.resolveCompanyId(actor);
    const effectiveBranchId = resolveActorBranchFilter(actor, branchId);
    const normalizedProductId = productId.trim();

    if (effectiveBranchId) {
      await this.ensureBranchBelongsToCompany(companyId, effectiveBranchId);

      const snapshot = await this.prisma.client.productStock.findFirst({
        where: {
          productId: normalizedProductId,
          branchId: effectiveBranchId,
        },
        select: { quantity: true },
      });

      return Number(snapshot?.quantity ?? 0);
    }

    const total = await this.prisma.client.productStock.aggregate({
      _sum: { quantity: true },
      where: { productId: normalizedProductId },
    });

    return Number(total._sum.quantity ?? 0);
  }

  async listProducts(branchId: string | undefined, actor: ActorContext) {
    const companyId = this.resolveCompanyId(actor);
    const effectiveBranchId = resolveActorBranchFilter(actor, branchId);

    if (effectiveBranchId) {
      await this.ensureBranchBelongsToCompany(companyId, effectiveBranchId);
    }

    const where: Record<string, unknown> = {
      quantity: { gt: 0 },
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    };

    const snapshots = await this.prisma.client.productStock.findMany({
      where,
      select: {
        productId: true,
        branchId: true,
        quantity: true,
        updatedAt: true,
      },
      orderBy: [{ productId: 'asc' }, { updatedAt: 'desc' }],
    });

    const movements = await this.prisma.client.inventoryMovement.findMany({
      where: {
        type: 'IN',
        productId: { in: snapshots.map((snapshot: { productId: string }) => snapshot.productId) },
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      },
      select: {
        productId: true,
        branchId: true,
        unitCost: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    const latestCostByProductBranch = new Map<string, number>();
    for (const movement of movements) {
      const key = `${movement.branchId}::${movement.productId}`;
      if (!latestCostByProductBranch.has(key)) {
        latestCostByProductBranch.set(key, Number(movement.unitCost));
      }
    }

    return snapshots.map((item: { productId: string; branchId: string; quantity: number; updatedAt: Date }) => ({
      productId: item.productId,
      branchId: item.branchId,
      quantity: Number(item.quantity),
      unitCost: latestCostByProductBranch.get(`${item.branchId}::${item.productId}`) ?? 0,
      updatedAt: item.updatedAt,
    }));
  }
}
