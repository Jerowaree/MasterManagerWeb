import { IsString, MinLength, IsNotEmpty, Matches } from 'class-validator';
import { PASSWORD_MIN_LENGTH, PASSWORD_POLICY } from '../../../common/utils/password-policy.utils';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, { message: 'La nueva contrasena debe tener al menos 8 caracteres' })
  @Matches(PASSWORD_POLICY.uppercase, { message: 'La nueva contrasena debe incluir una mayuscula' })
  @Matches(PASSWORD_POLICY.lowercase, { message: 'La nueva contrasena debe incluir una minuscula' })
  @Matches(PASSWORD_POLICY.number, { message: 'La nueva contrasena debe incluir un numero' })
  @Matches(PASSWORD_POLICY.symbol, { message: 'La nueva contrasena debe incluir un simbolo' })
  newPassword!: string;
}
