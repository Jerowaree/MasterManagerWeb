import { Global, Module } from '@nestjs/common';
import { SecurityEventsService } from './security-events.service';
import { BotProtectionService } from './bot-protection.service';

@Global()
@Module({
  providers: [SecurityEventsService, BotProtectionService],
  exports: [SecurityEventsService, BotProtectionService],
})
export class SecurityModule {}
