import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { resolvePagination, toPaginatedResult } from '../../common/utils/pagination.utils';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(createBranchDto: CreateBranchDto) {
    const data = {
      name: createBranchDto.name.trim(),
      timezone: createBranchDto.timezone.trim(),
      address: createBranchDto.address?.trim() || null,
      latitude: createBranchDto.latitude ?? null,
      longitude: createBranchDto.longitude ?? null,
    };

    return this.prisma.client.branch.create({
      data,
    });
  }

  async findAll(pagination: PaginationQueryDto) {
    const { page, limit, skip, take } = resolvePagination(pagination);
    const where = { deletedAt: null };

    const [items, total] = await Promise.all([
      this.prisma.client.branch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.client.branch.count({ where }),
    ]);

    return toPaginatedResult(items, page, limit, total);
  }

  async findOne(id: string) {
    const branch = await this.prisma.client.branch.findUnique({
      where: { id },
    });
    if (!branch) throw new NotFoundException(`Sede con ID ${id} no encontrada.`);
    return branch;
  }

  async update(id: string, updateBranchDto: UpdateBranchDto) {
    const data = {
      ...(updateBranchDto.name !== undefined ? { name: updateBranchDto.name.trim() } : {}),
      ...(updateBranchDto.timezone !== undefined ? { timezone: updateBranchDto.timezone.trim() } : {}),
      ...(updateBranchDto.address !== undefined ? { address: updateBranchDto.address?.trim() || null } : {}),
      ...(updateBranchDto.latitude !== undefined ? { latitude: updateBranchDto.latitude } : {}),
      ...(updateBranchDto.longitude !== undefined ? { longitude: updateBranchDto.longitude } : {}),
    };

    return this.prisma.client.branch.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.client.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
