import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import {
  getEmailDomain,
  isValidDomainSyntax,
  normalizeEmailDomain,
  compliesWithCompanyDomainPolicy,
  sanitizeCompanyNameToSlug,
} from '../../common/utils/company-domain.utils';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
        branch: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async listCompanyUsers(companyId: string) {
    return this.prisma.client.user.findMany({
      where: { companyId, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        branchId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createCompanyUser(companyId: string, dto: CreateCompanyUserDto) {
    const company = await this.prisma.client.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true, name: true, emailDomain: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const localPart = sanitizeCompanyNameToSlug(dto.username);
    const expectedDomain = normalizeEmailDomain(company.emailDomain, company.name);
    const email = `${localPart}@${expectedDomain}`;

    if (!isValidDomainSyntax(expectedDomain)) {
      throw new BadRequestException('Dominio de empresa invalido. Contacta al administrador.');
    }

    if (!compliesWithCompanyDomainPolicy(expectedDomain, company.name)) {
      throw new BadRequestException('El dominio configurado no cumple la politica corporativa.');
    }

    if (getEmailDomain(email) !== expectedDomain) {
      throw new BadRequestException(`El correo debe usar el dominio @${expectedDomain}`);
    }

    if (dto.branchId) {
      const branch = await this.prisma.client.branch.findFirst({
        where: { id: dto.branchId, companyId, deletedAt: null },
        select: { id: true },
      });

      if (!branch) {
        throw new BadRequestException('La sucursal seleccionada no pertenece a tu empresa');
      }
    }

    const existingUser = await this.prisma.client.user.findFirst({
      where: { email, deletedAt: null },
      select: { email: true },
    });

    if (existingUser) {
      const suggestion = await this.suggestNextAvailableEmail(localPart, expectedDomain);
      throw new ConflictException(
        `No se pudo crear el usuario porque el correo ya esta en uso. Registra un nombre alternativo, por ejemplo ${suggestion}.`
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const role = dto.role ?? 'employee';

    const created = await this.prisma.client.user.create({
      data: {
        email,
        passwordHash,
        companyId,
        branchId: dto.branchId,
        role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        branchId: true,
        createdAt: true,
      },
    });

    return {
      ...created,
      passwordAssigned: true,
    };
  }

  private async suggestNextAvailableEmail(localPart: string, domain: string) {
    for (let i = 1; i <= 1000; i += 1) {
      const candidate = `${localPart}${i}@${domain}`;
      const exists = await this.prisma.client.user.findFirst({
        where: { email: candidate, deletedAt: null },
        select: { id: true },
      });
      if (!exists) {
        return candidate;
      }
    }

    return `${localPart}${Date.now()}@${domain}`;
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Contraseña actualizada con éxito' };
  }
}
