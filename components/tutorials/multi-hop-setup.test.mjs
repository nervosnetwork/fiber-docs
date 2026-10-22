import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectMultiHopProfiles, earlierSenderKey, defaultSenderKey, receiverKey, senderChoiceKey } from './multi-hop-setup.ts';
const profile = JSON.stringify({ fiberKey: 'ab'.repeat(32), ckbKey: 'cd'.repeat(32), identifier: 'test-profile' });
const storage = (entries = {}) => ({ getItem: (key) => entries[key] ?? null });

test('fresh visit discovers two new roles without creating storage', () => {
  const result = detectMultiHopProfiles(storage());
  assert.deepEqual(result.sender, { key: defaultSenderKey, saved: false, source: 'new' });
  assert.deepEqual(result.receiver, { key: receiverKey, saved: false, source: 'new' });
});
test('first tutorial profile becomes A, never C', () => {
  const result = detectMultiHopProfiles(storage({ [earlierSenderKey]: profile }));
  assert.deepEqual(result.sender, { key: earlierSenderKey, saved: true, source: 'earlier' });
  assert.equal(result.receiver.saved, false);
});
test('existing multi-hop identity takes precedence over an earlier tutorial', () => {
  const result = detectMultiHopProfiles(storage({ [earlierSenderKey]: profile, [defaultSenderKey]: profile, [receiverKey]: profile }));
  assert.equal(result.sender.key, defaultSenderKey);
  assert.equal(result.receiver.saved, true);
});
test('explicit new sender choice is restored without replacing older identities', () => {
  const selected = `${defaultSenderKey}:fresh:test`;
  const result = detectMultiHopProfiles(storage({ [senderChoiceKey]: selected, [selected]: profile, [defaultSenderKey]: profile }));
  assert.equal(result.sender.key, selected);
  assert.equal(result.sender.saved, true);
});
test('malformed profiles and invalid choices cannot alias C as A', () => {
  const result = detectMultiHopProfiles(storage({ [earlierSenderKey]: '{}', [senderChoiceKey]: receiverKey, [receiverKey]: profile }));
  assert.equal(result.sender.saved, false);
  assert.equal(result.sender.key, defaultSenderKey);
});

test('fresh receiver selection restores alongside the selected fresh sender', () => {
  const sender = `${defaultSenderKey}:fresh:pair`;
  const receiver = `${receiverKey}:fresh:pair`;
  const result = detectMultiHopProfiles(storage({
    [senderChoiceKey]: sender, [sender]: profile,
    'fiber-docs:multi-hop-receiver-choice-v1': receiver, [receiver]: profile,
    [receiverKey]: profile,
  }));
  assert.equal(result.sender.key, sender);
  assert.equal(result.receiver.key, receiver);
  assert.equal(result.receiver.saved, true);
});

test('partially prepared fresh pair keeps its new receiver instead of reusing the old one', () => {
  const receiver = `${receiverKey}:fresh:unfinished`;
  const result = detectMultiHopProfiles(storage({
    'fiber-docs:multi-hop-receiver-choice-v1': receiver, [receiverKey]: profile,
  }));
  assert.equal(result.receiver.key, receiver);
  assert.equal(result.receiver.saved, false);
});

test('fresh sender choice survives a failure before its profile is created', () => {
  const sender = `${defaultSenderKey}:fresh:unfinished`;
  const result = detectMultiHopProfiles(storage({
    [senderChoiceKey]: sender, [defaultSenderKey]: profile,
  }));
  assert.equal(result.sender.key, sender);
  assert.equal(result.sender.saved, false);
});

test('receiver selection cannot reuse a sender identity', () => {
  const result = detectMultiHopProfiles(storage({
    'fiber-docs:multi-hop-receiver-choice-v1': earlierSenderKey, [earlierSenderKey]: profile,
  }));
  assert.equal(result.receiver.key, receiverKey);
});
