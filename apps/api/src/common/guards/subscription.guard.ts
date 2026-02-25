import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.companyId) return true; // Skip if no user/company

    const company = await this.prisma.client.company.findUnique({
      where: { id: user.companyId },
      select: { status: true, graceUntil: true },
    });

    if (!company) throw new ForbiddenException('Company not found');

    if (company.status === 'suspended') {
      const isReadonly = request.method === 'GET';
      if (!isReadonly) {
        throw new ForbiddenException(
          'Your subscription is suspended. The system is in read-only mode.',
        );
      }
    }

    return true;
  }
}
