import {BadRequestException, Injectable, NotFoundException,} from '@nestjs/common';
import {Cron, CronExpression} from '@nestjs/schedule';
import {PrismaService} from '../prisma/prisma.service';
import {CreateReceivableDto} from './dto/create-receivable.dto';
import {UpdateReceivableDto} from './dto/update-receivable.dto';
import {AddReceivablePaymentDto} from './dto/add-receivable-payment.dto';
import {ReceivableQueryDto} from './dto/receivable-query.dto';
import {ReceivableStatus} from '../../common/types/enums';
import {tenantStorage} from '../../common/store/tenant.store';
import {ActorContext, assertActorBranchScope, resolveActorBranchFilter,} from '../../common/utils/branch-access.utils';
import {MailService} from '../notifications/mail.service';
import {resolvePagination, toPaginatedResult} from '../../common/utils/pagination.utils';

@Injectable()
export class ReceivablesService {
  private readonly reminderBatchSize = Number(
    process.env.RECEIVABLE_REMINDER_BATCH_SIZE ?? '200'
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private resolveCompanyId(actor: ActorContext) {
    const context = tenantStorage.getStore();
    const contextCompanyId = context?.companyId;

    if (!actor.companyId) {
      throw new BadRequestException('Usuario autenticado sin contexto de empresa');
    }

    if (contextCompanyId && contextCompanyId !== actor.companyId) {
      throw new BadRequestException('Contexto de tenant inconsistente');
    }

    return actor.companyId;
  }

  private parseDate(value: string, fieldName: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Fecha invalida para ${fieldName}`);
    }
    return parsed;
  }

  private normalizeDocumentRef(value?: string) {
    return value?.trim() || undefined;
  }

  private buildNextReminderAt(dueDate: Date, intervalDays: number, now: Date) {
    if (intervalDays <= 0) {
      return null;
    }
    return dueDate.getTime() <= now.getTime() ? now : dueDate;
  }

  async create(dto: CreateReceivableDto, actor: ActorContext) {
    const companyId = this.resolveCompanyId(actor);
    assertActorBranchScope(actor, dto.branchId);

    const dueDate = this.parseDate(dto.dueDate, 'dueDate');
    const now = new Date();
    const reminderIntervalDays = dto.reminderIntervalDays ?? 3;

    const branch = await this.prisma.client.branch.findFirst({
      where: {
        id: dto.branchId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada para tu empresa');
    }

    if (dto.customerId) {
      const customer = await this.prisma.client.customer.findFirst({
        where: {
          id: dto.customerId,
          companyId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!customer) {
        throw new NotFoundException('Cliente no encontrado para tu empresa');
      }
    }

    if (dto.saleId) {
      const sale = await this.prisma.client.sale.findFirst({
        where: {
          id: dto.saleId,
          companyId,
          deletedAt: null,
        },
        select: { id: true, branchId: true, customerId: true },
      });

      if (!sale) {
        throw new NotFoundException('Venta no encontrada para tu empresa');
      }

      if (sale.branchId !== dto.branchId) {
        throw new BadRequestException('La venta pertenece a otra sucursal');
      }

      if (dto.customerId && sale.customerId && sale.customerId !== dto.customerId) {
        throw new BadRequestException('El cliente no coincide con la venta indicada');
      }
    }

    const status = dueDate < now ? ReceivableStatus.OVERDUE : ReceivableStatus.OPEN;
    const normalizedDocumentRef = this.normalizeDocumentRef(dto.documentRef);
    const nextReminderAt = dto.remindersPaused
      ? null
      : this.buildNextReminderAt(dueDate, reminderIntervalDays, now);

    return this.prisma.client.accountsReceivable.create({
      data: {
        branchId: dto.branchId,
        customerId: dto.customerId,
        saleId: dto.saleId,
        documentRef: normalizedDocumentRef,
        totalAmount: dto.totalAmount,
        currency: dto.currency ?? 'PEN',
        dueDate,
        status,
        reminderIntervalDays,
        remindersPaused: dto.remindersPaused ?? false,
        nextReminderAt,
      },
      include: { customer: true, payments: true },
    });
  }

  async findAll(actor: ActorContext, query: ReceivableQueryDto) {
    const companyId = this.resolveCompanyId(actor);
    const branchId = resolveActorBranchFilter(actor, query.branchId);
    const { page, limit, skip, take } = resolvePagination(query);

    const receivablesModel = this.prisma.client.accountsReceivable;
    if (!receivablesModel) {
      throw new BadRequestException('Modelo de cuentas por cobrar no disponible. Ejecuta db:generate.');
    }

    const where: any = {
      companyId,
      deletedAt: null,
    };

    if (branchId) {
      where.branchId = branchId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    const search = query.search?.trim();
    if (search) {
      where.documentRef = { contains: search, mode: 'insensitive' };
    }

    if (query.dueFrom || query.dueTo) {
      where.dueDate = {};
      if (query.dueFrom) {
        where.dueDate.gte = this.parseDate(query.dueFrom, 'dueFrom');
      }
      if (query.dueTo) {
        where.dueDate.lte = this.parseDate(query.dueTo, 'dueTo');
      }
    }

    const [items, total] = await this.prisma.client.$transaction([
      receivablesModel.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        skip,
        take,
        include: { customer: true, branch: true },
      }),
      receivablesModel.count({ where }),
    ]);

    return toPaginatedResult(items, page, limit, total);
  }

  async findOne(id: string, actor: ActorContext) {
    this.resolveCompanyId(actor);

    const receivable = await this.prisma.client.accountsReceivable.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: { customer: true, payments: true },
    });

    if (!receivable) {
      throw new NotFoundException('Cuenta por cobrar no encontrada');
    }

    assertActorBranchScope(actor, receivable.branchId);

    return receivable;
  }

  async update(id: string, dto: UpdateReceivableDto, actor: ActorContext) {
    this.resolveCompanyId(actor);

    const receivable = await this.prisma.client.accountsReceivable.findFirst({
      where: { id, deletedAt: null },
      include: { payments: true },
    });

    if (!receivable) {
      throw new NotFoundException('Cuenta por cobrar no encontrada');
    }

    assertActorBranchScope(actor, receivable.branchId);

    if (receivable.status === ReceivableStatus.PAID) {
      throw new BadRequestException('No puedes editar una cuenta por cobrar pagada');
    }

    const data: any = {};

    if (dto.documentRef !== undefined) {
      data.documentRef = this.normalizeDocumentRef(dto.documentRef);
    }

    if (dto.dueDate) {
      data.dueDate = this.parseDate(dto.dueDate, 'dueDate');
    }

    if (dto.reminderIntervalDays !== undefined) {
      data.reminderIntervalDays = dto.reminderIntervalDays;
    }

    if (dto.remindersPaused !== undefined) {
      data.remindersPaused = dto.remindersPaused;
      if (dto.remindersPaused) {
        data.nextReminderAt = null;
      }
    }

    if (dto.status) {
      if (
        dto.status === ReceivableStatus.PAID &&
        Number(receivable.amountPaid) < Number(receivable.totalAmount)
      ) {
        throw new BadRequestException('No puedes marcar como pagado sin cubrir el total');
      }
      data.status = dto.status;
      if (dto.status !== ReceivableStatus.OPEN && dto.status !== ReceivableStatus.OVERDUE) {
        data.nextReminderAt = null;
        data.remindersPaused = true;
      }
    }

    return await this.prisma.client.accountsReceivable.update({
        where: {id},
        data,
        include: {customer: true, payments: true},
    });
  }

  async addPayment(id: string, dto: AddReceivablePaymentDto, actor: ActorContext) {
    this.resolveCompanyId(actor);
    const paymentDate = dto.paymentDate
      ? this.parseDate(dto.paymentDate, 'paymentDate')
      : new Date();

    return this.prisma.client.$transaction(async (tx: typeof this.prisma.client) => {
      const receivable = await tx.accountsReceivable.findFirst({
        where: { id, deletedAt: null },
      });

      if (!receivable) {
        throw new NotFoundException('Cuenta por cobrar no encontrada');
      }

      assertActorBranchScope(actor, receivable.branchId);

      if (receivable.status === ReceivableStatus.CANCELLED) {
        throw new BadRequestException('La cuenta por cobrar esta cancelada');
      }

      const totalAmount = Number(receivable.totalAmount);
      const currentPaid = Number(receivable.amountPaid);
      const newPaid = currentPaid + dto.amount;

      if (newPaid - totalAmount > 0.0001) {
        throw new BadRequestException('El pago excede el monto total');
      }

      await tx.receivablePayment.create({
        data: {
          receivableId: receivable.id,
          amount: dto.amount,
          paymentDate,
          method: dto.method?.trim(),
          reference: dto.reference?.trim(),
        },
      });

      const now = new Date();
      const shouldBePaid = Math.abs(newPaid - totalAmount) < 0.0001 || newPaid > totalAmount;
      const isOverdue = receivable.dueDate < now;
      const status = shouldBePaid
        ? ReceivableStatus.PAID
        : isOverdue
          ? ReceivableStatus.OVERDUE
          : ReceivableStatus.OPEN;

      await tx.accountsReceivable.update({
        where: { id: receivable.id },
        data: {
          amountPaid: { increment: dto.amount },
          status,
          nextReminderAt: status === ReceivableStatus.PAID ? null : receivable.nextReminderAt,
          remindersPaused: status === ReceivableStatus.PAID ? true : receivable.remindersPaused,
        },
      });

      return tx.accountsReceivable.findFirst({
        where: { id: receivable.id },
        include: { customer: true, payments: true },
      });
    });
  }

  async getPayments(id: string, actor: ActorContext) {
    this.resolveCompanyId(actor);

    const receivable = await this.prisma.client.accountsReceivable.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, branchId: true },
    });

    if (!receivable) {
      throw new NotFoundException('Cuenta por cobrar no encontrada');
    }

    assertActorBranchScope(actor, receivable.branchId);

    return this.prisma.client.receivablePayment.findMany({
      where: { receivableId: id, deletedAt: null },
      orderBy: { paymentDate: 'desc' },
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processReminders() {
    const now = new Date();

    const receivablesModel = this.prisma.client.accountsReceivable;
    if (!receivablesModel) {
      return;
    }

    return tenantStorage.run({ isPublic: true }, async () => {
      await receivablesModel.updateMany({
        where: {
          deletedAt: null,
          status: ReceivableStatus.OPEN,
          dueDate: { lt: now },
        },
        data: { status: ReceivableStatus.OVERDUE },
      });

      const pending = await receivablesModel.findMany({
        where: {
          deletedAt: null,
          status: { in: [ReceivableStatus.OPEN, ReceivableStatus.OVERDUE] },
          remindersPaused: false,
          nextReminderAt: { lte: now },
        },
        take: this.reminderBatchSize,
        include: { customer: true },
        orderBy: { nextReminderAt: 'asc' },
      });

      if (pending.length === 0) {
        return;
      }

      for (const receivable of pending) {
        const email = receivable.customer?.email?.trim();
        const subject = `Recordatorio de pago ${receivable.documentRef ?? ''}`.trim();
        const total = Number(receivable.totalAmount).toFixed(2);
        const paid = Number(receivable.amountPaid).toFixed(2);
        const dueDate = receivable.dueDate.toISOString().split('T')[0];

        if (email) {
          await this.mailService.sendSimpleMail(
            email,
            subject || 'Recordatorio de pago',
            `<p>Tu cuenta por cobrar vence el ${dueDate}.</p><p>Total: ${total} ${receivable.currency}. Pagado: ${paid}.</p>`
          );
        }

        const nextReminderAt = new Date(
          now.getTime() + receivable.reminderIntervalDays * 24 * 60 * 60 * 1000
        );

        await receivablesModel.update({
          where: { id: receivable.id },
          data: {
            lastReminderAt: now,
            nextReminderAt,
            reminderCount: { increment: 1 },
          },
        });
      }
    });
  }
}
