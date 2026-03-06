import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from "./app.controller";
import { AuthModule } from "./modules/auth/auth.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { UsersModule } from "./modules/users/users.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { BranchesModule } from "./modules/branches/branches.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { SalesModule } from "./modules/sales/sales.module";
import { PurchasesModule } from "./modules/purchases/purchases.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { SuppliersModule } from "./modules/suppliers/suppliers.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PeruModule } from "./modules/peru/peru.module";
import { SecurityModule } from "./modules/security/security.module";
import { GeoModule } from "./modules/geo/geo.module";
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { CsrfMiddleware } from './common/middlewares/csrf.middleware';
import { SubscriptionGuard } from './common/guards/subscription.guard';
import { ScheduleModule } from '@nestjs/schedule';
import { CashModule } from "./modules/cash/cash.module";
import { ReceivablesModule } from "./modules/receivables/receivables.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    BranchesModule,
    SubscriptionsModule,
    PaymentsModule,
    SalesModule,
    PurchasesModule,
    InventoryModule,
    CustomersModule,
    SuppliersModule,
    ReportsModule,
    NotificationsModule,
    PeruModule,
    SecurityModule,
    GeoModule,
    CashModule,
    ReceivablesModule,
  ],
  controllers: [AppController],
  providers: [
    SubscriptionGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).forRoutes('*');
  }
}
