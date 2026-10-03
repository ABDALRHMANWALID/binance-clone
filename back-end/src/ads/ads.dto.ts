import { Transform, Type } from 'class-transformer';
import {
    ArrayMaxSize, ArrayNotEmpty, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, MaxLength, Min, Max,
    isNumber,
} from 'class-validator';

const DECIMAL = /^\d+(\.\d{1,6})?$/;
const DECIMAL_MSG = 'must be a positive number with up to 6 decimals';
const toStr = ({ value }: { value: unknown }) => (typeof value === 'number' ? String(value) : value);

export class CreateAdDto {
    @IsIn(['buy', 'sell'])
    side: 'buy' | 'sell';

    @IsOptional() @IsIn(['USDT'])
    asset?: string;

    @IsOptional() @IsIn(['EGP'])
    fiat?: string;

    @Transform(toStr) @Matches(DECIMAL, { message: `price ${DECIMAL_MSG}` })
    price: string;

    /** بالـ USDT (مثلاً "1000")، السيرفر بيحولها لـ raw units */
    @Transform(toStr) @Matches(DECIMAL, { message: `total ${DECIMAL_MSG}` })
    total: string;

    @Transform(toStr) @Matches(DECIMAL, { message: `minFiat ${DECIMAL_MSG}` })
    minFiat: string;

    @Transform(toStr) @Matches(DECIMAL, { message: `maxFiat ${DECIMAL_MSG}` })
    maxFiat: string;

    @IsArray()
    @ArrayNotEmpty()
    @ArrayMaxSize(10)
    @IsInt({ each: true })
    @Min(1, { each: true })
    paymentMethodIds?: number[];
}

export class UpdateAdDto {
    @IsOptional() @Transform(toStr) @Matches(DECIMAL, { message: `price ${DECIMAL_MSG}` })
    price?: string;

    @IsOptional() @Transform(toStr) @Matches(DECIMAL, { message: `total ${DECIMAL_MSG}` })
    total?: string;

    @IsOptional() @Transform(toStr) @Matches(DECIMAL, { message: `minFiat ${DECIMAL_MSG}` })
    minFiat?: string;

    @IsOptional() @Transform(toStr) @Matches(DECIMAL, { message: `maxFiat ${DECIMAL_MSG}` })
    maxFiat?: string;

    @IsOptional() @IsIn(['active', 'paused'])
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
    @IsOptional() @IsIn(['USDT'])
    asset?: string;

    @IsOptional() @IsString() @MaxLength(10)
    fiat?: string;

    /** نوع طريقة الدفع: vodafone_cash, bank ... */
    @IsOptional() @IsString() @MaxLength(50)
    paymentMethod?: string;

    /** أقل كمية متبقية بالـ USDT */
    @IsOptional() @Transform(toStr) @Matches(DECIMAL, { message: `minRemaining ${DECIMAL_MSG}` })
    minRemaining?: string;

    @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
    limit?: number;

    @IsOptional() @Type(() => Number) @IsInt() @Min(0)
    offset?: number;
}
