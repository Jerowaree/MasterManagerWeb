import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard, SubscriptionGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('movements')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  create(@Body() createMovementDto: CreateMovementDto, @Request() req: any) {
    return this.inventoryService.createMovement(createMovementDto, req.user);
  }

  @Get('movements')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  findAll(@Request() req: any) {
    return this.inventoryService.findAll(req.user);
  }

  @Get('stock/:productId')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  getStock(
    @Param('productId') productId: string,
    @Query('branchId') branchId: string | undefined,
    @Request() req: any,
  ) {
    return this.inventoryService.getStock(productId, branchId, req.user);
  }

  @Get('movements/:productId')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  findByProduct(@Param('productId') productId: string, @Request() req: any) {
    return this.inventoryService.findByProduct(productId, req.user);
  }

  @Get('products')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  listProducts(@Query('branchId') branchId: string | undefined, @Request() req: any) {
    return this.inventoryService.listProducts(branchId, req.user);
  }
}
