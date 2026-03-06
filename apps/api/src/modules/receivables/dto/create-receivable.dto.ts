import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateReceivableDto {
  @IsUUID()
  branchId!: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  saleId?: string;

  @IsOptional()
  @IsString()
  documentRef?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  totalAmount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsString()
  dueDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  reminderIntervalDays?: number;

  @IsOptional()
  @IsBoolean()
  remindersPaused?: boolean;
}
