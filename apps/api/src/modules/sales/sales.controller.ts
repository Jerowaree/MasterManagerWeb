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

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
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
  findAll() {
    return this.salesService.findAll();
  }

  @Get(':id')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Patch(':id')
  @Roles('owner', 'admin', 'superadmin')
  update(@Param('id') id: string, @Body() updateSaleDto: UpdateSaleDto) {
    return this.salesService.update(id, updateSaleDto);
  }

  @Delete(':id')
  @Roles('owner', 'admin', 'superadmin')
  remove(@Param('id') id: string) {
    return this.salesService.remove(id);
  }
}
