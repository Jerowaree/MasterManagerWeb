import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ActorContext } from '../../common/utils/branch-access.utils';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { resolvePagination, toPaginatedResult } from '../../common/utils/pagination.utils';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSupplierDto, actor: ActorContext) {
    if (!actor.companyId) {
      throw new BadRequestException('Usuario autenticado sin contexto de empresa');
    }

    const tags = (dto.tags ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0);
    const normalizedStatus = dto.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active';
    const normalizedPaymentCondition = dto.paymentCondition?.toLowerCase() === 'credit' ? 'credit' : 'cash';

    return this.prisma.client.supplier.create({
      data: {
        name: dto.name.trim(),
        tradeName: dto.tradeName?.trim(),
        documentType: dto.documentType?.trim(),
        documentNumber: dto.documentNumber?.trim(),
        ruc: dto.ruc?.trim(),
        status: normalizedStatus,
        isRetentionAgent: dto.isRetentionAgent ?? false,
        appliesDetraction: dto.appliesDetraction ?? false,
        taxRegime: dto.taxRegime?.trim(),
        phone: dto.phone?.trim(),
        email: dto.email?.trim().toLowerCase(),
        address: dto.address?.trim(),
        department: dto.department?.trim(),
        province: dto.province?.trim(),
        district: dto.district?.trim(),
        paymentCondition: normalizedPaymentCondition,
        creditDays: normalizedPaymentCondition === 'credit' ? dto.creditDays ?? 0 : 0,
        currency: dto.currency?.trim().toUpperCase() ?? 'PEN',
        bankName: dto.bankName?.trim(),
        bankAccountNumber: dto.bankAccountNumber?.trim(),
        bankCci: dto.bankCci?.trim(),
        bankAccountType: dto.bankAccountType?.trim(),
        category: dto.category?.trim(),
        tags,
      },
    });
  }

  async findAll(actor: ActorContext, pagination: PaginationQueryDto) {
    if (!actor.companyId) {
      throw new BadRequestException('Usuario autenticado sin contexto de empresa');
    }

    const { page, limit, skip, take } = resolvePagination(pagination);
    const where = { deletedAt: null };

    const [items, total] = await Promise.all([
      this.prisma.client.supplier.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.client.supplier.count({ where }),
    ]);

    return toPaginatedResult(items, page, limit, total);
  }
}
