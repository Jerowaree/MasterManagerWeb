import { Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { AllowedCountries } from '../../common/decorators/allowed-countries.decorator';
import { CountryFeatureGuard } from '../../common/guards/country-feature.guard';
import { SunatService } from './sunat.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Controller('peru/sunat')
@UseGuards(JwtAuthGuard, SubscriptionGuard, RolesGuard, CountryFeatureGuard)
@AllowedCountries('PE')
export class PeruController {
  constructor(private readonly sunatService: SunatService) {}

  @Get('status')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  getStatus(@Request() req: any) {
    return this.sunatService.getStatus(req.user);
  }

  @Post('sales/:saleId/issue')
  @Roles('owner', 'admin', 'superadmin')
  issueSaleDocument(@Param('saleId') saleId: string, @Request() req: any) {
    return this.sunatService.issueForSale(saleId, req.user);
  }

  @Get('documents')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  listDocuments(@Request() req: any, @Query() pagination: PaginationQueryDto) {
    return this.sunatService.listDocuments(req.user, pagination);
  }
}
