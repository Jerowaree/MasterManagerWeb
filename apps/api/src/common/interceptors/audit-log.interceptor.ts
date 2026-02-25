import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { user, method, url, body } = request;

    return next.handle().pipe(
      tap(async (data) => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && user) {
          try {
            await this.prisma.client.auditLog.create({
              data: {
                companyId: user.companyId,
                userId: user.id,
                action: method,
                entity: url.split('/')[1] || 'unknown',
                entityId: data?.id || body?.id || '00000000-0000-0000-0000-000000000000',
                newData: body,
                // previousData could be fetched here if needed, but it adds complexity
              },
            });
          } catch (error) {
            console.error('Failed to create audit log', error);
          }
        }
      }),
    );
  }
}
