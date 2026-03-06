import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ReceivablesService } from './receivables.service';
import { CreateReceivableDto } from './dto/create-receivable.dto';
import { UpdateReceivableDto } from './dto/update-receivable.dto';
import { AddReceivablePaymentDto } from './dto/add-receivable-payment.dto';
import { ReceivableQueryDto } from './dto/receivable-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@Controller('receivables')
@UseGuards(JwtAuthGuard, SubscriptionGuard, RolesGuard)
export class ReceivablesController {
  constructor(private readonly receivablesService: ReceivablesService) {}

  @Post()
  @Roles('owner', 'admin', 'employee', 'superadmin')
  create(@Body() dto: CreateReceivableDto, @Request() req: any) {
    return this.receivablesService.create(dto, req.user);
  }

  @Get()
  @Roles('owner', 'admin', 'employee', 'superadmin')
  findAll(@Request() req: any, @Query() query: ReceivableQueryDto) {
    return this.receivablesService.findAll(req.user, query);
  }

  @Get(':id')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.receivablesService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles('owner', 'admin', 'superadmin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReceivableDto,
    @Request() req: any,
  ) {
    return this.receivablesService.update(id, dto, req.user);
  }

  @Post(':id/payments')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  addPayment(
    @Param('id') id: string,
    @Body() dto: AddReceivablePaymentDto,
    @Request() req: any,
  ) {
    return this.receivablesService.addPayment(id, dto, req.user);
  }

  @Get(':id/payments')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  getPayments(@Param('id') id: string, @Request() req: any) {
    return this.receivablesService.getPayments(id, req.user);
  }
}
