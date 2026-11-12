const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadTsModule(filePath, mocks = {}) {
  const exports = {};
  const source = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;

  vm.runInNewContext(transpiled, {
    exports,
    module: { exports },
    Buffer,
    console,
    process,
    Map,
    Set,
    Date,
    Intl,
    Math,
    Object,
    Array,
    Number,
    String,
    Boolean,
    Promise,
    Error,
    globalThis: {},
    require(name) {
      if (mocks[name]) return mocks[name];
      return require(name);
    },
  });
  return exports;
}

test('buildYearMonthsList returns all 12 months (01..12) sorted ascending and normalizes Buddhist years', () => {
  const utils = loadTsModule('src/lib/utils.ts', {
    clsx: { clsx: (...a) => a.join(' ') },
    'tailwind-merge': { twMerge: (s) => s },
  });

  const months = utils.buildYearMonthsList(['2569-11', '2025-12'], 2026);
  assert.equal(months.includes('2025-12'), true);
  for (let m = 1; m <= 12; m++) {
    assert.equal(months.includes(`2026-${String(m).padStart(2, '0')}`), true);
  }
  assert.equal(months.indexOf('2026-01') < months.indexOf('2026-12'), true);
  assert.equal(months.some((m) => m.startsWith('2569')), false);
});

test('formatMeterTimestampThai & toPgTimestamp normalize Buddhist years cleanly', () => {
  const utils = loadTsModule('src/lib/utils.ts', {
    clsx: { clsx: (...a) => a.join(' ') },
    'tailwind-merge': { twMerge: (s) => s },
  });
  const formatted = utils.formatMeterTimestampThai('2569-11-11T09:28:09+00:00');
  assert.equal(formatted.includes('2569'), true);
  assert.equal(formatted.includes('3112'), false);
  assert.equal(formatted.endsWith('น.'), true);

  const rel = loadTsModule('src/lib/supabase-relational.ts', {
    '@/lib/supabase': { supabase: { from: () => ({}) } },
  });
  assert.equal(rel.toPgTimestamp('11/11/2569 17:08:23'), '2026-11-11T10:08:23.000Z');
  assert.equal(rel.toPgTimestamp('2569-11-11T09:28:09+00:00'), '2026-11-11T09:28:09.000Z');
});

test('syncMeterReadingsToSupabase sends reading_month & strips missing billing_month cleanly', async () => {
  const upserts = [];
  const db = {
    from(table) {
      return {
        upsert(rows) {
          upserts.push({ table, rows });
          // Simulate PostgREST schema where only reading_month exists
          if (rows[0] && 'billing_month' in rows[0]) {
            return Promise.resolve({
              error: { message: "Could not find the 'billing_month' column of 'meter_readings' in the schema cache" },
            });
          }
          return Promise.resolve({ error: null });
        },
      };
    },
  };

  const rel = loadTsModule('src/lib/supabase-relational.ts', {
    '@/lib/supabase': { supabase: db },
  });

  await rel.syncMeterReadingsToSupabase(
    [
      {
        id: 'mtr-1',
        property_id: 'prop-branch-2',
        room_id: 'room-a1',
        room_number: 'A1',
        billing_month: '2026-11',
        electric_prev: 100,
        electric_curr: 125,
        water_prev: 10,
        water_curr: 14,
        recorded_at: '11/11/2569 17:08:23',
      },
    ],
    [{ id: 'room-a1', propertyId: 'prop-branch-2', roomNumber: 'A1' }]
  );

  assert.equal(upserts.length, 2);
  const finalRow = upserts[1].rows[0];
  assert.equal(finalRow.reading_month, '2026-11');
  assert.equal(finalRow.electric_units, 25);
  assert.equal(finalRow.water_units, 4);
  assert.equal(finalRow.recorded_at, '2026-11-11T10:08:23.000Z');
});

test('loadFromRelationalTables preserves branch property_id, tenant_name, lineUserId and meter units', async () => {
  const rel = loadTsModule('src/lib/supabase-relational.ts', {
    '@/lib/supabase': { supabase: {} },
  });
  const propUuid = rel.toUuid('prop-kh-1');
  const tenantUuid = rel.toUuid('t-1');
  const roomUuid = rel.toUuid('room-a2');

  const datasets = {
    properties: [{ id: propUuid, name: 'ข้าวหอม สาขา1', electric_rate: 8, water_rate: 18, plan: 'pro' }],
    branch_settings: [],
    tenants: [{ id: tenantUuid, full_name: 'คุณบี', phone: '0811111111', line_id: 'U1234567890abcdef' }],
    rooms: [
      {
        id: roomUuid,
        property_id: propUuid,
        room_number: 'A2',
        floor: 1,
        status: 'occupied',
        monthly_rate: 4000,
        current_electric_meter: 325,
        current_water_meter: 32,
        current_tenant_id: tenantUuid,
      },
    ],
    contracts: [],
    invoices: [],
    invoice_items: [],
    meter_readings: [
      {
        id: rel.toUuid('mtr-a2'),
        room_id: roomUuid,
        reading_month: '2026-11',
        electric_prev: 300,
        electric_curr: 325,
        electric_units: 0, // Even if 0 in row, diff recomputes 25
        water_prev: 28,
        water_curr: 32,
        water_units: 4,
        recorded_at: '2569-11-11T09:28:09+00:00',
      },
    ],
    repairs: [],
    expenses: [],
    daily_bookings: [],
    activity_logs: [],
  };

  const makeQuery = (table) => {
    const res = Promise.resolve({ data: datasets[table], error: null });
    return {
      select() { return this; },
      order() { return this; },
      limit() { return this; },
      then(resolve, reject) { return res.then(resolve, reject); },
    };
  };

  const relLive = loadTsModule('src/lib/supabase-relational.ts', {
    '@/lib/supabase': { supabase: { from: (t) => makeQuery(t) } },
  });

  const { hasRelationalData, data } = await relLive.loadFromRelationalTables({
    properties: [{ id: 'prop-kh-1', name: 'ข้าวหอม สาขา1' }],
  });

  assert.equal(hasRelationalData, true);
  assert.equal(data.tenants[0].lineUserId, 'U1234567890abcdef');
  assert.equal(data.meter_readings[0].property_id, 'prop-kh-1');
  assert.equal(data.meter_readings[0].room_number, 'A2');
  assert.equal(data.meter_readings[0].tenant_name, 'คุณบี');
  assert.equal(data.meter_readings[0].electric_units, 25);
  assert.equal(data.meter_readings[0].water_units, 4);
  assert.equal(data.meter_readings[0].recorded_at, '2026-11-11T09:28:09.000Z');
});

test('loadCoreContextFromSupabase only queries 4 core tables instead of all 12', async () => {
  const queriedTables = [];
  const makeQuery = (table) => {
    queriedTables.push(table);
    return Promise.resolve({ data: [], error: null });
  };

  const rel = loadTsModule('src/lib/supabase-relational.ts', {
    '@/lib/supabase': {
      supabase: {
        from(table) {
          return { select: () => makeQuery(table) };
        },
      },
    },
  });

  await rel.loadCoreContextFromSupabase({});
  assert.deepEqual(queriedTables.sort(), ['branch_settings', 'properties', 'rooms', 'tenants']);
});
