const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');
function load(file, extras) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, { exports, Buffer, AbortSignal, URL, process: { env: { SLIP2GO_API_URL: 'https://test.slip2go.com' } }, console: { info() {}, error() {} }, ...extras });
  return exports;
}
const options = { qrCode: 'qr-test', expectedAmount: 200, receiverAccount: '0812345678' };
const valid = { code: '200200', data: { amount: 200, transRef: 'REAL-REF', dateTime: '2026-11-06T01:00:00Z', receiver: { account: { name: 'Receiver' } } } };
test('provider verdicts explain duplicate, fraud and mismatches without conflating them', async () => {
  for (const [code, phrase] of Object.entries({
    '200501':'สลิปซ้ำ', '200500':'สลิปปลอม', '200401':'บัญชีผู้รับไม่ตรง',
    '200402':'ยอดโอนไม่ตรง', '200403':'วันที่โอนไม่ตรง', '200404':'ไม่พบข้อมูลธุรกรรม',
  })) {
    const api=load('src/lib/slip2go.ts',{fetch:async()=>({ok:true,status:200,json:async()=>({code})})});
    const result=await api.verifyWithSlip2Go('test',options);
    assert.equal(result.success,false);
    assert.ok(result.error.includes(phrase));
    if(code!=='200500') assert.ok(!result.error.includes('สลิปปลอม'));
  }
});
test('HTTP errors do not report a definitive fraud verdict', async () => {
  const api=load('src/lib/slip2go.ts',{fetch:async()=>({ok:false,status:503,json:async()=>({code:'200500'})})});
  const result=await api.verifyWithSlip2Go('test',options);
  assert.equal(result.success,false);
  assert.ok(result.error.includes('ยังไม่พร้อมใช้งาน'));
});
for (const code of ['200000', '200401', '200402', '200403', '200404', '200500', '200501', '200202', undefined]) {
  test(`HTTP 200 with code ${code} must not authorize payment`, async () => {
    const api = load('src/lib/slip2go.ts', { fetch: async () => ({ ok: true, status: 200, json: async () => ({ ...valid, code }) }) });
    assert.equal((await api.verifyWithSlip2Go('test', options)).success, false);
  });
}
test('missing key does not call provider or approve', async () => {
  const api = load('src/lib/slip2go.ts', { fetch: () => { throw Error('must not call'); } });
  assert.equal((await api.verifyWithSlip2Go('', options)).success, false);
});
test('success requires actual amount, reference, date and recipient', async () => {
  for (const fields of [{amount:0}, {amount:1}, {amount:undefined}, {transRef:''}, {dateTime:null}, {receiver:null}, {isDuplicate:true}]) {
    const api = load('src/lib/slip2go.ts', { fetch: async () => ({ ok: true, status: 200, json: async () => ({...valid, data:{...valid.data,...fields}}) }) });
    assert.equal((await api.verifyWithSlip2Go('test', options)).success, false);
  }
});
test('base64 endpoint sends identical amount, recipient and duplicate conditions', async () => {
  let request;
  const api = load('src/lib/slip2go.ts', { fetch: async (url, init) => {
    request = {url, body: JSON.parse(init.body)};
    return {ok:true,status:200,json:async()=>valid};
  }});
  assert.equal((await api.verifyWithSlip2Go('test', {...options, imageBuffer:Buffer.from([255,216,255,0])})).success,true);
  assert.match(request.url, /qr-base64\/info$/);
  assert.equal(request.body.payload.checkCondition.checkDuplicate,true);
  assert.equal(request.body.payload.checkCondition.checkAmount.amount,200);
  assert.equal(request.body.payload.checkCondition.checkReceiver[0].accountNumber,'0812345678');
  assert.match(request.body.payload.imageBase64,/^data:image\/jpeg;base64,/);
});
test('13-digit PromptPay National ID includes Slip2Go accountType 02003 in checkReceiver', async () => {
  let request;
  const api = load('src/lib/slip2go.ts', { fetch: async (url, init) => {
    request = { url, body: JSON.parse(init.body) };
    return { ok: true, status: 200, json: async () => valid };
  }});
  const res = await api.verifyWithSlip2Go('test', {
    qrCode: 'qr-test',
    expectedAmount: 200,
    receiverAccount: '1104000063453',
    receiverAccounts: ['1104000063453', '012-3-45678-9'],
  });
  assert.equal(res.success, true);
  const receivers = request.body.payload.checkCondition.checkReceiver;
  assert.ok(receivers.some(r => r.accountType === '02003' && r.accountNumber === '1104000063453'));
  assert.ok(receivers.some(r => r.accountNumber === '0123456789'));
});
test('network failure cannot approve', async () => {
  const api=load('src/lib/slip2go.ts',{fetch:async()=>{throw Error('timeout');}});
  assert.equal((await api.verifyWithSlip2Go('test',options)).success,false);
});
test('LINE provider failure never updates invoice or records a payment', async () => {
  let updates = 0;
  const api=load('src/lib/line/verify-payment.ts',{process:{env:{}},require(name){
    if(name==='@/lib/database.service')return {DatabaseService:{updateInvoiceStatus(){updates++;}}};
    if(name==='@/lib/supabase-relational')return {toUuid:x=>x};
    if(name==='@/lib/slip2go')return {verifyWithSlip2Go:async()=>({success:false,error:'rejected'})};
    if(name==='@/lib/payment-slips-server')return {
      savePaymentSlip:async()=> 'slip',decodeSlipImage:()=>Buffer.from('image'),
      slipDatabase:()=>({from(){const q={select(){return q},eq(){return q},single:async()=>({data:{image_data:'bytes',verification_status:'pending'}})};return q;}}),
    };
    throw Error(name);
  }});
  const result=await api.verifyLinePayment('branch',{id:'inv',invoiceNumber:'INV',totalAmount:200},{},Buffer.from('image'),'test');
  assert.equal(updates,0); assert.equal(result.amount,undefined);
});

test('stored slip cannot be checked from another branch', async () => {
  let calls = 0;
  const api = load('src/lib/line/verify-payment.ts', { require(name) {
    if(name==='@/lib/database.service') return { DatabaseService: { init(){throw Error('must not initialize');} } };
    if(name==='@/lib/slip2go') return { verifyWithSlip2Go(){calls++;} };
    if(name==='@/lib/supabase-relational')return {toUuid:x=>x};
    if(name==='@/lib/payment-slips-server')return {
      SlipError:class extends Error {constructor(message,status){super(message);this.status=status;}},
      slipDatabase:()=>({from(){const q={select(){return q;},eq(){return q;},maybeSingle:async()=>({data:null})};return q;}}),
    };
    throw Error(name);
  }});
  await assert.rejects(api.verifyStoredPayment('other-branch','slip'),e=>e.status===404);
  assert.equal(calls,0);
});

test('already passed stored slip does not recheck or charge again', async () => {
  const api = load('src/lib/line/verify-payment.ts', { require(name) {
    if(name==='@/lib/database.service') return { DatabaseService: { init(){throw Error('must not initialize');} } };
    if(name==='@/lib/slip2go') return { verifyWithSlip2Go(){throw Error('must not recheck');} };
    if(name==='@/lib/supabase-relational')return {toUuid:x=>x};
    if(name==='@/lib/payment-slips-server')return {
      slipDatabase:()=>({from(){const q={select(){return q;},eq(){return q;},maybeSingle:async()=>({data:{verification_status:'passed'}})};return q;}}),
    };
    throw Error(name);
  }});
  assert.equal((await api.verifyStoredPayment('branch','slip')).status,'passed');
});
