import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { ElectronicDocumentType } from '@master-manager/database';
import { PrismaService } from '../prisma/prisma.service';
import { CountryContextService } from '../../common/services/country-context.service';
import {
  ActorContext,
  resolveActorBranchFilter,
} from '../../common/utils/branch-access.utils';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { resolvePagination, toPaginatedResult } from '../../common/utils/pagination.utils';
import { SaleStatus } from '../../common/types/enums';

type SunatResponse = {
  status: 'accepted' | 'rejected';
  ticket: string;
  cdrCode: string;
  cdrDescription: string;
  digestValue: string;
};

@Injectable()
export class SunatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly countryContext: CountryContextService,
  ) {}

  private async ensurePeruCompany(companyId: string) {
    const country = await this.countryContext.getCompanyCountry(companyId);
    if (country !== 'PE') {
      throw new BadRequestException('SUNAT solo aplica para empresas con pais PE');
    }
    return country;
  }

  private async generateNextCorrelative(companyId: string, series: string) {
    const latest = await this.prisma.client.electronicDocument.findFirst({
      where: {
        companyId,
        series,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        correlative: true,
      },
    });

    const current = Number(latest?.correlative ?? '0');
    const next = Number.isFinite(current) ? current + 1 : 1;
    return String(next).padStart(8, '0');
  }

  private submitToSunat(payload: Record<string, unknown>): SunatResponse {
    const digestValue = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');

    return {
      status: 'accepted',
      ticket: `SIM-${Date.now()}-${randomUUID().slice(0, 8)}`,
      cdrCode: '0',
      cdrDescription: 'Aceptado en simulacion local',
      digestValue,
    };
  }

  async getStatus(actor: ActorContext) {
    const country = await this.countryContext.getCompanyCountry(actor.companyId);
    return {
      enabled: country === 'PE',
      country,
      provider: 'SUNAT',
      environment: process.env.SUNAT_ENVIRONMENT ?? 'simulation',
    };
  }

  async issueForSale(saleId: string, actor: ActorContext) {
    await this.ensurePeruCompany(actor.companyId);

    const sale = await this.prisma.client.sale.findFirst({
      where: {
        id: saleId,
        companyId: actor.companyId,
        deletedAt: null,
      },
      include: {
        company: true,
        customer: true,
        branch: true,
        items: true,
      },
    });

    if (!sale) {
      throw new NotFoundException('Venta no encontrada para tu empresa');
    }

    if (sale.status !== SaleStatus.PAID) {
      throw new BadRequestException('Solo se puede emitir SUNAT para ventas pagadas');
    }

    const existing = await this.prisma.client.electronicDocument.findFirst({
      where: {
        companyId: actor.companyId,
        saleId: sale.id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (existing && ['pending', 'processing', 'accepted'].includes(existing.status)) {
      return existing;
    }

    const isFactura =
      sale.customer?.documentType?.toUpperCase() === 'RUC' &&
      /^\d{11}$/.test(sale.customer?.documentNumber ?? '');

    const documentType: ElectronicDocumentType = isFactura ? 'factura' : 'boleta';
    const series = isFactura ? 'F001' : 'B001';

    const emitterRuc = process.env.SUNAT_EMITTER_RUC?.trim();
    if (!emitterRuc) {
      throw new BadRequestException(
        'Falta configurar SUNAT_EMITTER_RUC en variables de entorno',
      );
    }

    let createdDocument: {
      id: string;
      correlative: string;
      status: string;
    } | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const correlative = await this.generateNextCorrelative(actor.companyId, series);

      try {
        createdDocument = await this.prisma.client.electronicDocument.create({
          data: {
            saleId: sale.id,
            branchId: sale.branchId,
            countryCode: 'PE',
            documentType,
            series,
            correlative,
            status: 'processing',
          },
          select: {
            id: true,
            correlative: true,
            status: true,
          },
        });
        break;
      } catch (error: unknown) {
        const errorCode = (error as { code?: string })?.code;
        if (errorCode === 'P2002') {
          continue;
        }
        throw error;
      }
    }

    if (!createdDocument) {
      throw new ConflictException('No se pudo generar correlativo SUNAT de forma segura');
    }

    const payload = {
      issueDate: new Date().toISOString(),
      emitter: {
        ruc: emitterRuc,
        name: sale.company.name,
      },
      sale: {
        id: sale.id,
        total: Number(sale.total),
        currency: sale.company.currency,
      },
      customer: sale.customer
        ? {
            name: sale.customer.name,
            documentType: sale.customer.documentType,
            documentNumber: sale.customer.documentNumber,
          }
        : null,
      items: sale.items.map(
        (item: { productId: string; quantity: number; unitPrice: number }) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        }),
      ),
    };

    const sunatResponse = this.submitToSunat(payload);

    const updated = await this.prisma.client.electronicDocument.update({
      where: { id: createdDocument.id },
      data: {
        status: sunatResponse.status === 'accepted' ? 'accepted' : 'rejected',
        externalId: sunatResponse.ticket,
        digestValue: sunatResponse.digestValue,
        cdrCode: sunatResponse.cdrCode,
        cdrDescription: sunatResponse.cdrDescription,
        payload,
        response: sunatResponse,
        issuedAt: new Date(),
      },
    });

    return updated;
  }

  async listDocuments(actor: ActorContext, pagination: PaginationQueryDto) {
    await this.ensurePeruCompany(actor.companyId);
    const branchId = resolveActorBranchFilter(actor);
    const { page, limit, skip, take } = resolvePagination(pagination);

    const where = {
      deletedAt: null,
      ...(branchId ? { branchId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.electronicDocument.findMany({
        where,
        include: {
          sale: {
            select: {
              id: true,
              total: true,
              status: true,
              createdAt: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),
      this.prisma.client.electronicDocument.count({ where }),
    ]);

    return toPaginatedResult(items, page, limit, total);
  }
}
