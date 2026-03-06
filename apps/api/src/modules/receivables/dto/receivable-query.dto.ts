import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { BranchPaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ReceivableStatus } from '../../../common/types/enums';

export class ReceivableQueryDto extends BranchPaginationQueryDto {
  @IsOptional()
  @IsEnum(ReceivableStatus)
  status?: ReceivableStatus;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  dueFrom?: string;

  @IsOptional()
  @IsString()
  dueTo?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
