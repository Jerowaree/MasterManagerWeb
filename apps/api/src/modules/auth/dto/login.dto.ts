import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsString, IsNumber } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email corporativo invalido' })
  email!: string;

  @IsNotEmpty({ message: 'La contrasena es requerida' })
  @MinLength(8, { message: 'La contrasena debe tener al menos 8 caracteres' })
  password!: string;

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
