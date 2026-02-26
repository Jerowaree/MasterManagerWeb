import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import {
  ActorContext,
  assertActorBranchScope,
  isBranchScopedRole,
} from '../../common/utils/branch-access.utils';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  private async ensureBranchBelongsToCompany(companyId: string, branchId: string) {
    const branch = await this.prisma.client.branch.findFirst({
      where: { id: branchId, companyId, deletedAt: null },
      select: { id: true },
    });

    if (!branch) {
      throw new BadRequestException('La sucursal seleccionada no pertenece a tu empresa');
    }
  }

  async create(createCustomerDto: CreateCustomerDto, actor: ActorContext) {
    assertActorBranchScope(actor, createCustomerDto.branchId);
    await this.ensureBranchBelongsToCompany(actor.companyId, createCustomerDto.branchId);

    return this.prisma.client.customer.create({
      data: {
        ...createCustomerDto,
        name: createCustomerDto.name.trim(),
        documentType: createCustomerDto.documentType.trim(),
        documentNumber: createCustomerDto.documentNumber.trim(),
        phone: createCustomerDto.phone?.trim(),
        email: createCustomerDto.email?.trim().toLowerCase(),
        address: createCustomerDto.address?.trim(),
      },
    });
  }

  async findAll(actor: ActorContext) {
    if (isBranchScopedRole(actor.role) && !actor.branchId) {
      throw new BadRequestException('El usuario no tiene una sucursal asignada');
    }

    return this.prisma.client.customer.findMany({
      where: {
        deletedAt: null,
        ...(isBranchScopedRole(actor.role) ? { branchId: actor.branchId! } : {}),
      },
    });
  }

  async findOne(id: string, actor: ActorContext) {
    if (isBranchScopedRole(actor.role) && !actor.branchId) {
      throw new BadRequestException('El usuario no tiene una sucursal asignada');
    }

    const customer = await this.prisma.client.customer.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(isBranchScopedRole(actor.role) ? { branchId: actor.branchId! } : {}),
      },
    });

    if (!customer) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado.`);
    }

    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto, actor: ActorContext) {
    const current = await this.findOne(id, actor);

    if (updateCustomerDto.branchId !== undefined) {
      assertActorBranchScope(actor, updateCustomerDto.branchId);
      await this.ensureBranchBelongsToCompany(actor.companyId, updateCustomerDto.branchId);
    } else {
      assertActorBranchScope(actor, current.branchId);
    }

    return this.prisma.client.customer.update({
      where: { id },
      data: {
        ...(updateCustomerDto.branchId !== undefined ? { branchId: updateCustomerDto.branchId } : {}),
        ...(updateCustomerDto.name !== undefined ? { name: updateCustomerDto.name.trim() } : {}),
        ...(updateCustomerDto.documentType !== undefined
          ? { documentType: updateCustomerDto.documentType.trim() }
          : {}),
        ...(updateCustomerDto.documentNumber !== undefined
          ? { documentNumber: updateCustomerDto.documentNumber.trim() }
          : {}),
        ...(updateCustomerDto.phone !== undefined ? { phone: updateCustomerDto.phone?.trim() } : {}),
        ...(updateCustomerDto.email !== undefined
          ? { email: updateCustomerDto.email?.trim().toLowerCase() }
          : {}),
        ...(updateCustomerDto.address !== undefined ? { address: updateCustomerDto.address?.trim() } : {}),
      },
    });
  }

  async remove(id: string, actor: ActorContext) {
    await this.findOne(id, actor);

    return this.prisma.client.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
