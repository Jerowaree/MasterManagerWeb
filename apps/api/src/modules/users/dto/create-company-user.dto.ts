import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength, Matches } from 'class-validator';
import { PASSWORD_MIN_LENGTH, PASSWORD_POLICY } from '../../../common/utils/password-policy.utils';

export class CreateCompanyUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: 'El usuario solo permite letras y numeros para evitar colisiones de correo',
  })
  username!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: 'La contrasena debe tener al menos 8 caracteres' })
  @Matches(PASSWORD_POLICY.uppercase, { message: 'La contrasena debe incluir una mayuscula' })
  @Matches(PASSWORD_POLICY.lowercase, { message: 'La contrasena debe incluir una minuscula' })
  @Matches(PASSWORD_POLICY.number, { message: 'La contrasena debe incluir un numero' })
  @Matches(PASSWORD_POLICY.symbol, { message: 'La contrasena debe incluir un simbolo' })
  password!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsIn(['admin', 'employee'])
  role?: 'admin' | 'employee';

  @IsOptional()
  @IsString()
  @MinLength(8)
  currentPassword?: string;

  @IsOptional()
  @IsBoolean()
  confirmAction?: boolean;
}
