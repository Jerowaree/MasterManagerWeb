import { Module } from "@nestjs/common";
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { getJwtSigningSecret } from './auth.config';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    PrismaModule,
    SecurityModule,
    PassportModule,
    JwtModule.register({
      secret: getJwtSigningSecret(),
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
