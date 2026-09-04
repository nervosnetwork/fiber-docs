type FundingScript = { code_hash: string; hash_type: string; args: string };
export async function queryCkbBalance(script: FundingScript) {
  const response = await fetch('https://testnet.ckbapp.dev/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'get_cells_capacity', params: [{ script, script_type: 'lock' }] }) });
  const payload = await response.json();
  return BigInt(payload.result.capacity);
}

export function watchCkbBalance(
  script: FundingScript,
  onBalance: (balance: bigint) => void,
) {
  let active = true;
  let checking = false;
  const check = async () => {
    if (!active || checking || document.visibilityState !== 'visible') return;
    checking = true;
    try {
      onBalance(await queryCkbBalance(script));
    } finally {
      checking = false;
    }
  };

  void check();
  const timer = window.setInterval(() => void check(), 5_000);
  document.addEventListener('visibilitychange', check);
  return () => {
    active = false;
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', check);
  };
}
