import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { SaleStatus } from '../../../common/types/enums';

export class CreateSaleDto {
  @IsUUID()
  @IsNotEmpty()
  branchId!: string;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsNumber()
  @IsNotEmpty()
  total!: number;

  @IsEnum(SaleStatus)
  @IsNotEmpty()
  status!: SaleStatus;
}
