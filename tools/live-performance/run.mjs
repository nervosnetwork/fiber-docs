import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import config from './config.cjs';

const sites = {
  fiber: 'https://www.fiber.world/',
  nervos: 'https://docs.nervos.org/',
  ckba: 'https://www.ckba.build/',
};
const site = process.argv[2];
if (!Object.hasOwn(sites, site)) throw new Error('Choose fiber, nervos or ckba');
if (!process.env.AUDIT_TOOLS || !process.env.CHROME_PATH) throw new Error('Auditing environment is not configured');
const tools = process.env.AUDIT_TOOLS;
const lighthouse = (await import(pathToFileURL(path.join(tools, 'node_modules/lighthouse/core/index.js')).href)).default;
const { launch } = await import(pathToFileURL(path.join(tools, 'node_modules/chrome-launcher/dist/index.js')).href);
const out = path.join('audit-results', site);
fs.mkdirSync(out, { recursive: true });
const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2));
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const environment = {
  capturedAt: new Date().toISOString(),
  lighthouseVersion: JSON.parse(fs.readFileSync(path.join(tools, 'node_modules/lighthouse/package.json'))).version,
  chromeVersion: execFileSync(process.env.CHROME_PATH, ['--version'], { encoding: 'utf8' }).trim(),
  nodeVersion: process.version,
  platform: os.platform(),
  architecture: os.arch(),
  cpuModel: os.cpus()[0]?.model,
  logicalCpuCount: os.cpus().length,
  totalMemoryBytes: os.totalmem(),
  runnerImage: process.env.ImageOS,
  runnerImageVersion: process.env.ImageVersion,
  workflowUrl: `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
  config,
};
write('environment.json', environment);

const valid = [];
const failures = [];
for (let run = 1; run <= 3; run++) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    let chrome;
    const stem = `run-${run}-attempt-${attempt}`;
    try {
      console.log(`${site}: starting run ${run}, attempt ${attempt}`);
      // A fresh isolated browser profile is created for every attempt.
      chrome = await launch({ chromePath: process.env.CHROME_PATH, chromeFlags: ['--headless=new'] });
      const result = await lighthouse(sites[site], { port: chrome.port, output: 'html', logLevel: 'error' }, config);
      if (!result) throw new Error('Lighthouse returned no result');
      const lhr = result.lhr;
      write(`${stem}.report.json`, lhr);
      fs.writeFileSync(path.join(out, `${stem}.report.html`), result.report);
      if (lhr.runtimeError) throw new Error(`${lhr.runtimeError.code}: ${lhr.runtimeError.message}`);
      if (!Number.isFinite(lhr.categories.performance.score)) throw new Error('No valid performance score');
      if (new URL(lhr.finalDisplayedUrl || lhr.finalUrl).hostname !== new URL(sites[site]).hostname) throw new Error('Unexpected final hostname');
      const value = id => lhr.audits[id]?.numericValue;
      for (const id of ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift']) {
        if (!Number.isFinite(value(id))) throw new Error(`Missing metric: ${id}`);
      }
      const screenshot = lhr.audits['final-screenshot']?.details?.data;
      if (screenshot?.startsWith('data:image/')) {
        fs.writeFileSync(path.join(out, `${stem}.jpg`), Buffer.from(screenshot.split(',')[1], 'base64'));
      }
      if (result.artifacts?.Trace) fs.writeFileSync(path.join(out, `${stem}.trace.json.gz`), gzipSync(JSON.stringify(result.artifacts.Trace)));
      if (result.artifacts?.DevtoolsLog) fs.writeFileSync(path.join(out, `${stem}.network.json.gz`), gzipSync(JSON.stringify(result.artifacts.DevtoolsLog)));
      const auditRefs = new Map(lhr.categories.performance.auditRefs.map(ref => [ref.id, ref]));
      const opportunities = Object.values(lhr.audits).filter(a =>
        auditRefs.has(a.id) && typeof a.score === 'number' && a.score < 0.9 && !['metric', 'hidden'].includes(auditRefs.get(a.id).group)
      ).map(a => ({
        id: a.id, title: a.title, score: a.score, displayValue: a.displayValue,
        estimatedLcpSavingsMs: a.metricSavings?.LCP,
        estimatedSavingsMs: a.details?.overallSavingsMs,
        estimatedSavingsBytes: a.details?.overallSavingsBytes,
      }));
      const row = {
        run, attempt, stem, fetchTime: lhr.fetchTime,
        scores: Object.fromEntries(Object.entries(lhr.categories).map(([k, v]) => [k, v.score * 100])),
        fcpMs: value('first-contentful-paint'), lcpMs: value('largest-contentful-paint'),
        tbtMs: value('total-blocking-time'), cls: value('cumulative-layout-shift'),
        speedIndexMs: value('speed-index'), totalTransferBytes: value('total-byte-weight'),
        benchmarkIndex: lhr.environment.benchmarkIndex,
        warnings: lhr.runWarnings, opportunities,
      };
      valid.push(row);
      console.log(JSON.stringify(row));
      break;
    } catch (error) {
      const failure = { run, attempt, message: error.message, stack: error.stack, capturedAt: new Date().toISOString() };
      failures.push(failure);
      write(`${stem}.error.json`, failure);
      console.error(`${site}: ${failure.message}`);
    } finally {
      if (chrome) await chrome.kill();
    }
  }
}

const fields = ['fcpMs', 'lcpMs', 'tbtMs', 'cls', 'speedIndexMs', 'totalTransferBytes', 'benchmarkIndex'];
const medians = valid.length ? Object.fromEntries(fields.map(key => [key, median(valid.map(r => r[key]))])) : {};
if (valid.length) medians.scores = Object.fromEntries(Object.keys(valid[0].scores).map(key => [key, median(valid.map(r => r.scores[key]))]));
const representative = valid.length ? [...valid].sort((a,b) => Math.abs(a.scores.performance-medians.scores.performance)-Math.abs(b.scores.performance-medians.scores.performance) || Math.abs(a.lcpMs-medians.lcpMs)-Math.abs(b.lcpMs-medians.lcpMs))[0].stem : null;
const summary = { site, url: sites[site], completedAt: new Date().toISOString(), validRuns: valid.length, medians, representative, runs: valid, failures, environment };
write('summary.json', summary);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n### ${site}\n\nValid runs: ${valid.length}/3\n\n\`\`\`json\n${JSON.stringify(medians, null, 2)}\n\`\`\`\n`);
if (valid.length !== 3) process.exitCode = 1;
