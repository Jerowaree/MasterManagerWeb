import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@Controller('customers')
@UseGuards(JwtAuthGuard, SubscriptionGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles('owner', 'admin', 'employee', 'superadmin')
  create(@Body() createCustomerDto: CreateCustomerDto, @Request() req: any) {
    return this.customersService.create(createCustomerDto, req.user);
  }

  @Get()
  @Roles('owner', 'admin', 'employee', 'superadmin')
  findAll(@Request() req: any) {
    return this.customersService.findAll(req.user);
  }

  @Get(':id')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.customersService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles('owner', 'admin', 'superadmin')
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto, @Request() req: any) {
    return this.customersService.update(id, updateCustomerDto, req.user);
  }

  @Delete(':id')
  @Roles('owner', 'admin', 'superadmin')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.customersService.remove(id, req.user);
  }
}
