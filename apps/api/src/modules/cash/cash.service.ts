import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { BranchPaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { resolvePagination, toPaginatedResult } from '../../common/utils/pagination.utils';
import {
  ActorContext,
  assertActorBranchScope,
  resolveActorBranchFilter,
} from '../../common/utils/branch-access.utils';
import { tenantStorage } from '../../common/store/tenant.store';

@Injectable()
export class CashService {
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

  private getCashMovementModel() {
    const model = this.prisma.client?.cashMovement;
    if (!model) {
      throw new BadRequestException(
        'Modelo CashMovement no disponible. Ejecuta prisma generate y aplica migraciones.'
      );
    }
    return model;
  }

  async create(dto: CreateCashMovementDto, actor: ActorContext) {
    const companyId = this.resolveCompanyId(actor);
    assertActorBranchScope(actor, dto.branchId);
    await this.ensureBranchBelongsToCompany(companyId, dto.branchId);

    const type = dto.type.trim().toUpperCase();
    if (!['IN', 'OUT'].includes(type)) {
      throw new BadRequestException('El tipo debe ser IN o OUT');
    }

    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }

    const cashMovement = this.getCashMovementModel();
    return cashMovement.create({
      data: {
        branchId: dto.branchId,
        type,
        amount,
        description: dto.description?.trim(),
        reference: dto.reference?.trim(),
      },
    });
  }

  async findAll(actor: ActorContext, query: BranchPaginationQueryDto) {
    this.resolveCompanyId(actor);
    const effectiveBranchId = resolveActorBranchFilter(actor, query.branchId);
    const { page, limit, skip, take } = resolvePagination(query);

    if (effectiveBranchId) {
      await this.ensureBranchBelongsToCompany(actor.companyId, effectiveBranchId);
    }

    const where = {
      deletedAt: null,
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    };

    const cashMovement = this.getCashMovementModel();
    const [items, total] = await Promise.all([
      cashMovement.findMany({
        where,
        include: { branch: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      cashMovement.count({ where }),
    ]);

    return toPaginatedResult(items, page, limit, total);
  }
}
