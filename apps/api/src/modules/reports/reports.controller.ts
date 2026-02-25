import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  getDashboard() {
    return this.reportsService.getDashboardSummary();
  }

  @Get('cash-closing')
  getCashClosing() {
    return this.reportsService.getCashClosing();
  }

  @Get('inventory-valorization')
  getInventoryValorization() {
    return this.reportsService.getInventoryValorization();
  }

  @Post('email-report')
  sendEmailReport(@Body() body: { type: 'sales' | 'inventory' }, @Req() req: any) {
    // req.user comes from JwtAuthGuard
    const userEmail = req.user.email;
    return this.reportsService.sendReportByEmail(userEmail, body.type);
  }
}
