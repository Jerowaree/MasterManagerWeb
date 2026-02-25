import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';
import * as bcrypt from 'bcrypt';
import {
  getEmailLocalPart,
  isValidDomainSyntax,
  normalizeEmailDomain,
  compliesWithCompanyDomainPolicy,
  sanitizeCompanyNameToSlug,
} from '../../common/utils/company-domain.utils';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentCompany(companyId: string) {
    const company = await this.prisma.client.company.findFirst({
      where: { id: companyId, deletedAt: null },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return company;
  }

  async updateCurrentCompany(companyId: string, actorUserId: string, dto: UpdateCompanySettingsDto) {
    const company = await this.prisma.client.company.findFirst({
      where: { id: companyId, deletedAt: null },
      include: {
        users: {
          where: { deletedAt: null },
          select: { id: true, email: true },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const nextName = dto.name?.trim() || company.name;
    const nextDomain = normalizeEmailDomain(undefined, nextName);

    if (!isValidDomainSyntax(nextDomain)) {
      throw new BadRequestException('El dominio no es valido. Ejemplo: pepito.com');
    }

    const domainWillChange = nextDomain !== company.emailDomain;

    if (domainWillChange) {
      if (!dto.confirmAction) {
        throw new BadRequestException(
          'Debes confirmar explicitamente la accion para cambiar el dominio de correos.'
        );
      }

      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Debes ingresar tu contrasena actual para confirmar el cambio de dominio.'
        );
      }

      const actor = await this.prisma.client.user.findFirst({
        where: { id: actorUserId, companyId, deletedAt: null },
        select: { id: true, passwordHash: true, role: true },
      });

      if (!actor) {
        throw new UnauthorizedException('Usuario autenticado no valido para esta accion');
      }
      if (!['owner', 'superadmin'].includes(actor.role)) {
        throw new UnauthorizedException('Solo owner o superadmin pueden cambiar el dominio');
      }

      const validPassword = await bcrypt.compare(dto.currentPassword, actor.passwordHash);
      if (!validPassword) {
        throw new UnauthorizedException('Contrasena actual incorrecta para confirmar esta accion');
      }
    }

    const nextUsersEmails = company.users.map((user: { id: string; email: string }) => ({
      userId: user.id,
      nextEmail: `${getEmailLocalPart(user.email)}@${nextDomain}`,
    }));

    if (domainWillChange) {
      const emailsToCheck = nextUsersEmails.map((item: { nextEmail: string }) => item.nextEmail);
      const conflictingUsers = await this.prisma.client.user.findMany({
        where: {
          deletedAt: null,
          companyId: { not: companyId },
          email: { in: emailsToCheck },
        },
        select: { email: true },
      });

      if (conflictingUsers.length > 0) {
        const conflictSet = new Set(
          conflictingUsers.map((u: { email: string }) => u.email.toLowerCase())
        );
        const suggestions: string[] = [];

        for (const { nextEmail } of nextUsersEmails) {
          if (!conflictSet.has(nextEmail.toLowerCase())) continue;
          const local = getEmailLocalPart(nextEmail);
          suggestions.push(`${local}1@${nextDomain}`);
        }

        throw new ConflictException(
          `No se puede cambiar el dominio por conflictos de correos existentes en el sistema. Usa alternativas como ${suggestions.join(', ')}.`
        );
      }
    }

    return this.prisma.client.$transaction(async (tx: any) => {
      const updatedCompany = await tx.company.update({
        where: { id: companyId },
        data: {
          name: nextName,
          emailDomain: nextDomain,
          country: dto.country ?? company.country,
          currency: dto.currency ?? company.currency,
          timezone: dto.timezone ?? company.timezone,
        },
      });

      if (domainWillChange) {
        for (const updateItem of nextUsersEmails) {
          await tx.user.update({
            where: { id: updateItem.userId },
            data: { email: updateItem.nextEmail },
          });
        }
      }

      return {
        ...updatedCompany,
        suggestedSlug: sanitizeCompanyNameToSlug(nextName),
      };
    });
  }
}
