/** الـ API بيرجع المبالغ raw (USDT = 6 decimals): "1000000000" → "1,000" */
export function formatUnits6(raw: string): string {
  const n = BigInt(raw);
  const whole = n / 1_000_000n;
  const frac = (n % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return frac ? `${whole.toLocaleString('en-US')}.${frac}` : whole.toLocaleString('en-US');
}

/** "50.500000" → "50.5"، و"500.000000" → "500" */
export function trimDecimals(value: string): string {
  return value.includes('.') ? value.replace(/\.?0+$/, '') : value;
}

/** العكس: للـ AdForm في وضع التعديل. raw → "1000" (من غير فواصل) */
export function rawToInput(raw: string): string {
  return formatUnits6(raw).replace(/,/g, '');
}
