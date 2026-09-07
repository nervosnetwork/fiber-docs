'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { conceptTutorials } from './tutorial-registry';
import styles from './liquidity-labs.module.css';

const CHANNEL_CAPACITY = 1_000;

type LabId = 'directional-liquidity' | 'route-liquidity' | 'rebalance-liquidity';

function LabNavigation({ current }: { current: LabId }) {
  return (
    <nav aria-label="Liquidity labs" className={styles.labNavigation}>
      {conceptTutorials.map((tutorial, index) => (
        <a
          aria-current={tutorial.id === current ? 'page' : undefined}
          className={tutorial.id === current ? styles.currentLab : undefined}
          href={tutorial.href}
          key={tutorial.id}
        >
          <span>{index + 1}</span>
          {tutorial.shortTitle}
        </a>
      ))}
    </nav>
  );
}

function LabShell({
  current,
  eyebrow,
  lead,
  children,
}: {
  current: LabId;
  eyebrow: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.labShell}>
      <LabNavigation current={current} />
      <div className={styles.labLead}>
        <span>{eyebrow}</span>
        <p>{lead}</p>
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function ChannelBar({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: {
  leftLabel: string;
  leftValue: number;
  rightLabel: string;
  rightValue: number;
}) {
  const total = Math.max(1, leftValue + rightValue);
  const leftPercent = (leftValue / total) * 100;

  return (
    <div className={styles.channelVisual}>
      <div className={styles.channelLabels}>
        <div>
          <span>{leftLabel}</span>
          <strong>{leftValue} CKB</strong>
        </div>
        <span>{total.toLocaleString()} CKB capacity</span>
        <div>
          <span>{rightLabel}</span>
          <strong>{rightValue} CKB</strong>
        </div>
      </div>
      <div aria-label={`${leftLabel} ${leftValue} CKB, ${rightLabel} ${rightValue} CKB`} className={styles.channelBar}>
        <div className={styles.channelLeft} style={{ width: `${leftPercent}%` }} />
        <div className={styles.channelRight} style={{ width: `${100 - leftPercent}%` }} />
        <span className={styles.channelDivider} style={{ left: `${leftPercent}%` }} />
      </div>
    </div>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = 'CKB',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.numberControl}>
      <span>{label}</span>
      <div>
        <input
          max={max}
          min={min}
          onChange={(event) => onChange(Number(event.target.value))}
          step={step}
          type="number"
          value={value}
        />
        <small>{suffix}</small>
      </div>
    </label>
  );
}

type Prediction = 'success' | 'failure' | null;

export function DirectionalLiquidityLab() {
  const [aliceBalance, setAliceBalance] = useState(800);
  const [perspective, setPerspective] = useState<'alice' | 'bob'>('alice');
  const [direction, setDirection] = useState<'alice-bob' | 'bob-alice'>('alice-bob');
  const [amount, setAmount] = useState(100);
  const [advanced, setAdvanced] = useState(false);
  const [prediction, setPrediction] = useState<Prediction>(null);
  const [outcome, setOutcome] = useState<null | {
    success: boolean;
    correct: boolean | null;
    before: number;
    after: number;
    available: number;
  }>(null);

  const bobBalance = CHANNEL_CAPACITY - aliceBalance;
  const senderBalance = direction === 'alice-bob' ? aliceBalance : bobBalance;
  const reserve = advanced ? 20 : 0;
  const pending = advanced ? 50 : 0;
  const available = Math.max(0, senderBalance - reserve - pending);
  const viewedLocal = perspective === 'alice' ? aliceBalance : bobBalance;
  const viewedRemote = CHANNEL_CAPACITY - viewedLocal;
  const viewedOutbound = Math.max(0, viewedLocal - reserve - pending);

  const clearOutcome = () => setOutcome(null);

  const runPayment = () => {
    const succeeds = amount > 0 && amount <= available;
    const nextAlice = succeeds
      ? direction === 'alice-bob'
        ? aliceBalance - amount
        : aliceBalance + amount
      : aliceBalance;

    setOutcome({
      success: succeeds,
      correct: prediction ? prediction === (succeeds ? 'success' : 'failure') : null,
      before: aliceBalance,
      after: nextAlice,
      available,
    });
    if (succeeds) setAliceBalance(nextAlice);
  };

  const reset = () => {
    setAliceBalance(800);
    setPerspective('alice');
    setDirection('alice-bob');
    setAmount(100);
    setAdvanced(false);
    setPrediction(null);
    setOutcome(null);
  };

  return (
    <LabShell
      current="directional-liquidity"
      eyebrow="Liquidity lab · 1 of 3"
      lead="Channel capacity stays fixed while spendable liquidity moves from one side to the other. Change the state, make a prediction, then run the payment."
    >
      <div className={styles.labGrid}>
        <section className={styles.stage}>
          <div className={styles.stageHeader}>
            <div>
              <span>Channel state</span>
              <h2>Alice ↔ Bob</h2>
            </div>
            <button className={styles.subtleButton} onClick={reset} type="button">Reset</button>
          </div>

          <ChannelBar
            leftLabel="Alice"
            leftValue={aliceBalance}
            rightLabel="Bob"
            rightValue={bobBalance}
          />

          <label className={styles.rangeControl}>
            <span>Move the balance split</span>
            <input
              aria-label="Alice channel balance"
              max={1_000}
              min={0}
              onChange={(event) => {
                setAliceBalance(Number(event.target.value));
                clearOutcome();
              }}
              step={10}
              type="range"
              value={aliceBalance}
            />
          </label>

          <div className={styles.segmented}>
            <span>View as</span>
            <button aria-pressed={perspective === 'alice'} onClick={() => setPerspective('alice')} type="button">Alice</button>
            <button aria-pressed={perspective === 'bob'} onClick={() => setPerspective('bob')} type="button">Bob</button>
          </div>

          <div className={styles.metrics}>
            <Metric label="Local balance" value={`${viewedLocal} CKB`} />
            <Metric label="Estimated outbound" value={`${viewedOutbound} CKB`} detail={advanced ? 'After simulated constraints' : 'From this side'} />
            <Metric label="Estimated inbound" value={`${viewedRemote} CKB`} detail="From the remote side" />
          </div>

          <button
            aria-pressed={advanced}
            className={styles.disclosureButton}
            onClick={() => {
              setAdvanced((value) => !value);
              clearOutcome();
            }}
            type="button"
          >
            <span>Advanced constraints</span>
            <strong>{advanced ? 'On' : 'Off'}</strong>
          </button>

          {advanced && (
            <div className={styles.deductionPanel}>
              <div><span>Sender-side balance</span><strong>{senderBalance} CKB</strong></div>
              <div><span>Simulated channel reserve</span><strong>−20 CKB</strong></div>
              <div><span>Simulated pending outbound TLC</span><strong>−50 CKB</strong></div>
              <div><span>Estimated spendable</span><strong>{available} CKB</strong></div>
              <small>This is a teaching model. A live node may apply additional channel and routing constraints.</small>
            </div>
          )}
        </section>

        <aside className={styles.actionPanel}>
          <div className={styles.panelHeading}>
            <span>Payment challenge</span>
            <h2>Will this payment flow?</h2>
          </div>

          <div className={styles.directionButtons}>
            <button
              aria-pressed={direction === 'alice-bob'}
              onClick={() => { setDirection('alice-bob'); clearOutcome(); }}
              type="button"
            >Alice → Bob</button>
            <button
              aria-pressed={direction === 'bob-alice'}
              onClick={() => { setDirection('bob-alice'); clearOutcome(); }}
              type="button"
            >Bob → Alice</button>
          </div>

          <NumberControl
            label="Payment amount"
            max={1_000}
            min={1}
            onChange={(value) => { setAmount(value); clearOutcome(); }}
            value={amount}
          />

          <fieldset className={styles.predictionFieldset}>
            <legend>Make a prediction</legend>
            <button aria-pressed={prediction === 'success'} onClick={() => setPrediction('success')} type="button">It will succeed</button>
            <button aria-pressed={prediction === 'failure'} onClick={() => setPrediction('failure')} type="button">It will fail</button>
          </fieldset>

          <button className={styles.primaryButton} onClick={runPayment} type="button">Run payment</button>

          <div aria-live="polite" className={`${styles.resultPanel} ${outcome ? (outcome.success ? styles.resultSuccess : styles.resultFailure) : ''}`}>
            {!outcome ? (
              <p>Choose a direction and amount, then test your prediction.</p>
            ) : outcome.success ? (
              <>
                <span>{outcome.correct === null ? 'Payment succeeded' : outcome.correct ? 'Correct · payment succeeded' : 'Payment succeeded · revise your prediction'}</span>
                <strong>{amount} CKB crossed the channel</strong>
                <p>Alice&apos;s side changed from {outcome.before} to {outcome.after} CKB. Total capacity is still 1,000 CKB.</p>
              </>
            ) : (
              <>
                <span>{outcome.correct === null ? 'Payment failed' : outcome.correct ? 'Correct · payment failed' : 'Payment failed · revise your prediction'}</span>
                <strong>Only {outcome.available} CKB is available in this direction</strong>
                <p>The requested {amount} CKB is larger than the sender&apos;s estimated outbound liquidity.</p>
              </>
            )}
          </div>
        </aside>
      </div>
    </LabShell>
  );
}

type RouteMode = 'single' | 'mpp';
type RouteScenario = 'single' | 'mpp' | 'receiver';

type RouteState = {
  id: string;
  name: string;
  nodes: string;
  advertised: number;
  available: number;
  fee: number;
};

type RouteQuote = {
  success: boolean;
  fee: number;
  allocations: Record<string, number>;
  title: string;
  detail: string;
};

const INITIAL_ROUTES: RouteState[] = [
  { id: 'north', name: 'North route', nodes: 'Alice → R1 → Merchant', advertised: 500, available: 120, fee: 2 },
  { id: 'middle', name: 'Middle route', nodes: 'Alice → R2 → Merchant', advertised: 420, available: 100, fee: 1 },
  { id: 'south', name: 'South route', nodes: 'Alice → R3 → Merchant', advertised: 360, available: 80, fee: 1 },
];

const ROUTE_SCENARIOS: Record<RouteScenario, { title: string; goal: string; hint: string }> = {
  single: {
    title: 'One route is enough',
    goal: 'Send 100 CKB from Alice to the Merchant.',
    hint: 'At least one direction has enough liquidity, so a single route can complete the payment.',
  },
  mpp: {
    title: 'Split across routes',
    goal: 'Send 300 CKB from Alice to the Merchant.',
    hint: 'No route can carry 300 CKB alone. Combine 120 + 100 + 80 CKB with MPP.',
  },
  receiver: {
    title: 'Receiver inbound is too low',
    goal: 'Try to send 300 CKB when the Merchant can receive only 250 CKB.',
    hint: 'The routes add up to 300 CKB, but every part must still fit through the receiver’s inbound liquidity.',
  },
};

function buildRouteQuote(
  routes: RouteState[],
  mode: RouteMode,
  amount: number,
  feeCap: number,
  merchantInbound: number,
): RouteQuote {
  if (merchantInbound < amount) {
    return {
      success: false,
      fee: 0,
      allocations: {},
      title: 'Receiver-side inbound liquidity is the bottleneck',
      detail: `The Merchant can receive ${merchantInbound} CKB, below the requested ${amount} CKB. Splitting cannot create the missing inbound liquidity.`,
    };
  }

  if (mode === 'single') {
    const candidate = [...routes]
      .filter((route) => route.available >= amount)
      .sort((a, b) => a.fee - b.fee)[0];

    if (!candidate) {
      const largest = Math.max(...routes.map((route) => route.available));
      return {
        success: false,
        fee: 0,
        allocations: {},
        title: 'No single route can carry the payment',
        detail: `The largest route exposes ${largest} CKB. The network has ${routes.reduce((sum, route) => sum + route.available, 0)} CKB across several routes, so try MPP.`,
      };
    }

    if (candidate.fee > feeCap) {
      return {
        success: false,
        fee: candidate.fee,
        allocations: { [candidate.id]: amount },
        title: 'The route fits, but the fee cap is too low',
        detail: `${candidate.name} quotes ${candidate.fee} CKB while the current cap is ${feeCap} CKB.`,
      };
    }

    return {
      success: true,
      fee: candidate.fee,
      allocations: { [candidate.id]: amount },
      title: `${candidate.name} can carry the payment`,
      detail: `${amount} CKB uses one route with an estimated ${candidate.fee} CKB routing fee.`,
    };
  }

  let remaining = amount;
  const allocations: Record<string, number> = {};
  let fee = 0;
  for (const route of routes) {
    const allocation = Math.min(remaining, route.available);
    if (allocation > 0) {
      allocations[route.id] = allocation;
      fee += route.fee;
      remaining -= allocation;
    }
  }

  if (remaining > 0) {
    const total = routes.reduce((sum, route) => sum + route.available, 0);
    return {
      success: false,
      fee,
      allocations,
      title: 'All routes together are still too small',
      detail: `MPP can combine ${total} CKB, leaving ${remaining} CKB unfunded.`,
    };
  }

  if (fee > feeCap) {
    return {
      success: false,
      fee,
      allocations,
      title: 'MPP finds capacity, but exceeds the fee cap',
      detail: `${Object.keys(allocations).length} parts cost an estimated ${fee} CKB; the cap is ${feeCap} CKB.`,
    };
  }

  return {
    success: true,
    fee,
    allocations,
    title: `MPP combines ${Object.keys(allocations).length} routes`,
    detail: `${Object.values(allocations).join(' + ')} = ${amount} CKB, with an estimated ${fee} CKB total fee.`,
  };
}

export function RouteLiquidityLab() {
  const [routes, setRoutes] = useState<RouteState[]>(INITIAL_ROUTES);
  const [scenario, setScenario] = useState<RouteScenario>('mpp');
  const [mode, setMode] = useState<RouteMode>('mpp');
  const [amount, setAmount] = useState(300);
  const [feeCap, setFeeCap] = useState(5);
  const [merchantInbound, setMerchantInbound] = useState(400);
  const [revealLiquidity, setRevealLiquidity] = useState(true);
  const [quote, setQuote] = useState<RouteQuote | null>(null);
  const [executed, setExecuted] = useState(false);

  const clearQuote = () => { setQuote(null); setExecuted(false); };

  const applyPreset = (preset: RouteScenario) => {
    setRoutes(INITIAL_ROUTES);
    setScenario(preset);
    setFeeCap(5);
    setRevealLiquidity(true);
    setQuote(null);
    setExecuted(false);
    if (preset === 'single') {
      setMode('single');
      setAmount(100);
      setMerchantInbound(400);
    } else if (preset === 'mpp') {
      setMode('mpp');
      setAmount(300);
      setMerchantInbound(400);
    } else {
      setMode('mpp');
      setAmount(300);
      setMerchantInbound(250);
    }
  };

  const preview = () => {
    setQuote(buildRouteQuote(routes, mode, amount, feeCap, merchantInbound));
    setExecuted(false);
  };

  const execute = () => {
    if (!quote?.success) return;
    setRoutes((current) => current.map((route) => ({
      ...route,
      available: route.available - (quote.allocations[route.id] ?? 0),
    })));
    setMerchantInbound((current) => current - amount);
    setExecuted(true);
  };

  const reset = () => {
    setRoutes(INITIAL_ROUTES);
    setScenario('mpp');
    setMode('mpp');
    setAmount(300);
    setFeeCap(5);
    setMerchantInbound(400);
    setRevealLiquidity(true);
    setQuote(null);
    setExecuted(false);
  };

  return (
    <LabShell
      current="route-liquidity"
      eyebrow="Liquidity lab · 2 of 3"
      lead="Your job is to move a payment from Alice to the Merchant. Compare what one route can carry with what several routes can carry together."
    >
      <div className={styles.presetRow}>
        <span>Choose a challenge</span>
        <button aria-pressed={scenario === 'single'} onClick={() => applyPreset('single')} type="button">1 · One route is enough</button>
        <button aria-pressed={scenario === 'mpp'} onClick={() => applyPreset('mpp')} type="button">2 · Split across routes</button>
        <button aria-pressed={scenario === 'receiver'} onClick={() => applyPreset('receiver')} type="button">3 · Receiver inbound is too low</button>
        <button className={styles.resetPreset} onClick={reset} type="button">Reset</button>
      </div>

      <section className={styles.missionBanner}>
        <span>Current goal</span>
        <div>
          <h2>{ROUTE_SCENARIOS[scenario].goal}</h2>
          <p>{ROUTE_SCENARIOS[scenario].hint}</p>
        </div>
        <strong>{ROUTE_SCENARIOS[scenario].title}</strong>
      </section>

      <div className={styles.routeGrid}>
        <section className={styles.stage}>
          <div className={styles.stageHeader}>
            <div>
              <span>Step 1 · Inspect the routes</span>
              <h2>Alice → Merchant</h2>
            </div>
            <button
              className={styles.subtleButton}
              onClick={() => setRevealLiquidity((value) => !value)}
              type="button"
            >
              {revealLiquidity ? 'Show advertised capacity' : 'Show directional liquidity'}
            </button>
          </div>

          <div className={styles.routeEndpoints}>
            <strong>Alice</strong>
            <span>Directional route candidates</span>
            <strong>Merchant</strong>
          </div>

          <div className={styles.routeEquation}>
            <Metric label="Payment required" value={`${amount} CKB`} />
            <Metric label="Largest single route" value={`${Math.max(...routes.map((route) => route.available))} CKB`} />
            <Metric label="All routes combined" value={`${routes.reduce((sum, route) => sum + route.available, 0)} CKB`} />
            <Metric label="Receiver can accept" value={`${merchantInbound} CKB`} />
          </div>

          <div className={styles.routeList}>
            {routes.map((route) => {
              const allocation = quote?.allocations[route.id] ?? 0;
              return (
                <div className={`${styles.routeCard} ${allocation ? styles.routeAllocated : ''}`} key={route.id}>
                  <div>
                    <span>{route.name}</span>
                    <strong>{route.nodes}</strong>
                  </div>
                  <div className={styles.routeValues}>
                    <span>{revealLiquidity ? 'Directional available' : 'Advertised capacity'}</span>
                    <strong>{revealLiquidity ? route.available : route.advertised} CKB</strong>
                    <small>{revealLiquidity ? `Fee quote ${route.fee} CKB` : 'Direction is not advertised'}</small>
                  </div>
                  {allocation > 0 && <b>{allocation} CKB part</b>}
                </div>
              );
            })}
          </div>

          <div className={styles.receiverMeter}>
            <div>
              <span>Merchant inbound liquidity</span>
              <strong>{merchantInbound} CKB</strong>
            </div>
            <div><span style={{ width: `${Math.min(100, merchantInbound / 4)}%` }} /></div>
            <small>Every split still has to reach the receiver.</small>
          </div>
        </section>

        <aside className={styles.actionPanel}>
          <div className={styles.panelHeading}>
            <span>Step 2 · Choose a strategy</span>
            <h2>One route or several?</h2>
          </div>

          <div className={styles.directionButtons}>
            <button
              aria-pressed={mode === 'single'}
              onClick={() => { setMode('single'); clearQuote(); }}
              type="button"
            >Single path</button>
            <button
              aria-pressed={mode === 'mpp'}
              onClick={() => { setMode('mpp'); clearQuote(); }}
              type="button"
            >MPP · max 3 parts</button>
          </div>

          <div className={styles.controlPair}>
            <NumberControl label="Payment" max={600} min={10} onChange={(value) => { setAmount(value); clearQuote(); }} step={10} value={amount} />
            <NumberControl label="Fee cap" max={20} min={0} onChange={(value) => { setFeeCap(value); clearQuote(); }} value={feeCap} />
          </div>

          <label className={styles.rangeControl}>
            <span>Receiver inbound · {merchantInbound} CKB</span>
            <input
              max={500}
              min={0}
              onChange={(event) => { setMerchantInbound(Number(event.target.value)); clearQuote(); }}
              step={10}
              type="range"
              value={merchantInbound}
            />
          </label>

          <button className={styles.primaryButton} onClick={preview} type="button">Preview route</button>

          <div aria-live="polite" className={`${styles.resultPanel} ${quote ? (quote.success ? styles.resultSuccess : styles.resultFailure) : ''}`}>
            {!quote ? (
              <>
                <span>Step 3 · Preview the outcome</span>
                <strong>Compare the four numbers on the left</strong>
                <p>Then preview the route to see whether the selected strategy, receiver inbound liquidity, and fee cap can complete the payment.</p>
              </>
            ) : (
              <>
                <span>{quote.success ? 'Route available' : 'Route unavailable'}</span>
                <strong>{quote.title}</strong>
                <p>{quote.detail}</p>
              </>
            )}
          </div>

          <button className={styles.secondaryButton} disabled={!quote?.success || executed} onClick={execute} type="button">
            {executed ? 'Payment completed' : 'Run simulated payment'}
          </button>
          {executed && <p className={styles.executionNote}>The used directions and the Merchant&apos;s remaining inbound liquidity have been reduced. Preview the same payment again to see the changed network.</p>}
        </aside>
      </div>
    </LabShell>
  );
}

type RebalanceQuote = {
  success: boolean;
  fee: number;
  title: string;
  detail: string;
};

export function RebalanceLiquidityLab() {
  const [bobLocal, setBobLocal] = useState(900);
  const [carolLocal, setCarolLocal] = useState(100);
  const [amount, setAmount] = useState(300);
  const [feeCap, setFeeCap] = useState(3);
  const [quote, setQuote] = useState<RebalanceQuote | null>(null);
  const [completed, setCompleted] = useState(false);

  const estimatedFee = Math.max(1, Math.ceil(amount * 0.005));
  const carolRemote = CHANNEL_CAPACITY - carolLocal;
  const totalLocal = bobLocal + carolLocal;

  const projected = useMemo(() => ({
    bob: bobLocal - amount - estimatedFee,
    carol: carolLocal + amount,
    total: totalLocal - estimatedFee,
  }), [amount, bobLocal, carolLocal, estimatedFee, totalLocal]);

  const clearQuote = () => { setQuote(null); setCompleted(false); };

  const preview = () => {
    if (estimatedFee > feeCap) {
      setQuote({ success: false, fee: estimatedFee, title: 'Fee cap is too low', detail: `The simulated route quotes ${estimatedFee} CKB, above the ${feeCap} CKB cap.` });
    } else if (amount + estimatedFee > bobLocal) {
      setQuote({ success: false, fee: estimatedFee, title: 'The outgoing channel is too small', detail: `The Bob channel needs ${amount + estimatedFee} CKB for the rebalance and fee, but has ${bobLocal} CKB local.` });
    } else if (amount > carolRemote) {
      setQuote({ success: false, fee: estimatedFee, title: 'The return direction is too small', detail: `Carol can send at most ${carolRemote} CKB back to this node.` });
    } else {
      setQuote({ success: true, fee: estimatedFee, title: 'A circular route is available', detail: `${amount} CKB can leave through Bob and return through Carol for an estimated ${estimatedFee} CKB fee.` });
    }
    setCompleted(false);
  };

  const execute = () => {
    if (!quote?.success) return;
    setBobLocal(projected.bob);
    setCarolLocal(projected.carol);
    setCompleted(true);
  };

  const reset = () => {
    setBobLocal(900);
    setCarolLocal(100);
    setAmount(300);
    setFeeCap(3);
    setQuote(null);
    setCompleted(false);
  };

  return (
    <LabShell
      current="rebalance-liquidity"
      eyebrow="Liquidity lab · 3 of 3"
      lead="A circular payment shifts local balance from one channel to another. Your node does not gain funds; it pays a routing fee to improve where its liquidity is available."
    >
      <div className={styles.labGrid}>
        <section className={styles.stage}>
          <div className={styles.stageHeader}>
            <div>
              <span>Routing node</span>
              <h2>Move liquidity without closing channels</h2>
            </div>
            <button className={styles.subtleButton} onClick={reset} type="button">Reset</button>
          </div>

          <div className={`${styles.circularRoute} ${quote?.success ? styles.circularRouteActive : ''}`}>
            <strong>You</strong><span>→</span><strong>Bob</strong><span>→</span><strong>Network</strong><span>→</span><strong>Carol</strong><span>→</span><strong>You</strong>
          </div>

          <div className={styles.channelStack}>
            <ChannelBar leftLabel="You · Bob channel" leftValue={bobLocal} rightLabel="Bob" rightValue={CHANNEL_CAPACITY - bobLocal} />
            <ChannelBar leftLabel="You · Carol channel" leftValue={carolLocal} rightLabel="Carol" rightValue={CHANNEL_CAPACITY - carolLocal} />
          </div>

          <div className={styles.metrics}>
            <Metric label="Node local total" value={`${totalLocal} CKB`} detail="Across both channels" />
            <Metric label="Bob outbound" value={`${bobLocal} CKB`} detail="Source direction" />
            <Metric label="Carol outbound" value={`${carolLocal} CKB`} detail="Destination direction" />
          </div>

          {quote?.success && !completed && (
            <div className={styles.projectionPanel}>
              <span>Projected after rebalance</span>
              <div><strong>Bob channel</strong><b>{bobLocal} → {projected.bob} CKB local</b></div>
              <div><strong>Carol channel</strong><b>{carolLocal} → {projected.carol} CKB local</b></div>
              <div><strong>Node total</strong><b>{totalLocal} → {projected.total} CKB</b></div>
            </div>
          )}
        </section>

        <aside className={styles.actionPanel}>
          <div className={styles.panelHeading}>
            <span>Dry run</span>
            <h2>Quote the circular payment</h2>
          </div>

          <div className={styles.controlPair}>
            <NumberControl label="Rebalance amount" max={900} min={10} onChange={(value) => { setAmount(value); clearQuote(); }} step={10} value={amount} />
            <NumberControl label="Max fee" max={20} min={0} onChange={(value) => { setFeeCap(value); clearQuote(); }} value={feeCap} />
          </div>

          <div className={styles.quoteFacts}>
            <div><span>Leaves through</span><strong>Bob channel</strong></div>
            <div><span>Returns through</span><strong>Carol channel</strong></div>
            <div><span>Simulated route quote</span><strong>{estimatedFee} CKB</strong></div>
          </div>

          <button className={styles.primaryButton} onClick={preview} type="button">Preview rebalance</button>

          <div aria-live="polite" className={`${styles.resultPanel} ${quote ? (quote.success ? styles.resultSuccess : styles.resultFailure) : ''}`}>
            {!quote ? <p>Preview checks the outgoing balance, return direction, and fee cap without moving funds.</p> : (
              <>
                <span>{quote.success ? 'Dry run succeeded' : 'Dry run failed'}</span>
                <strong>{quote.title}</strong>
                <p>{quote.detail}</p>
              </>
            )}
          </div>

          <button className={styles.secondaryButton} disabled={!quote?.success || completed} onClick={execute} type="button">
            {completed ? 'Rebalance completed' : 'Run simulated rebalance'}
          </button>
          {completed && <p className={styles.executionNote}>The node&apos;s local total fell only by the routing fee. Liquidity moved from the Bob channel to the Carol channel.</p>}

          <details className={styles.codeDisclosure}>
            <summary>Map this lab to Fiber RPC</summary>
            <pre><code>{`await node.sendPayment({
  target_pubkey: myPubkey,
  amount,
  keysend: true,
  allow_self_payment: true,
  dry_run: true,
  max_fee_amount: maxFee,
});`}</code></pre>
            <p>After execution, call <code>list_channels</code> to compare local and remote balances.</p>
          </details>
        </aside>
      </div>
    </LabShell>
  );
}
