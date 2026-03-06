import { IsEmail, IsString, IsNotEmpty, MinLength, IsOptional, Matches, IsNumber } from 'class-validator';
import { PASSWORD_MIN_LENGTH, PASSWORD_POLICY } from '../../../common/utils/password-policy.utils';

export class RegisterDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: 'La contrasena debe tener al menos 8 caracteres' })
  @Matches(PASSWORD_POLICY.uppercase, { message: 'La contrasena debe incluir una mayuscula' })
  @Matches(PASSWORD_POLICY.lowercase, { message: 'La contrasena debe incluir una minuscula' })
  @Matches(PASSWORD_POLICY.number, { message: 'La contrasena debe incluir un numero' })
  @Matches(PASSWORD_POLICY.symbol, { message: 'La contrasena debe incluir un simbolo' })
  password!: string;

  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsString()
  @IsNotEmpty()
  timezone!: string;

  @IsString()
  @IsOptional()
  branchName?: string;

  @IsOptional()
  @IsString()
  captchaToken?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsNumber()
  submissionStartedAt?: number;
}
