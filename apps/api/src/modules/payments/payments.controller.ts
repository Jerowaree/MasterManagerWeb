import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaymentsService } from './payments.service';
import { PayPlanDto } from './dto/pay-plan.dto';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    id: string;
    companyId: string;
    role: string;
    branchId?: string | null;
  };
};

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('plans')
  @Roles('owner', 'admin', 'superadmin')
  listPlans(@Request() req: AuthenticatedRequest) {
    return this.paymentsService.listPlans(req.user);
  }

  @Post('pay-plan')
  @Roles('owner', 'superadmin')
  payPlan(@Body() dto: PayPlanDto, @Request() req: AuthenticatedRequest) {
    return this.paymentsService.payPlan(dto, req.user);
  }
}
