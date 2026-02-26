import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ALLOWED_COUNTRIES_KEY,
} from '../decorators/allowed-countries.decorator';
import { CountryContextService } from '../services/country-context.service';

@Injectable()
export class CountryFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly countryContext: CountryContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowedCountries = this.reflector.getAllAndOverride<string[]>(
      ALLOWED_COUNTRIES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!allowedCountries || allowedCountries.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const companyId = request?.user?.companyId as string | undefined;
    if (!companyId) {
      throw new ForbiddenException('No se pudo resolver la empresa para esta operacion');
    }

    const country = await this.countryContext.getCompanyCountry(companyId);
    if (!allowedCountries.includes(country)) {
      throw new ForbiddenException(
        `Esta funcionalidad solo esta disponible para: ${allowedCountries.join(', ')}`,
      );
    }

    return true;
  }
}
