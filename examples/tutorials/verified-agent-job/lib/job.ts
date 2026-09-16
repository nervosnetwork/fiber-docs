export type WorkerResult = {
  routeA: number;
  routeB: number;
  routeC: number;
};

export type VerificationCheck = { label: string; passed: boolean };

export const job = {
  amount: 300,
  limits: { routeA: 120, routeB: 100, routeC: 80 },
} as const;

export const validResult: WorkerResult = { routeA: 120, routeB: 100, routeC: 80 };
export const faultyResult: WorkerResult = { routeA: 150, routeB: 100, routeC: 50 };

export function verifyResult(result: WorkerResult): VerificationCheck[] {
  const values = [result.routeA, result.routeB, result.routeC];
  return [
    { label: 'Result has exactly the required JSON fields', passed: Object.keys(result).sort().join(',') === 'routeA,routeB,routeC' },
    { label: 'Every allocation is a non-negative integer', passed: values.every((value) => Number.isInteger(value) && value >= 0) },
    { label: 'Route A stays within 120 CKB', passed: result.routeA <= job.limits.routeA },
    { label: 'Route B stays within 100 CKB', passed: result.routeB <= job.limits.routeB },
    { label: 'Route C stays within 80 CKB', passed: result.routeC <= job.limits.routeC },
    { label: 'The allocations total exactly 300 CKB', passed: result.routeA + result.routeB + result.routeC === job.amount },
  ];
}
