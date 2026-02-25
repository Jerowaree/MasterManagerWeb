import { Controller, Get, Post, Body, Req, UseGuards, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner', 'admin', 'superadmin')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  getDashboard(@Req() req: any) {
    return this.reportsService.getDashboardSummary(req.user.companyId);
  }

  @Get('cash-closing')
  getCashClosing(@Req() req: any, @Query('branchId') branchId?: string) {
    return this.reportsService.getCashClosing(req.user.companyId, branchId);
  }

  @Get('inventory-valorization')
  getInventoryValorization(@Req() req: any, @Query('branchId') branchId?: string) {
    return this.reportsService.getInventoryValorization(req.user.companyId, branchId);
  }

  @Post('email-report')
  sendEmailReport(@Body() body: { type: 'sales' | 'inventory' }, @Req() req: any) {
    // req.user comes from JwtAuthGuard
    const userEmail = req.user.email;
    return this.reportsService.sendReportByEmail(req.user.companyId, userEmail, body.type);
  }
}
