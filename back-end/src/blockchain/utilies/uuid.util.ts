export function uuidToUint(uuid: string): bigint {
  return BigInt('0x' + uuid.replace(/-/g, ''));
}