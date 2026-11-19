// LINE OA แยกตามบัญชี: ใช้ token/secret ของสาขาเท่านั้น (ไม่ใช้ .env สำรอง) และเทียบเจ้าของสาขาได้
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, env = {}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(js, { exports, process: { env } });
  return exports;
}

test('branch without its own OA gets no token even when .env has one', () => {
  const env = { LINE_CHANNEL_ACCESS_TOKEN: 'env-token-of-another-account', LINE_CHANNEL_SECRET: 'env-secret' };
  const line = load('src/lib/line/branch-line-config.ts', env);
  assert.equal(line.branchLineToken({}), '');
  assert.equal(line.branchLineSecret({ lineChannelSecret: '   ' }), '');
  assert.equal(line.branchLineToken(null), '');
});

test('branch OA credentials are used (trimmed)', () => {
  const line = load('src/lib/line/branch-line-config.ts');
  assert.equal(line.branchLineToken({ lineChannelAccessToken: ' tok ' }), 'tok');
  assert.equal(line.branchLineSecret({ lineChannelSecret: 'sec' }), 'sec');
});

test('branchOwnerKey: same account matches, other account and unknown owner do not', () => {
  const own = load('src/lib/branch-ownership.ts');
  const a1 = { id: 'P0001', ownerId: 'U0001' };
  const a2 = { id: 'P0002', ownerId: 'U0001' };
  const b1 = { id: 'P0003', ownerId: 'U0002' };
  const legacy = { id: 'P0004', ownerId: 'usr-owner-01' }; // old demo owner = no owner
  assert.equal(own.branchOwnerKey(a1), own.branchOwnerKey(a2));
  assert.notEqual(own.branchOwnerKey(a1), own.branchOwnerKey(b1));
  assert.equal(own.branchOwnerKey(legacy), '');
  assert.equal(own.branchOwnerKey({ ownerPhone: '081-234-5678' }), 'phone:0812345678');
});
