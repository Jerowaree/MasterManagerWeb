import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @Get('company-users')
  @Roles('owner', 'admin', 'superadmin')
  listCompanyUsers(@Request() req: any) {
    return this.usersService.listCompanyUsers(req.user.companyId);
  }

  @Post('company-users')
  @Roles('owner', 'admin', 'superadmin')
  createCompanyUser(@Request() req: any, @Body() dto: CreateCompanyUserDto) {
    return this.usersService.createCompanyUser(req.user.companyId, req.user.id, dto);
  }

  @Post('change-password')
  @Roles('owner', 'admin', 'employee', 'superadmin')
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.id, dto);
  }
}
