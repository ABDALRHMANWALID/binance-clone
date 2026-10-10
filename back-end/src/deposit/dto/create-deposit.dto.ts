import {
  IsIn,
  IsString,
} from 'class-validator';

export class CreateDepositDto {
  @IsString()
  @IsIn(['USDT','ETH'])
  asset: string;

  @IsString()
  @IsIn(['Sepolia'])
  network: string;
}