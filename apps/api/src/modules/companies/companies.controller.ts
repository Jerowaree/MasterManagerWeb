import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('me')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  getMe(@Req() req: any) {
    return this.companiesService.getCurrentCompany(req.user.companyId);
  }

  @Patch('me')
  @Roles('owner', 'admin', 'superadmin')
  updateMe(@Req() req: any, @Body() dto: UpdateCompanySettingsDto) {
    return this.companiesService.updateCurrentCompany(req.user.companyId, dto);
  }
}
