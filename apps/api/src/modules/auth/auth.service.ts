import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { tenantStorage } from '../../common/store/tenant.store';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    return tenantStorage.run({ isPublic: true }, async () => {
      const { 
        email, password, companyName, country, currency, timezone, branchName 
      } = dto;

      // 1. Check if user already exists
      const existingUser = await this.prisma.client.user.findFirst({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException('User already exists');
      }

      const passwordHash = await bcrypt.hash(password, 12);

      // 2. Atomic transaction for super-secure creation
      const result = await this.prisma.client.$transaction(async (tx: any) => {
        // Create Company
        const company = await tx.company.create({
          data: {
            name: companyName,
            country,
            currency,
            timezone,
            plan: 'free_trial',
            status: 'active',
          },
        });

        // Create main Branch
        const branch = await tx.branch.create({
          data: {
            name: branchName || 'Principal',
            companyId: company.id,
            timezone,
          },
        });

        // Create Owner User
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            companyId: company.id,
            branchId: branch.id,
            role: 'owner',
          },
        });

        // Create initial subscription
        await tx.subscription.create({
          data: {
            companyId: company.id,
            plan: 'free_trial',
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          },
        });

        return { user, company };
      });

      return this.login(result.user);
    });
  }

  async validateUser(email: string, pass: string): Promise<any> {
    return tenantStorage.run({ isPublic: true }, async () => {
      const user = await this.prisma.client.user.findFirst({
        where: { email },
      });

      if (user && (await bcrypt.compare(pass, user.passwordHash))) {
        const { passwordHash, ...result } = user;
        return result;
      }
      return null;
    });
  }

  async login(user: any) {
    const payload = { 
      email: user.email, 
      sub: user.id, 
      companyId: user.companyId,
      branchId: user.branchId,
      role: user.role 
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        companyId: user.companyId,
        branchId: user.branchId,
        role: user.role
      }
    };
  }
}
