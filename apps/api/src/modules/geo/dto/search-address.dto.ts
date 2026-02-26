import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SearchAddressDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  q!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  countryCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number;
}
