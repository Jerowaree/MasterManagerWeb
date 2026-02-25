import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MovementType, UserRole } from '@prisma/client';
import { MailService } from '../notifications/mail.service';
import * as XLSX from 'xlsx';
import { Cron } from '@nestjs/schedule';
import { getLocalDayUtcRange, isValidIanaTimeZone } from '../../common/utils/timezone-range.utils';
import { SaleStatus } from '../../common/types/enums';
import { tenantStorage } from '../../common/store/tenant.store';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  private withTenantContext<T>(companyId: string, fn: () => Promise<T>) {
    return tenantStorage.run({ companyId }, fn);
  }

  private buildReportHtml() {
    return `
      <div style="font-family: sans-serif; color: #333;">
        <h2 style="color: #7c3aed;">Hola de Master Manager</h2>
        <p>Adjunto encontraras el reporte solicitado generado automaticamente por el sistema.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Este es un correo automatico, por favor no respondas.</p>
      </div>
    `;
  }

  private async buildReportAttachment(companyId: string, type: 'sales' | 'inventory') {
    let data: any[] = [];
    let filename = '';
    let subject = '';

    if (type === 'sales') {
      const sales = await this.withTenantContext<any[]>(companyId, () =>
        this.prisma.client.sale.findMany({
          where: { companyId, deletedAt: null },
          include: { customer: true, branch: true },
          orderBy: { createdAt: 'desc' },
        }),
      );

      data = sales.map((s: any) => ({
        ID: s.id.slice(0, 8),
        Cliente: s.customer?.name || 'Venta Rapida',
        Sede: s.branch?.name,
        Fecha: s.createdAt.toLocaleDateString(),
        Total: Number(s.total),
        Estado: s.status,
      }));
      filename = `Reporte_Ventas_${new Date().toISOString().split('T')[0]}.xlsx`;
      subject = 'Reporte Automatico de Ventas - Master Manager';
    } else {
      const val = await this.getInventoryValorization(companyId);
      data = val.products.map((p: any) => ({
        Producto: p.productId,
        Stock: p.stock,
        UltimoCosto: p.latestCost,
        ValorTotal: p.totalValue,
      }));
      filename = `Valorizacion_Inventario_${new Date().toISOString().split('T')[0]}.xlsx`;
      subject = 'Reporte de Valorizacion de Inventario - Master Manager';
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return { subject, filename, buffer };
  }

  async getDashboardSummary(companyId: string) {
    return this.withTenantContext(companyId, async () => {
      const company = await this.prisma.client.company.findFirst({
        where: { id: companyId, deletedAt: null },
        select: { timezone: true },
      });

      const businessTimeZone = company?.timezone && isValidIanaTimeZone(company.timezone)
        ? company.timezone
        : 'UTC';

      const now = new Date();
      const { startUtc: todayStartUtc, endUtc: todayEndUtc } = getLocalDayUtcRange(now, businessTimeZone);
      const { startUtc: yesterdayStartUtc } = getLocalDayUtcRange(
        new Date(todayStartUtc.getTime() - 60 * 1000),
        businessTimeZone,
      );

      const [
        totalSalesAgg,
        totalCustomers,
        totalBranches,
        recentSales,
        salesTodayAgg,
        salesYesterdayAgg,
      ] = await Promise.all([
        this.prisma.client.sale.aggregate({
          _sum: { total: true },
          where: { companyId, deletedAt: null, status: SaleStatus.PAID },
        }),
        this.prisma.client.customer.count({
          where: { companyId, deletedAt: null },
        }),
        this.prisma.client.branch.count({
          where: { companyId, deletedAt: null },
        }),
        this.prisma.client.sale.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { customer: true, branch: true },
          where: { companyId, deletedAt: null },
        }),
        this.prisma.client.sale.aggregate({
          _sum: { total: true },
          where: {
            companyId,
            createdAt: { gte: todayStartUtc, lt: todayEndUtc },
            status: SaleStatus.PAID,
            deletedAt: null,
          },
        }),
        this.prisma.client.sale.aggregate({
          _sum: { total: true },
          where: {
            companyId,
            createdAt: { gte: yesterdayStartUtc, lt: todayStartUtc },
            status: SaleStatus.PAID,
            deletedAt: null,
          },
        }),
      ]);

      const todayRevenue = Number(salesTodayAgg._sum.total || 0);
      const yesterdayRevenue = Number(salesYesterdayAgg._sum.total || 0);
      const totalRevenue = Number(totalSalesAgg._sum.total || 0);

      let revenueTrend = 0;
      if (yesterdayRevenue > 0) {
        revenueTrend = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
      } else if (todayRevenue > 0) {
        revenueTrend = 100;
      }

      return {
        stats: {
          totalRevenue,
          todayRevenue,
          revenueTrend: revenueTrend.toFixed(1),
          customerCount: totalCustomers,
          branchCount: totalBranches,
          timeZone: businessTimeZone,
        },
        recentSales,
      };
    });
  }

  async getCashClosing(companyId: string, branchId?: string) {
    return this.withTenantContext(companyId, async () => {
      const company = await this.prisma.client.company.findFirst({
        where: { id: companyId, deletedAt: null },
        select: { timezone: true },
      });

      const businessTimeZone = company?.timezone && isValidIanaTimeZone(company.timezone)
        ? company.timezone
        : 'UTC';
      const { startUtc, endUtc } = getLocalDayUtcRange(new Date(), businessTimeZone);

      const where: any = {
        companyId,
        createdAt: { gte: startUtc, lt: endUtc },
        status: SaleStatus.PAID,
        deletedAt: null,
      };

      if (branchId) {
        where.branchId = branchId;
      }

      const [salesSummary, salesList] = await Promise.all([
        this.prisma.client.sale.aggregate({
          _sum: { total: true },
          _count: { id: true },
          where,
        }),
        this.prisma.client.sale.findMany({
          where,
          include: { customer: true, branch: true },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return {
        date: startUtc.toISOString(),
        timeZone: businessTimeZone,
        totalAmount: salesSummary._sum.total || 0,
        count: salesSummary._count.id,
        sales: salesList,
      };
    });
  }

  async getInventoryValorization(companyId: string, branchId?: string) {
    return this.withTenantContext(companyId, async () => {
      const stockWhere: any = { companyId };
      const movementWhere: any = {
        companyId,
        deletedAt: null,
        type: MovementType.IN,
      };

      if (branchId) {
        stockWhere.branchId = branchId;
        movementWhere.branchId = branchId;
      }

      const [stocks, latestCosts] = await Promise.all([
        this.prisma.client.productStock.findMany({
          where: stockWhere,
          select: { productId: true, quantity: true },
        }),
        this.prisma.client.inventoryMovement.findMany({
          where: movementWhere,
          distinct: ['productId'],
          orderBy: [{ productId: 'asc' }, { createdAt: 'desc' }],
          select: { productId: true, unitCost: true },
        }),
      ]);

      const unitCostByProduct = new Map<string, number>(
        latestCosts.map((entry: { productId: string; unitCost: number }) => [
          entry.productId,
          Number(entry.unitCost),
        ]),
      );

      const products = stocks.map((stock: { productId: string; quantity: number }) => {
        const currentStock = Number(stock.quantity);
        const latestCost = unitCostByProduct.get(stock.productId) ?? 0;

        return {
          productId: stock.productId,
          stock: currentStock,
          latestCost,
          totalValue: currentStock * latestCost,
        };
      });

      const totalPortfolioValue = products.reduce(
        (acc: number, p: { totalValue: number }) => acc + p.totalValue,
        0
      );

      return {
        totalPortfolioValue,
        products,
      };
    });
  }

  async sendReportByEmail(companyId: string, userEmail: string, type: 'sales' | 'inventory') {
    const { subject, filename, buffer } = await this.buildReportAttachment(companyId, type);
    return this.mailService.sendMailWithAttachment(
      userEmail,
      subject,
      this.buildReportHtml(),
      filename,
      buffer
    );
  }

  @Cron('0 8 * * 1')
  async handleWeeklyReports() {
    this.logger.log('Starting weekly automated reports distribution...');

    try {
      const recipients: { email: string; companyId: string }[] = await tenantStorage.run(
        { isPublic: true },
        async () =>
          this.prisma.client.user.findMany({
            where: {
              role: { in: [UserRole.owner, UserRole.admin] },
              deletedAt: null,
            },
            select: { email: true, companyId: true },
          })
      );

      if (recipients.length === 0) {
        this.logger.warn('No recipients found for weekly reports.');
        return;
      }

      this.logger.log(`Found ${recipients.length} recipients. Sending reports...`);

      const groupedByCompany = recipients.reduce(
        (acc: Map<string, string[]>, recipient: { companyId: string; email: string }) => {
          const existing = acc.get(recipient.companyId) ?? [];
          existing.push(recipient.email);
          acc.set(recipient.companyId, existing);
          return acc;
        },
        new Map<string, string[]>()
      );

      for (const [companyId, emails] of groupedByCompany.entries()) {
        const salesAttachment = await this.buildReportAttachment(companyId, 'sales');
        const inventoryAttachment = await this.buildReportAttachment(companyId, 'inventory');

        for (const email of emails) {
          await this.mailService.sendMailWithAttachment(
            email,
            salesAttachment.subject,
            this.buildReportHtml(),
            salesAttachment.filename,
            salesAttachment.buffer
          );
          await this.mailService.sendMailWithAttachment(
            email,
            inventoryAttachment.subject,
            this.buildReportHtml(),
            inventoryAttachment.filename,
            inventoryAttachment.buffer
          );
        }
      }

      this.logger.log('Weekly reports distribution completed successfully.');
    } catch (err: any) {
      this.logger.error(`Failed to distribute weekly reports: ${err.message}`);
    }
  }
}
