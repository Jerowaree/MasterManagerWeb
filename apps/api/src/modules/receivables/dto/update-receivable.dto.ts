import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ReceivableStatus } from '../../../common/types/enums';

export class UpdateReceivableDto {
  @IsOptional()
  @IsString()
  documentRef?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  reminderIntervalDays?: number;

  @IsOptional()
  @IsBoolean()
  remindersPaused?: boolean;

  @IsOptional()
  @IsEnum(ReceivableStatus)
  status?: ReceivableStatus;
}
