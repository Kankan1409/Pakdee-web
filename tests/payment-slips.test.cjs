const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// กฎความเป็นเจ้าของสาขาตัวจริง (ไม่ mock) — ใช้ร่วมกับหน้าเว็บ
function loadBranchOwnership() {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/branch-ownership.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports });
  return exports;
}

function setup(results, configured = true) {
  const calls = [];
  const db = { from(table) {
    const call = { table, filters: [] }; calls.push(call);
    const result = results.shift();
    const query = {
      select(value) { call.select = value; return this; }, order() { return this; },
      eq(...args) { call.filters.push(args); return this; },
      in() { return this; }, limit() { return this; },
      insert(value) { call.insert = value; return this; },
      maybeSingle() { return Promise.resolve(result); },
      single() { return Promise.resolve(result); },
      then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
    };
    return query;
  }};
  const exports = {};
  const source = fs.readFileSync('src/lib/payment-slips-server.ts', 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, Buffer, process: { env: configured ? { SUPABASE_SERVICE_ROLE_KEY: 'test', NEXT_PUBLIC_SUPABASE_URL: 'https://example.test' } : {} },
    require(name) {
      if (name === '@supabase/supabase-js') return { createClient: () => db };
      if (name === '@/lib/supabase-relational') return { toUuid: id => 'uuid-' + id };
      if (name === '@/lib/branch-ownership') return loadBranchOwnership();
      if (name === '@/lib/slip-verification') return { validateImageSignature: () => ({ isValid: true, format: 'png' }) };
      return require(name);
    },
  });
  return { api: exports, calls };
}

// Branch ownership is invoices.property_id (buildings table removed 2026-11-12): one query,
// filtered by invoice number AND branch, because invoice numbers repeat between branches.
const hasFilter = (call, key, value) => call.filters.some(([k, v]) => k === key && v === value);

test('stores original image bytes under the invoice branch and leaves payment pending', async () => {
  const { api, calls } = setup([{ data: [{ id: 'invoice-1' }] }, { data: [] }, { data: { id: 'slip-1' } }]);
  const bytes = Buffer.from([0, 255, 128, 1, 0, 200]);
  assert.equal(await api.savePaymentSlip('branch-a', 'INV-1', bytes), 'slip-1');
  assert.equal(calls[0].table, 'invoices');
  assert.ok(hasFilter(calls[0], 'invoice_number', 'INV-1'));
  assert.ok(hasFilter(calls[0], 'property_id', 'uuid-branch-a'));
  assert.deepEqual(api.decodeSlipImage(calls[2].insert.image_data), bytes);
  assert.equal(calls[2].insert.invoice_id, 'invoice-1');
  assert.equal(calls[2].insert.verification_status, 'pending');
  assert.equal(calls[2].insert.property_id, 'uuid-branch-a');
});

test('refuses images when invoice is absent from the requested branch', async () => {
  // e.g. INV-1 exists only in branch-a: the branch-b query returns nothing → 404, nothing stored
  const { api, calls } = setup([{ data: [] }]);
  await assert.rejects(api.savePaymentSlip('branch-b', 'INV-1', Buffer.from('image')), e => e.status === 404);
  assert.equal(calls.length, 1);
  assert.ok(hasFilter(calls[0], 'property_id', 'uuid-branch-b'));
});

test('invoice lookup failure fails closed without storing the image', async () => {
  const { api, calls } = setup([{ data: null, error: { message: 'down' } }]);
  await assert.rejects(api.savePaymentSlip('branch-a', 'INV-1', Buffer.from('image')), e => e.status === 503);
  assert.equal(calls.length, 1);
});

test('retry reuses an existing slip without inserting another image', async () => {
  const { api, calls } = setup([{ data: [{ id: 'invoice-1' }] }, { data: [{ id: 'existing-slip' }] }]);
  assert.equal(await api.savePaymentSlip('branch-a', 'INV-1', Buffer.from('image')), 'existing-slip');
  assert.equal(calls.length, 2);
});

test('owner credentials cannot read another owners branch', async () => {
  const { api } = setup([
    { data: { id: 'owner-a', role: 'owner', is_active: true, phone: '0800000001', assigned_branch_ids: ['pwd:secret'] } },
    { data: [{ value: [{ id: 'branch-b', ownerId: 'owner-b', ownerPhone: '0800000002' }] }] },
  ]);
  const request = new Request('https://example.test', { headers: { authorization: 'Basic ' + Buffer.from('owner-a:secret').toString('base64') } });
  await assert.rejects(api.authorizeSlipRequest(request, 'branch-b'), e => e.status === 403);
});

const basicAuth = (id) => ({ headers: { authorization: 'Basic ' + Buffer.from(id + ':secret').toString('base64') } });
const ownerRow = (id, phone) => ({ data: { id, role: 'owner', is_active: true, phone, assigned_branch_ids: ['pwd:secret'] } });

test('owner of a branch (owner_id column from the database) is allowed', async () => {
  // แถวจริงจาก Supabase เป็น snake_case — เดิมอ่าน ownerId จึงได้ 403 กับสาขาของตัวเอง
  const { api } = setup([ownerRow('U0002', '0800000002'), { data: [{ id: 'P0003', owner_id: 'U0002', phone: '021111111' }] }]);
  const result = await api.authorizeSlipRequest(new Request('https://example.test', basicAuth('U0002')), 'P0003');
  assert.equal(result.propertyUuid, 'uuid-P0003');
});

test('owner_id of another account is refused even when the branch phone matches', async () => {
  const { api } = setup([ownerRow('U0001', '0800000001'), { data: [{ id: 'P0003', owner_id: 'U0002', phone: '0800000001' }] }]);
  await assert.rejects(api.authorizeSlipRequest(new Request('https://example.test', basicAuth('U0001')), 'P0003'), e => e.status === 403);
});

test('missing server key and corrupt database image fail closed', () => {
  const { api } = setup([], false);
  assert.throws(() => api.slipDatabase(), e => e.status === 503);
  assert.throws(() => api.decodeSlipImage('\\x0zz'), e => e.status === 422);
});
