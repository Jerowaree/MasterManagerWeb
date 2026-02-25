import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  IsString,
} from 'class-validator';
import { SaleStatus } from '../../../common/types/enums';
import { Type } from 'class-transformer';

export class CreateSaleItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class CreateSaleDto {
  @IsUUID()
  @IsNotEmpty()
  branchId!: string;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsNumber()
  @IsOptional()
  total?: number;

  @IsEnum(SaleStatus)
  @IsNotEmpty()
  status!: SaleStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  @IsOptional()
  items?: CreateSaleItemDto[];
}
