import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(createSaleDto: CreateSaleDto) {
    return this.prisma.client.sale.create({
      data: createSaleDto,
    });
  }

  async findAll() {
    return this.prisma.client.sale.findMany({
      include: {
        customer: true,
        branch: true,
      },
      where: { deletedAt: null },
    });
  }

  async findOne(id: string) {
    return this.prisma.client.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
      },
    });
  }

  async update(id: string, updateSaleDto: UpdateSaleDto) {
    return this.prisma.client.sale.update({
      where: { id },
      data: updateSaleDto,
    });
  }

  async remove(id: string) {
    return this.prisma.client.sale.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
