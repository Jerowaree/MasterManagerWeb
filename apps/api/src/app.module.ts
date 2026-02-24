import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./modules/auth/auth.module";
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

@Module({
  imports: [
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
    PeruModule
  ],
  controllers: [AppController],
  providers: []
})
export class AppModule {}
