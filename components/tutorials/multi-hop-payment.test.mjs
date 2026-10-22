import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createForwardPayment } from './multi-hop-payment.ts';
const draft = { hash: '0xabc', invoice: 'fibt-test', amount: '1' };
function fixture() {
  const data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k) };
  let sends = 0;
  const payer = { sendPayment: async () => { sends++; assert.equal(JSON.parse(data.get('test')).submitted, true); throw Error('response lost'); }, getPayment: async () => ({ status: 'Inflight' }) };
  const payee = { getInvoice: async () => ({ status: 'Open' }) };
  const make = () => createForwardPayment({ storage, key: 'test', payer, payee, bottle: '0xbeef', onChange() {} });
  return { storage, data, payer, payee, make, sends: () => sends };
}
test('reload checks the submitted hash without sending again after a lost response', async () => {
 const f=fixture(), flow=f.make(); flow.setInvoice(draft); await flow.send();
 assert.equal(flow.current().status, 'Sending'); flow.dispose();
 const resumed=f.make(); await resumed.check(); await resumed.send();
 assert.equal(resumed.current().status,'Inflight'); assert.equal(f.sends(),1);
 assert.throws(() => resumed.clear(), /pending/i);
});
test('draft invoice survives reload without being submitted', async () => {
 const f=fixture(); f.make().setInvoice(draft); const resumed=f.make(); await resumed.check();
 assert.equal(resumed.current().invoice,draft.invoice); assert.equal(f.sends(),0);
});
test('success requires sender confirmation and receiver receipt before reset', async () => {
 const f=fixture(), flow=f.make(); flow.setInvoice(draft); await flow.send();
 f.payer.getPayment=async()=>({status:'Success'}); await flow.check();
 assert.throws(()=>flow.clear(), /pending/i);
 f.payee.getInvoice=async()=>({status:'Paid'}); await flow.check(); flow.clear(); assert.equal(f.make().current(),null);
});
test('cannot submit when persistence fails', async () => {
 const f=fixture(), flow=f.make(); flow.setInvoice(draft); f.storage.setItem=()=>{throw Error('storage full')};
 await assert.rejects(flow.send(), /storage full/); assert.equal(f.sends(),0);
});
test('concurrent clicks send only once', async () => {
 const f=fixture(), flow=f.make(); flow.setInvoice(draft); await Promise.all([flow.send(),flow.send()]); assert.equal(f.sends(),1);
});
test('explicit route rejection allows retry but unknown errors do not', async () => {
 const f=fixture(), flow=f.make(); flow.setInvoice(draft);
 f.payer.sendPayment=async()=>{throw Error('Send payment error: Failed to build route')};
 await flow.send(); assert.equal(flow.current().status,'Failed'); flow.clear(); assert.equal(flow.current(),null);
});
test('malformed saved state blocks recovery instead of forgetting the payment', () => {
 const f=fixture(); f.data.set('test','{"submitted":true}'); assert.throws(()=>f.make(), /saved payment/i);
});
test('disposed controller cannot downgrade a reconciled payment', async () => {
 const f=fixture(), old=f.make(); old.setInvoice(draft); let reject;
 f.payer.sendPayment=()=>new Promise((_,r)=>{reject=r}); const send=old.send(); old.dispose();
 f.payer.getPayment=async()=>({status:'Success'}); f.payee.getInvoice=async()=>({status:'Paid'});
 const resumed=f.make(); await resumed.check(); reject(Error('late timeout')); await send;
 assert.equal(f.make().current().status,'Success');
});
test('a failed hash cannot be resubmitted; a fresh invoice is required', async () => {
 const f=fixture(), flow=f.make(); let sends=0; f.payer.sendPayment=async()=>{sends++;return {status:'Failed'}};
 flow.setInvoice(draft); await flow.send(); await flow.send(); assert.equal(sends,1);
 flow.clear(); flow.setInvoice({...draft,hash:'0xdef'}); await flow.send(); assert.equal(sends,2);
});
test('accepted amount whitespace is normalized before persistence', () => {
 const f=fixture(); f.make().setInvoice({...draft,amount:' 1 '}); assert.equal(f.make().current().amount,'1');
});
test('route hops survive submission, status checks and reload', async () => {
 const f=fixture(), flow=f.make();
 f.payer.sendPayment=async()=>({status:'Success',routers:[{nodes:[{pubkey:'0xaa'},{pubkey:'0xbb'},{pubkey:'0xcc'}]}]});
 flow.setInvoice(draft); await flow.send();
 assert.deepEqual(flow.current().route,['0xaa','0xbb','0xcc']);
 f.payer.getPayment=async()=>({status:'Success'}); await flow.check();
 assert.deepEqual(f.make().current().route,['0xaa','0xbb','0xcc']);
});
