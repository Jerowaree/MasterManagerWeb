import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('movements')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  create(@Body() createMovementDto: CreateMovementDto) {
    return this.inventoryService.createMovement(createMovementDto);
  }

  @Get('movements')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get('stock/:productId')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  getStock(
    @Param('productId') productId: string,
    @Query('branchId') branchId?: string
  ) {
    return this.inventoryService.getStock(productId, branchId);
  }

  @Get('movements/:productId')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  findByProduct(@Param('productId') productId: string) {
    return this.inventoryService.findByProduct(productId);
  }
}
