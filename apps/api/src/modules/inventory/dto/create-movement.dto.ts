import { IsString, IsNotEmpty, IsNumber, IsEnum, IsUUID } from 'class-validator';
import { MovementType } from '@master-manager/database';

export class CreateMovementDto {
  @IsUUID()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsEnum(MovementType)
  @IsNotEmpty()
  type!: MovementType;

  @IsNumber()
  @IsNotEmpty()
  quantity!: number;

  @IsNumber()
  @IsNotEmpty()
  unitCost!: number;
}
