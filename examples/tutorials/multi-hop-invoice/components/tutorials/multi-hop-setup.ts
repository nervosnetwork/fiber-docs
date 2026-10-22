export const earlierSenderKey = 'fiber-docs:wasm-quickstart-profile-v1';
export const defaultSenderKey = 'fiber-docs:multi-hop-sender-v1';
export const receiverKey = 'fiber-docs:multi-hop-receiver-v1';
export const senderChoiceKey = 'fiber-docs:multi-hop-sender-choice-v1';
export const receiverChoiceKey = 'fiber-docs:multi-hop-receiver-choice-v1';

export type NodeProfileChoice = { key: string; saved: boolean; source: 'earlier' | 'tutorial' | 'new' };
type ProfileStorage = Pick<Storage, 'getItem'>;

function hasProfile(storage: ProfileStorage, key: string) {
  try {
    const profile = JSON.parse(storage.getItem(key) ?? 'null');
    return Boolean(profile && /^[0-9a-f]{64}$/i.test(profile.fiberKey)
      && /^[0-9a-f]{64}$/i.test(profile.ckbKey)
      && typeof profile.identifier === 'string' && profile.identifier.length > 0);
  } catch { return false; }
}

/** Inspect only. Starting a runtime and creating keys require an explicit click. */
export function detectMultiHopProfiles(storage: ProfileStorage) {
  let selected: string | null = null;
  let selectedReceiver: string | null = null;
  try {
    selected = storage.getItem(senderChoiceKey);
    selectedReceiver = storage.getItem(receiverChoiceKey);
  } catch { /* Fresh journey. */ }
  const allowed = selected === earlierSenderKey || selected === defaultSenderKey
    || selected?.startsWith(`${defaultSenderKey}:fresh:`);
  const senderKey = allowed && selected ? selected
    : [defaultSenderKey, earlierSenderKey].find((key) => hasProfile(storage, key)) ?? defaultSenderKey;
  const choice = (key: string): NodeProfileChoice => {
    const saved = hasProfile(storage, key);
    return { key, saved, source: !saved ? 'new' : key === earlierSenderKey ? 'earlier' : 'tutorial' };
  };
  const receiverAllowed = selectedReceiver === receiverKey
    || selectedReceiver?.startsWith(`${receiverKey}:fresh:`);
  return { sender: choice(senderKey), receiver: choice(receiverAllowed ? selectedReceiver! : receiverKey) };
}

export function profileSetupLabel(profile: NodeProfileChoice, running: boolean) {
  if (running) return profile.saved ? 'Restored' : 'New node';
  return profile.saved ? 'Saved profile found' : 'New profile';
}
