import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { ThrottlerModule } from '@nestjs/throttler';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
