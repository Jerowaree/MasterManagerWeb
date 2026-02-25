import { IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class UpdateCompanySettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/, {
    message: 'emailDomain debe ser un dominio valido, por ejemplo pepito.com',
  })
  emailDomain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string;
}
