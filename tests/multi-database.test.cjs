// หลายฐานข้อมูล (หลาย Supabase project) ในเว็บเดียว: ทะเบียนฐาน + ฐานของแต่ละคำขอฝั่งเซิร์ฟเวอร์ไม่ปนกัน
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

/** โหลด db-registry + db-context-server ใน context เดียวกัน (ใช้ globalThis ร่วมกันเหมือนในเซิร์ฟเวอร์จริง) */
function loadModules(env) {
  const context = vm.createContext({ process: { env }, console });
  const load = (file, requireFn) => {
    const exports = {};
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    // แต่ละไฟล์มี exports ของตัวเอง (โค้ดที่ TypeScript แปลงแล้วอ้าง exports.X ภายในไฟล์)
    const fn = vm.runInContext(`(function (exports, require) {\n${js}\n})`, context);
    fn(exports, requireFn);
    return exports;
  };
  const registry = load('src/lib/db-registry.ts', require);
  const server = load('src/lib/db-context-server.ts', (name) =>
    name === '@/lib/db-registry' ? registry : require(name)
  );
  return { registry, server };
}

const ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://main.supabase.test',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'main-anon',
  SUPABASE_SERVICE_ROLE_KEY: 'main-service',
  NEXT_PUBLIC_EXTRA_DATABASES: JSON.stringify([
    { key: 'db2', url: 'https://db2.supabase.test', anonKey: 'db2-anon' },
    { key: 'main', url: 'https://evil.test', anonKey: 'x' }, // ห้ามทับฐานหลัก
    { key: 'bad key!', url: 'https://x.test', anonKey: 'x' }, // รหัสไม่ถูกต้อง
    { key: 'db3', url: '', anonKey: 'x' }, // ไม่มี URL
  ]),
  SUPABASE_EXTRA_SERVICE_KEYS: JSON.stringify({ db2: 'db2-service' }),
};

test('registry: main first, valid extra databases only', () => {
  const { registry } = loadModules(ENV);
  const list = registry.listDatabases();
  assert.deepEqual(Array.from(list, (d) => d.key), ['main', 'db2']);
  assert.equal(registry.getDbConfig('db2').url, 'https://db2.supabase.test');
  assert.equal(registry.getDbConfig('main').url, 'https://main.supabase.test');
});

test('registry: unknown or empty database key falls back to main', () => {
  const { registry } = loadModules(ENV);
  assert.equal(registry.normalizeDbKey(''), 'main');
  assert.equal(registry.normalizeDbKey(undefined), 'main');
  assert.equal(registry.normalizeDbKey('db9'), 'main');
  assert.equal(registry.normalizeDbKey('db2'), 'db2');
});

test('registry: service keys per database', () => {
  const { registry } = loadModules(ENV);
  assert.equal(registry.serviceKeyFor('main'), 'main-service');
  assert.equal(registry.serviceKeyFor('db2'), 'db2-service');
  assert.equal(registry.serviceKeyFor('db9'), 'main-service'); // ไม่รู้จัก = main
});

test('registry: broken JSON means main database only', () => {
  const { registry } = loadModules({ ...ENV, NEXT_PUBLIC_EXTRA_DATABASES: '{not json' });
  assert.deepEqual(Array.from(registry.listDatabases(), (d) => d.key), ['main']);
});

test('server: concurrent requests keep their own database across awaits', async () => {
  const { registry, server } = loadModules(ENV);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const seen = [];
  await Promise.all([
    server.runWithDb('db2', async () => {
      await sleep(20);
      seen.push(['A', registry.currentDbKey()]);
      await sleep(5);
      seen.push(['A', registry.currentDbKey()]);
    }),
    server.runWithDb('main', async () => {
      await sleep(5);
      seen.push(['B', registry.currentDbKey()]);
      await sleep(30);
      seen.push(['B', registry.currentDbKey()]);
    }),
  ]);
  for (const [who, db] of seen) assert.equal(db, who === 'A' ? 'db2' : 'main');
  assert.equal(registry.currentDbKey(), 'main'); // นอกคำขอ = main
});

test('server: request header picks the database, unknown header is main', async () => {
  const { registry, server } = loadModules(ENV);
  const handler = server.withRequestDb(async () => registry.currentDbKey());
  const req = (value) => ({ headers: new Headers(value ? { 'x-pakdee-db': value } : {}) });
  assert.equal(await handler(req('db2')), 'db2');
  assert.equal(await handler(req('db9')), 'main');
  assert.equal(await handler(req()), 'main');
  assert.equal(await handler({}), 'main'); // ไม่มี headers เลย
});

test('server: forEachDatabase visits every database and survives a failure', async () => {
  const { registry, server } = loadModules(ENV);
  const visited = [];
  await server.forEachDatabase(async (key) => {
    visited.push([key, registry.currentDbKey()]);
    if (key === 'main') throw new Error('boom');
  });
  assert.deepEqual(visited, [['main', 'main'], ['db2', 'db2']]);
});
