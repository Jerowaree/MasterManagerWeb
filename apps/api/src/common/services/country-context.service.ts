import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';

type CountryCacheEntry = {
  value: string;
  expiresAt: number;
};

@Injectable()
export class CountryContextService {
  private readonly ttlMs = Number(process.env.COUNTRY_CONTEXT_TTL_MS ?? '300000');
  private readonly cache = new Map<string, CountryCacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  private normalizeCountry(value?: string | null) {
    return (value ?? '').trim().toUpperCase();
  }

  private getCached(companyId: string) {
    const entry = this.cache.get(companyId);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(companyId);
      return null;
    }
    return entry.value;
  }

  async getCompanyCountry(companyId: string) {
    const cached = this.getCached(companyId);
    if (cached) return cached;

    const company = await this.prisma.client.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
      },
      select: {
        country: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const country = this.normalizeCountry(company.country);
    this.cache.set(companyId, {
      value: country,
      expiresAt: Date.now() + this.ttlMs,
    });

    return country;
  }

  invalidateCompany(companyId: string) {
    this.cache.delete(companyId);
  }
}
