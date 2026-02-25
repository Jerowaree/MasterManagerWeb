import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto) {
    return this.prisma.client.customer.create({
      data: createCustomerDto,
    });
  }

  async findAll() {
    return this.prisma.client.customer.findMany({
      where: { deletedAt: null },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.client.customer.findUnique({
      where: { id },
    });
    if (!customer) throw new NotFoundException(`Cliente con ID ${id} no encontrado.`);
    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    return this.prisma.client.customer.update({
      where: { id },
      data: updateCustomerDto,
    });
  }

  async remove(id: string) {
    return this.prisma.client.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
