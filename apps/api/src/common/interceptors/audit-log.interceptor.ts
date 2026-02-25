import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../modules/prisma/prisma.service';

const REDACTED = '[REDACTED]';
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'refreshtoken',
  'refreshtokenhash',
  'token',
  'accesstoken',
  'csrf',
  'csrftoken',
  'authorization',
  'secret',
]);

function sanitizeForAudit(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') {
    return input.length > 4000 ? `${input.slice(0, 4000)}...[truncated]` : input;
  }
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.map((item) => sanitizeForAudit(item));

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    result[key] = SENSITIVE_KEYS.has(normalized) ? REDACTED : sanitizeForAudit(value);
  }
  return result;
}

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
                newData: sanitizeForAudit(body),
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
