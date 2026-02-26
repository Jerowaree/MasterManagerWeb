import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@Controller('sales')
@UseGuards(JwtAuthGuard, SubscriptionGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles('owner', 'admin', 'employee', 'superadmin')
  create(
    @Body() createSaleDto: CreateSaleDto,
    @Request() req: any,
    @Headers('idempotency-key') idempotencyKey?: string
  ) {
    return this.salesService.create(createSaleDto, req.user, idempotencyKey);
  }

  @Get()
  @Roles('owner', 'admin', 'employee', 'superadmin')
  findAll(@Request() req: any) {
    return this.salesService.findAll(req.user);
  }

  @Get(':id')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.salesService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles('owner', 'admin', 'superadmin')
  update(@Param('id') id: string, @Body() updateSaleDto: UpdateSaleDto, @Request() req: any) {
    return this.salesService.update(id, updateSaleDto, req.user);
  }

  @Delete(':id')
  @Roles('owner', 'admin', 'superadmin')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.salesService.remove(id, req.user);
  }
}
