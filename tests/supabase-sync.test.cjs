const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function harness({ data = {}, errors = {}, writeErrors = {} } = {}) {
  const calls = [];
  const supabase = { from(table) {
    let operation = 'select';
    const query = {
      select() { return query; }, order() { return query; }, limit() { return query; },
      upsert(rows) { operation = 'upsert'; calls.push({ table, operation, rows }); return query; },
      delete() { throw new Error('Unexpected destructive write'); },
      then(resolve, reject) {
        const error = (operation === 'select' ? errors : writeErrors)[table];
        return Promise.resolve({ data: data[table] || [], error: error ? { message: error } : null }).then(resolve, reject);
      },
    };
    return query;
  }};
  const modules = {};
  function load(name) {
    if (modules[name]) return modules[name];
    if (name === '@/lib/supabase') return { supabase };
    if (!['@/lib/database.service', '@/lib/supabase-relational'].includes(name)) return {};
    const source = fs.readFileSync(path.join(__dirname, '../src', name.slice(2) + '.ts'), 'utf8');
    const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    modules[name] = exports;
    vm.runInNewContext(output, { exports, require: load, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout }, { filename: name });
    return exports;
  }
  return { calls, errors, data, relational: load('@/lib/supabase-relational'), db: load('@/lib/database.service').DatabaseService };
}

test('meter writes use required billing_month and preserve the requested month', async () => {
  const h = harness();
  await h.relational.syncMeterReadingsToSupabase([{ id: 'meter-1', room_id: 'room-1', billing_month: '2026-11' }]);
  assert.equal(h.calls[0].rows[0].billing_month, '2026-11');
  assert.equal('reading_month' in h.calls[0].rows[0], false);
});

test('meter load reads billing_month and supports legacy reading_month', async () => {
  const h = harness({ data: { meter_readings: [{ id: 'one', room_id: 'room-1', billing_month: '2026-11' }, { id: 'two', room_id: 'room-1', reading_month: '2026-10' }] } });
  const result = await h.relational.loadFromRelationalTables({});
  assert.equal(result.data.meter_readings[0].billing_month, '2026-11');
  assert.equal(result.data.meter_readings[1].billing_month, '2026-10');
});

test('initialization and repeated realtime-style refreshes do not write', async () => {
  const h = harness({ data: { pakdee_store: [{ key: 'pakdee_dev_rooms', value: [{ id: 'stale' }], updated_at: '2026-11-01' }] } });
  await h.db.init();
  await h.db.init();
  assert.equal(h.db.isServerSynced(), true);
  assert.equal(h.calls.length, 0);
});

test('empty relational tables replace stale cached collections', async () => {
  const h = harness();
  const old = Object.fromEntries(['properties', 'tenants', 'rooms', 'contracts', 'invoices', 'meter_readings', 'repairs', 'expenses', 'daily_bookings', 'activity_logs'].map(key => [key, [{ id: 'stale' }]]));
  const result = await h.relational.loadFromRelationalTables(old);
  for (const key of Object.keys(old)) assert.equal(result.data[key].length, 0, key);
});

test('failed reads reject and clear successful connection status', async () => {
  const h = harness();
  await h.db.init();
  h.errors.tenants = 'permission denied';
  await assert.rejects(h.db.init(), /permission denied/);
  assert.equal(h.db.isServerSynced(), false);
  assert.equal(h.calls.length, 0);
});

test('constraint errors propagate through batch persistence', async () => {
  const h = harness({ writeErrors: { meter_readings: 'billing_month violates not-null constraint' } });
  await assert.rejects(h.db.persistBatch({ meter_readings: [{ id: 'meter-1', room_id: 'room-1', billing_month: '2026-11' }] }), /not-null/);
  assert.equal(h.calls.some(c => c.table === 'pakdee_store'), false);
});

test('metadata write failures do not report batch success', async () => {
  const h = harness({ writeErrors: { pakdee_store: 'network unavailable' } });
  await assert.rejects(h.db.persistBatch({ active_property_id: 'prop-1' }), /network unavailable/);
});

test('syncing partial or empty tenant lists never prunes cloud rows', async () => {
  const h = harness();
  await h.relational.syncTenantsToSupabase([]);
  await h.relational.syncTenantsToSupabase([{ id: 'tenant-1', fullName: 'Test' }]);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].operation, 'upsert');
});

test('room uniqueness conflicts fail without deleting the existing room', async () => {
  const h = harness({ writeErrors: { rooms: 'duplicate key value violates unique constraint' } });
  await assert.rejects(h.relational.safeUpsert('rooms', [{ id: 'room-1', room_number: '101' }]), /duplicate key/);
  assert.equal(h.calls.length, 1);
});
