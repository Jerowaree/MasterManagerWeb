import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantStorage } from '../store/tenant.store';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && user.companyId) {
      return new Observable((observer) => {
        tenantStorage.run({ companyId: user.companyId }, () => {
          next.handle().subscribe(observer);
        });
      });
    }

    return next.handle();
  }
}
