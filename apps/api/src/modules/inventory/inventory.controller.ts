import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Patch } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustProductStockDto } from './dto/adjust-product-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { BranchPaginationQueryDto, PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard, SubscriptionGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('products')
  @Roles('owner', 'admin', 'superadmin')
  createProduct(@Body() dto: CreateProductDto, @Request() req: any) {
    return this.inventoryService.createProduct(dto, req.user);
  }

  @Patch('products/:productId')
  @Roles('owner', 'admin', 'superadmin')
  updateProduct(
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
    @Request() req: any,
  ) {
    return this.inventoryService.updateProduct(productId, dto, req.user);
  }

  @Patch('products/:productId/stock')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  adjustProductStock(
    @Param('productId') productId: string,
    @Body() dto: AdjustProductStockDto,
    @Request() req: any,
  ) {
    return this.inventoryService.adjustProductStock(productId, dto, req.user);
  }

  @Post('movements')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  create(@Body() createMovementDto: CreateMovementDto, @Request() req: any) {
    return this.inventoryService.createMovement(createMovementDto, req.user);
  }

  @Get('movements')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  findAll(@Request() req: any, @Query() pagination: PaginationQueryDto) {
    return this.inventoryService.findAll(req.user, pagination);
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
  listProducts(
    @Query() query: BranchPaginationQueryDto,
    @Request() req: any,
  ) {
    const { branchId, page, limit } = query;
    const pagination: PaginationQueryDto = { page, limit };
    return this.inventoryService.listProducts(branchId, req.user, pagination);
  }

  @Get('low-stock')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  listLowStock(
    @Query() query: BranchPaginationQueryDto,
    @Request() req: any,
  ) {
    const { branchId, page, limit } = query;
    const pagination: PaginationQueryDto = { page, limit };
    return this.inventoryService.listLowStock(branchId, req.user, pagination);
  }
}
