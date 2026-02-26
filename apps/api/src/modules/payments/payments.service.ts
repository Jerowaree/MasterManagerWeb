import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ActorContext } from '../../common/utils/branch-access.utils';
import {
  BillingCycle,
  resolvePlanById,
  resolvePlansByCountry,
} from './constants/plan-catalog';
import { PayPlanDto } from './dto/pay-plan.dto';

type PlanSummary = {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
};

type PaymentActorContext = ActorContext & {
  id: string;
};

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlans(actor: ActorContext) {
    const company = await this.prisma.client.company.findFirst({
      where: {
        id: actor.companyId,
        deletedAt: null,
      },
      select: {
        country: true,
        plan: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const plans = resolvePlansByCountry(company.country);

    return {
      currentPlan: company.plan,
      plans: plans.map((plan: PlanSummary) => ({
        ...plan,
      })),
    };
  }

  async payPlan(dto: PayPlanDto, actor: PaymentActorContext) {
    const company = await this.prisma.client.company.findFirst({
      where: {
        id: actor.companyId,
        deletedAt: null,
      },
      select: {
        id: true,
        country: true,
        currency: true,
        plan: true,
        subscription: {
          select: {
            id: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const actorUser = await this.prisma.client.user.findFirst({
      where: {
        id: actor.id,
        companyId: actor.companyId,
        deletedAt: null,
      },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!actorUser) {
      throw new UnauthorizedException('No se pudo validar el usuario autenticado');
    }

    const validPassword = await bcrypt.compare(dto.currentPassword, actorUser.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Contrasena actual incorrecta');
    }

    const plan = resolvePlanById(company.country, dto.planId);
    if (!plan) {
      throw new BadRequestException('Plan no disponible para tu pais');
    }

    const amount =
      dto.cycle === BillingCycle.YEARLY ? plan.yearlyPrice : plan.monthlyPrice;
    if (amount <= 0) {
      throw new BadRequestException('Monto de pago invalido');
    }

    const now = new Date();
    const baseDate =
      company.subscription?.currentPeriodEnd && company.subscription.currentPeriodEnd > now
        ? company.subscription.currentPeriodEnd
        : now;

    const currentPeriodEnd = new Date(baseDate);
    if (dto.cycle === BillingCycle.YEARLY) {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 12);
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    }

    const externalId = `manual_${randomUUID()}`;

    return this.prisma.client.$transaction(async (tx: typeof this.prisma.client) => {
      const payment = await tx.paymentLog.create({
        data: {
          provider: 'manual',
          amount,
          currency: plan.currency || company.currency,
          status: 'paid',
          externalId,
        },
      });

      await tx.subscription.upsert({
        where: {
          companyId: company.id,
        },
        update: {
          plan: plan.id,
          status: 'active',
          currentPeriodEnd,
          graceUntil: null,
        },
        create: {
          companyId: company.id,
          plan: plan.id,
          status: 'active',
          currentPeriodEnd,
        },
      });

      await tx.company.update({
        where: { id: company.id },
        data: {
          plan: plan.id,
          status: 'active',
          graceUntil: null,
        },
      });

      return {
        paymentId: payment.id,
        plan: plan.id,
        cycle: dto.cycle,
        amount,
        currency: plan.currency || company.currency,
        paidAt: payment.createdAt,
        currentPeriodEnd,
      };
    });
  }
}
