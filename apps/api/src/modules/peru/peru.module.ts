import { Module } from "@nestjs/common";
import { PeruService } from './peru.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PeruController } from './peru.controller';
import { SunatService } from './sunat.service';
import { CountryContextService } from '../../common/services/country-context.service';
import { CountryFeatureGuard } from '../../common/guards/country-feature.guard';

@Module({
  imports: [PrismaModule],
  controllers: [PeruController],
  providers: [PeruService, SunatService, CountryContextService, CountryFeatureGuard],
  exports: [PeruService, SunatService, CountryContextService],
})
export class PeruModule {}
