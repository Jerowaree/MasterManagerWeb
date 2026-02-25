import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('movements')
  create(@Body() createMovementDto: CreateMovementDto) {
    return this.inventoryService.createMovement(createMovementDto);
  }

  @Get('movements')
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get('stock/:productId')
  getStock(
    @Param('productId') productId: string,
    @Query('branchId') branchId?: string
  ) {
    return this.inventoryService.getStock(productId, branchId);
  }

  @Get('movements/:productId')
  findByProduct(@Param('productId') productId: string) {
    return this.inventoryService.findByProduct(productId);
  }
}
