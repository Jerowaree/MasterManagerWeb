import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCompanySettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

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

  @IsOptional()
  @IsString()
  @MinLength(8)
  currentPassword?: string;

  @IsOptional()
  @IsBoolean()
  confirmAction?: boolean;
}
