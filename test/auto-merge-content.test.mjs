import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Exercise the actual privileged workflow script without making GitHub writes.
const workflow = readFileSync(new URL('../.github/workflows/auto-merge-content.yml', import.meta.url), 'utf8');
const script = workflow.split('          script: |\n')[1]
  .split('\n').map(line => line.replace(/^ {12}/, '')).join('\n');
const run = new (Object.getPrototypeOf(async () => {}).constructor)('github', 'context', 'core', script);

async function simulate({ overrides = {}, files = [{ filename: 'content/pulse/issue_15.md' }],
  latest = {}, scheduled = false, mergeError, merged = true } = {}) {
  const pr = { number: 124, user: { login: 'linnnsss' }, base: { ref: 'master', sha: 'base' },
    head: { sha: 'head' }, state: 'open', draft: false, changed_files: files.length,
    mergeable: true, mergeable_state: 'clean', ...overrides };
  const merges = [];
  let gets = 0;
  const github = {
    rest: { pulls: {
      list: 'list', listFiles: 'files',
      get: async () => ({ data: ++gets === 1 ? pr : { ...pr, ...latest } }),
      merge: async args => {
        merges.push(args);
        if (mergeError) throw mergeError;
        return { data: { merged, message: 'Merge failed' } };
      },
    } },
    paginate: async (method, args) => {
      assert.equal(args.per_page, 100);
      return method === 'list' ? [pr] : files;
    },
  };
  await run(github, { repo: { owner: 'nervosnetwork', repo: 'fiber-docs' },
    payload: scheduled ? {} : { pull_request: pr } }, { info() {} });
  return merges;
}

test('merges allowed content and images with the validated SHA', async () => {
  const merges = await simulate({ files: [
    { filename: 'content/blog/article.mdx' },
    { filename: 'content/blog/img/hero.png' },
    { filename: 'content/pulse/issue_15.md' },
  ] });
  assert.deepEqual(merges, [{ owner: 'nervosnetwork', repo: 'fiber-docs',
    pull_number: 124, sha: 'head', merge_method: 'squash' }]);
});

for (const [name, options] of Object.entries({
  'different author': { overrides: { user: { login: 'someone-else' } } },
  'different base': { overrides: { base: { ref: 'other' } } },
  draft: { overrides: { draft: true } },
  closed: { overrides: { state: 'closed' } },
  empty: { files: [] },
  'mixed changes': { files: [{ filename: 'content/blog/a.mdx' }, { filename: 'package.json' }] },
  'similar prefix': { files: [{ filename: 'content/blog-other/a.md' }] },
  traversal: { files: [{ filename: 'content/blog/../docs/a.md' }] },
  'rename from outside': { files: [{ filename: 'content/blog/a.md', previous_filename: 'app/a.md' }] },
  'rename to outside': { files: [{ filename: 'app/a.md', previous_filename: 'content/blog/a.md' }] },
  'truncated file list': { overrides: { changed_files: 3001 } },
  'concurrent push': { latest: { head: { sha: 'new-head' } } },
  'base changed': { latest: { base: { ref: 'master', sha: 'new-base' } } },
  'became draft': { latest: { draft: true } },
  'retargeted PR': { latest: { base: { ref: 'other', sha: 'base' } } },
  'checks pending': { latest: { mergeable_state: 'unstable' } },
  'branch protection': { latest: { mergeable_state: 'blocked' } },
  'unknown mergeability': { latest: { mergeable: null } },
  conflicts: { latest: { mergeable: false } },
})) {
  test(`skips ${name}`, async () => assert.deepEqual(await simulate(options), []));
}

test('scheduled retry scans open PRs', async () => {
  assert.equal((await simulate({ scheduled: true })).length, 1);
});
test('allows renames within the two content directories', async () => {
  assert.equal((await simulate({ files: [{ filename: 'content/blog/a.md',
    previous_filename: 'content/pulse/a.md' }] })).length, 1);
});
for (const status of [405, 409]) {
  test(`defers merge rejection ${status}`, async () => {
    await simulate({ mergeError: Object.assign(new Error('blocked'), { status }) });
  });
}
test('surfaces permission errors', async () => {
  await assert.rejects(simulate({ mergeError: Object.assign(new Error('forbidden'), { status: 403 }) }), /forbidden/);
});
test('surfaces unsuccessful merge response', async () => {
  await assert.rejects(simulate({ merged: false }), /Merge failed/);
});
