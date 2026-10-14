import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const FIAT_DECIMAL = /^\d+(\.\d{1,6})?$/;
const ASSET_DECIMAL = /^\d+(\.\d{1,18})?$/;
const FIAT_MSG = 'must be a positive number with up to 6 decimals';
const ASSET_MSG = 'must be a positive number with up to 18 decimals';

const toStr = ({ value }: { value: unknown }) =>
  typeof value === 'number' ? String(value) : value;

export class CreateAdDto {
  @IsIn(['buy', 'sell'])
  side: 'buy' | 'sell';

  @IsOptional()
  @IsIn(['USDT', 'ETH'])
  asset?: string;

  @IsOptional()
  @IsIn(['EGP'])
  fiat?: string;

  @Transform(toStr)
  @Matches(FIAT_DECIMAL, { message: `price ${FIAT_MSG}` })
  price: string;

  /** in asset units, e.g. "0.5" ETH */
  @Transform(toStr)
  @Matches(ASSET_DECIMAL, { message: `total ${ASSET_MSG}` })
  total: string;

  @Transform(toStr)
  @Matches(FIAT_DECIMAL, { message: `minFiat ${FIAT_MSG}` })
  minFiat: string;

  @Transform(toStr)
  @Matches(FIAT_DECIMAL, { message: `maxFiat ${FIAT_MSG}` })
  maxFiat: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  @Min(1, { each: true })
  paymentMethodIds: number[];
}

export class UpdateAdDto {
  @IsOptional()
  @Transform(toStr)
  @Matches(FIAT_DECIMAL, { message: `price ${FIAT_MSG}` })
  price?: string;

  @IsOptional()
  @Transform(toStr)
  @Matches(ASSET_DECIMAL, { message: `total ${ASSET_MSG}` })
  total?: string;

  @IsOptional()
  @Transform(toStr)
  @Matches(FIAT_DECIMAL, { message: `minFiat ${FIAT_MSG}` })
  minFiat?: string;

  @IsOptional()
  @Transform(toStr)
  @Matches(FIAT_DECIMAL, { message: `maxFiat ${FIAT_MSG}` })
  maxFiat?: string;

  @IsOptional()
  @IsIn(['active', 'paused'])
  status?: 'active' | 'paused';

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  @Min(1, { each: true })
  paymentMethodIds?: number[];
}

export class ListAdsQueryDto {
  @IsOptional()
  @IsIn(['USDT', 'ETH'])
  asset?: string;

  /** payment method name, e.g. vodafone_cash */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  /** minimum remaining amount, in asset units */
  @IsOptional()
  @Transform(toStr)
  @Matches(ASSET_DECIMAL, { message: `minRemaining ${ASSET_MSG}` })
  minRemaining?: string;
}
