const SHANNONS_PER_CKB = 100_000_000n;

export function ckbToHex(value: string) {
  if (!/^\d+(\.\d{1,8})?$/.test(value)) throw new Error('Invalid CKB amount');
  const [whole, fraction = ''] = value.split('.');
  const shannons =
    BigInt(whole) * SHANNONS_PER_CKB + BigInt(fraction.padEnd(8, '0'));
  return `0x${shannons.toString(16)}` as `0x${string}`;
}

export function hexToCkb(value: string) {
  const shannons = BigInt(value);
  const whole = shannons / SHANNONS_PER_CKB;
  const fraction = (shannons % SHANNONS_PER_CKB)
    .toString()
    .padStart(8, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
