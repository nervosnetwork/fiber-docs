type FundingScript = {
  args: string;
  code_hash: string;
  hash_type: string;
};

export async function queryCkbBalance(script: FundingScript) {
  const response = await fetch('https://testnet.ckbapp.dev/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'get_cells_capacity',
      params: [{ script, script_type: 'lock' }],
    }),
  });
  if (!response.ok) throw new Error('Unable to read the Testnet balance.');
  const payload = await response.json() as {
    error?: { message?: string };
    result?: { capacity?: string };
  };
  if (!payload.result?.capacity) {
    throw new Error(payload.error?.message ?? 'Unable to read the Testnet balance.');
  }
  return BigInt(payload.result.capacity);
}

export function formatCkb(balance: bigint | null) {
  if (balance === null) return 'Checking…';
  const value = Number(balance) / 100_000_000;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 8 })} CKB`;
}
