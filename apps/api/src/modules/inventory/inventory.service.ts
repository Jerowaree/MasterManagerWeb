import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { tenantStorage } from '../../common/store/tenant.store';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async createMovement(createMovementDto: CreateMovementDto) {
    const context = tenantStorage.getStore();
    const companyId = context?.companyId;

    if (!companyId) {
      throw new BadRequestException('Contexto de tenant no disponible para crear movimiento');
    }

    const quantity = Number(createMovementDto.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('La cantidad del movimiento debe ser mayor a cero');
    }

    if (createMovementDto.type === 'TRANSFER') {
      throw new BadRequestException('TRANSFER aun no esta soportado en snapshot de stock');
    }

    return this.prisma.client.$transaction(async (tx: any) => {
      return tenantStorage.run({ companyId }, async () => {
        const movement = await tx.inventoryMovement.create({
          data: {
            branchId: createMovementDto.branchId,
            productId: createMovementDto.productId,
            type: createMovementDto.type,
            quantity,
            unitCost: createMovementDto.unitCost,
          },
        });

        if (createMovementDto.type === 'IN') {
          await tx.productStock.upsert({
            where: {
              companyId_branchId_productId: {
                companyId,
                branchId: createMovementDto.branchId,
                productId: createMovementDto.productId,
              },
            },
            create: {
              companyId,
              branchId: createMovementDto.branchId,
              productId: createMovementDto.productId,
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
              productId: createMovementDto.productId,
              quantity: { gte: quantity },
            },
            data: {
              quantity: { decrement: quantity },
            },
          });

          if (decremented.count === 0) {
            throw new BadRequestException(
              `Stock insuficiente para ${createMovementDto.productId} en la sucursal indicada`
            );
          }
        }

        return movement;
      });
    });
  }

  async findAll() {
    return this.prisma.client.inventoryMovement.findMany({
      include: {
        branch: true,
      },
      where: { deletedAt: null },
    });
  }

  async findByProduct(productId: string) {
    return this.prisma.client.inventoryMovement.findMany({
      where: { productId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStock(productId: string, branchId?: string) {
    if (branchId) {
      const snapshot = await this.prisma.client.productStock.findFirst({
        where: {
          productId,
          branchId,
        },
        select: { quantity: true },
      });

      return Number(snapshot?.quantity ?? 0);
    }

    const total = await this.prisma.client.productStock.aggregate({
      _sum: { quantity: true },
      where: { productId },
    });

    return Number(total._sum.quantity ?? 0);
  }
}
