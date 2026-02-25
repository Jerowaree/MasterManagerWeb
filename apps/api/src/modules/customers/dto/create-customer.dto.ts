import { IsString, IsNotEmpty, IsEmail, IsOptional, IsUUID } from 'class-validator';

export class CreateCustomerDto {
  @IsUUID()
  @IsNotEmpty()
  branchId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  documentType!: string;

  @IsString()
  @IsNotEmpty()
  documentNumber!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;
}
