import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  getHello() {
    return {
      message: "API modular multi-tenant activa",
      domains: [
        "auth",
        "users",
        "companies",
        "branches",
        "subscriptions",
        "payments",
        "sales",
        "purchases",
        "inventory",
        "customers",
        "suppliers",
        "reports",
        "notifications",
        "peru"
      ]
    };
  }
}
