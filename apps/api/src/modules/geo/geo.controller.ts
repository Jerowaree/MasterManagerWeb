import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchAddressDto } from './dto/search-address.dto';
import { GeoService } from './geo.service';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';

@Controller('geo')
@UseGuards(JwtAuthGuard, SubscriptionGuard, RolesGuard)
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('search')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Roles('owner', 'admin', 'employee', 'superadmin')
  search(@Query() query: SearchAddressDto) {
    return this.geoService.searchAddress(query.q, query.countryCode, query.limit);
  }
}
