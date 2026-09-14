const SHANNONS_PER_CKB = 100_000_000n;
export function ckbToHex(value: string) {
  if (!/^\d+(\.\d{1,8})?$/.test(value)) throw new Error('Enter a valid CKB amount');
  const [whole, fraction = ''] = value.split('.');
  const shannons = BigInt(whole) * SHANNONS_PER_CKB + BigInt(fraction.padEnd(8, '0'));
  if (shannons <= 0n) throw new Error('Amount must be positive');
  return `0x${shannons.toString(16)}` as `0x${string}`;
}
