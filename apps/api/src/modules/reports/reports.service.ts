import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryMovement, UserRole } from '@prisma/client';
import { MailService } from '../notifications/mail.service';
import * as XLSX from 'xlsx';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async getDashboardSummary() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const [
      totalSalesAgg, 
      totalCustomers, 
      totalBranches, 
      recentSales, 
      salesTodayAgg, 
      salesYesterdayAgg
    ] = await Promise.all([
      this.prisma.client.sale.aggregate({
        _sum: { total: true },
        where: { deletedAt: null },
      }),
      this.prisma.client.customer.count({
        where: { deletedAt: null },
      }),
      this.prisma.client.branch.count({
        where: { deletedAt: null },
      }),
      this.prisma.client.sale.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: true, branch: true },
        where: { deletedAt: null },
      }),
      this.prisma.client.sale.aggregate({
        _sum: { total: true },
        where: {
          createdAt: { gte: todayStart },
          deletedAt: null,
        },
      }),
      this.prisma.client.sale.aggregate({
        _sum: { total: true },
        where: {
          createdAt: { gte: yesterdayStart, lt: todayStart },
          deletedAt: null,
        },
      }),
    ]);

    const todayRevenue = Number(salesTodayAgg._sum.total || 0);
    const yesterdayRevenue = Number(salesYesterdayAgg._sum.total || 0);
    const totalRevenue = Number(totalSalesAgg._sum.total || 0);

    // Calculate trend
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
      },
      recentSales,
    };
  }

  async getCashClosing(branchId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = {
      createdAt: { gte: today },
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
      date: today.toISOString(),
      totalAmount: salesSummary._sum.total || 0,
      count: salesSummary._count.id,
      sales: salesList,
    };
  }

  async getInventoryValorization() {
    const movements = await this.prisma.client.inventoryMovement.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });

    // Group by product to calculate stock and average cost or latest cost
    const valorization: Record<string, { stock: number; totalValue: number; latestCost: number }> = {};

    movements.forEach((mov: InventoryMovement) => {
      if (!valorization[mov.productId]) {
        valorization[mov.productId] = { stock: 0, totalValue: 0, latestCost: 0 };
      }

      const qty = Number(mov.quantity);
      const cost = Number(mov.unitCost);

      if (mov.type === 'IN') {
        valorization[mov.productId].stock += qty;
        valorization[mov.productId].latestCost = cost;
      } else if (mov.type === 'OUT') {
        valorization[mov.productId].stock -= qty;
      }
    });

    const products = Object.entries(valorization).map(([id, data]) => ({
      productId: id,
      stock: data.stock,
      latestCost: data.latestCost,
      totalValue: data.stock * data.latestCost,
    }));

    const totalPortfolioValue = products.reduce((acc, p) => acc + p.totalValue, 0);

    return {
      totalPortfolioValue,
      products,
    };
  }

  async sendReportByEmail(userEmail: string, type: 'sales' | 'inventory') {
    let data: any[] = [];
    let filename = '';
    let subject = '';

    if (type === 'sales') {
      const sales = await this.prisma.client.sale.findMany({
        where: { deletedAt: null },
        include: { customer: true, branch: true },
        orderBy: { createdAt: 'desc' },
      });
      data = sales.map((s: any) => ({
        ID: s.id.slice(0, 8),
        Cliente: s.customer?.name || 'Venta Rápida',
        Sede: s.branch?.name,
        Fecha: s.createdAt.toLocaleDateString(),
        Total: Number(s.total),
        Estado: s.status,
      }));
      filename = `Reporte_Ventas_${new Date().toISOString().split('T')[0]}.xlsx`;
      subject = '📊 Reporte Automático de Ventas - Master Manager';
    } else {
      const val = await this.getInventoryValorization();
      data = val.products.map((p) => ({
        Producto: p.productId,
        Stock: p.stock,
        UltimoCosto: p.latestCost,
        ValorTotal: p.totalValue,
      }));
      filename = `Valorizacion_Inventario_${new Date().toISOString().split('T')[0]}.xlsx`;
      subject = '📦 Reporte de Valorización de Inventario - Master Manager';
    }

    // Generate Excel Buffer
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Send Mail
    const html = `
      <div style="font-family: sans-serif; color: #333;">
        <h2 style="color: #7c3aed;">Hola de Master Manager</h2>
        <p>Adjunto encontrarás el reporte solicitado generado automáticamente por el sistema.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Este es un correo automático, por favor no respondas.</p>
      </div>
    `;

    return this.mailService.sendMailWithAttachment(userEmail, subject, html, filename, buffer);
  }

  @Cron('0 8 * * 1') // Every Monday at 8:00 AM
  async handleWeeklyReports() {
    this.logger.log('Starting weekly automated reports distribution...');

    try {
      // Find all active owners/admins
      const recipients: { email: string }[] = await this.prisma.client.user.findMany({
        where: {
          role: { in: [UserRole.owner, UserRole.admin] },
          deletedAt: null,
        },
        select: { email: true },
      });

      if (recipients.length === 0) {
        this.logger.warn('No recipients found for weekly reports.');
        return;
      }

      const emails = recipients.map(u => u.email);
      this.logger.log(`Found ${emails.length} recipients. Sending reports...`);

      for (const email of emails) {
        await this.sendReportByEmail(email, 'sales');
        await this.sendReportByEmail(email, 'inventory');
      }

      this.logger.log('Weekly reports distribution completed successfully.');
    } catch (err: any) {
      this.logger.error(`Failed to distribute weekly reports: ${err.message}`);
    }
  }
}
