import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(createBranchDto: CreateBranchDto) {
    return this.prisma.client.branch.create({
      data: createBranchDto,
    });
  }

  async findAll() {
    return this.prisma.client.branch.findMany({
      where: { deletedAt: null },
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.client.branch.findUnique({
      where: { id },
    });
    if (!branch) throw new NotFoundException(`Sede con ID ${id} no encontrada.`);
    return branch;
  }

  async update(id: string, updateBranchDto: UpdateBranchDto) {
    return this.prisma.client.branch.update({
      where: { id },
      data: updateBranchDto,
    });
  }

  async remove(id: string) {
    return this.prisma.client.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
