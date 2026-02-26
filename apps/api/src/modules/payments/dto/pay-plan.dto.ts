import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { BillingCycle } from '../constants/plan-catalog';

export class PayPlanDto {
  @IsString()
  @IsNotEmpty()
  planId!: string;

  @IsEnum(BillingCycle)
  cycle!: BillingCycle;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  currentPassword!: string;
}
