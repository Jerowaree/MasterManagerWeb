import { IsString, IsNotEmpty, IsNumber, IsEnum, IsUUID, Min } from 'class-validator';
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
  @Min(0.01)
  quantity!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  unitCost!: number;
}
