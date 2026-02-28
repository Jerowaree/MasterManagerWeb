import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, SubscriptionGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Roles('owner', 'admin', 'employee', 'superadmin')
  create(@Body() dto: CreateSupplierDto, @Request() req: any) {
    return this.suppliersService.create(dto, req.user);
  }

  @Get()
  @Roles('owner', 'admin', 'employee', 'superadmin')
  findAll(@Request() req: any, @Query() pagination: PaginationQueryDto) {
    return this.suppliersService.findAll(req.user, pagination);
  }
}
