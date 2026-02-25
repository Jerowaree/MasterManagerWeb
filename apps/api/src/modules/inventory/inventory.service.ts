import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { InventoryMovement } from '@master-manager/database';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async createMovement(createMovementDto: CreateMovementDto) {
    return this.prisma.client.inventoryMovement.create({
      data: createMovementDto,
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
    const movements = await this.prisma.client.inventoryMovement.findMany({
      where: { 
        productId, 
        branchId,
        deletedAt: null 
      },
    });

    return movements.reduce((acc: number, mov: InventoryMovement) => {
      const quantity = Number(mov.quantity);
      if (mov.type === 'IN') return acc + quantity;
      if (mov.type === 'OUT') return acc - quantity;
      return acc;
    }, 0);
  }
}
