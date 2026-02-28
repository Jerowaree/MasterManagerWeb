import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { CashService } from './cash.service';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { BranchPaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Controller('cash')
@UseGuards(JwtAuthGuard, SubscriptionGuard, RolesGuard)
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Post()
  @Roles('owner', 'admin', 'employee', 'superadmin')
  create(@Body() dto: CreateCashMovementDto, @Request() req: any) {
    return this.cashService.create(dto, req.user);
  }

  @Get()
  @Roles('owner', 'admin', 'employee', 'superadmin')
  findAll(@Request() req: any, @Query() query: BranchPaginationQueryDto) {
    return this.cashService.findAll(req.user, query);
  }
}
