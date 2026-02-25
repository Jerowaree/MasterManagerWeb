import { Module } from "@nestjs/common";
import { PeruService } from './peru.service';

@Module({
  providers: [PeruService],
  exports: [PeruService],
})
export class PeruModule {}
