const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadTsModule(filePath, mocks = {}, env = {}) {
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
    crypto,
    process: { ...process, env: { ...process.env, ...env } },
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
    File,
    Request,
    Response,
    URLSearchParams,
    fetch: mocks.__fetch || globalThis.fetch,
    require(name) {
      if (mocks[name]) return mocks[name];
      return require(name);
    },
  });
  return exports;
}

function collectFlexTextNodes(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const item of node) collectFlexTextNodes(item, out);
    return out;
  }
  if (node.type === 'text') {
    out.push(node.text);
  }
  for (const val of Object.values(node)) {
    if (val && typeof val === 'object') collectFlexTextNodes(val, out);
  }
  return out;
}

test('buildReceiptFlexMessage always produces non-empty text nodes and valid altText even when fields are blank', () => {
  const flex = loadTsModule('src/lib/line/flex-templates.ts', {
    '@/lib/utils': loadTsModule('src/lib/utils.ts', {
      clsx: { clsx: (...a) => a.join(' ') },
      'tailwind-merge': { twMerge: (s) => s },
    }),
  });

  const msg = flex.buildReceiptFlexMessage(
    {
      id: 'inv-1',
      invoiceNumber: '',
      roomNumber: '   ',
      tenantName: '',
      tenantPhone: '',
      billingDate: '2026-11-25',
      dueDate: '2026-11-05',
      totalAmount: 4972,
      status: 'paid',
      items: [],
    },
    '',
    4972,
    '   '
  );

  assert.equal(msg.type, 'flex');
  assert.ok(msg.altText.length > 0 && msg.altText.length <= 400);
  const textValues = collectFlexTextNodes(msg.contents);
  assert.ok(textValues.length >= 10);
  for (const txt of textValues) {
    assert.equal(typeof txt, 'string');
    assert.ok(txt.trim().length > 0, `Empty Flex text node detected: ${JSON.stringify(txt)}`);
  }
});

test('replyOrPushLineMessages falls back to pushMessage when replyToken fails or expires', async () => {
  const calls = [];
  const client = loadTsModule('src/lib/line/line-client.ts', {
    crypto,
    __fetch: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      if (url.endsWith('/message/reply')) {
        return {
          ok: false,
          status: 400,
          text: async () => JSON.stringify({ message: 'Invalid reply token' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ sentMessages: [] }),
      };
    },
  });

  const res = await client.replyOrPushLineMessages('token-123', 'expired-reply-token', 'U1234567890', [
    { type: 'text', text: 'ยืนยันการชำระเงิน' },
    { type: 'flex', altText: 'ใบเสร็จ', contents: { type: 'bubble' } },
  ]);

  assert.equal(res.success, true);
  assert.equal(res.method, 'push');
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/message\/reply$/);
  assert.match(calls[1].url, /\/message\/push$/);
  assert.equal(calls[1].body.to, 'U1234567890');
  assert.equal(calls[1].body.messages.length, 2);
});

test('replyOrPushLineMessages falls back to single-message pushes if combined push fails 400', async () => {
  const delivered = [];
  const client = loadTsModule('src/lib/line/line-client.ts', {
    crypto,
    __fetch: async (url, init) => {
      const body = JSON.parse(init.body);
      if (url.endsWith('/message/reply')) {
        return { ok: false, status: 400, text: async () => 'Invalid reply token' };
      }
      if (url.endsWith('/message/push') && body.messages.length > 1) {
        return { ok: false, status: 400, text: async () => 'Bad second message' };
      }
      if (body.messages[0]?.type === 'flex') {
        delivered.push(body.messages[0]);
        return { ok: true, status: 200, json: async () => ({}) };
      }
      return { ok: false, status: 400, text: async () => 'Bad text' };
    },
  });

  const res = await client.replyOrPushLineMessages('token-123', 'reply-tok', 'U999', [
    { type: 'text', text: '' },
    { type: 'flex', altText: 'ใบเสร็จ', contents: { type: 'bubble' } },
  ]);

  assert.equal(res.success, true);
  assert.equal(res.method, 'partial-push');
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].type, 'flex');
});

test('LINE webhook delivers receipt Flex via pushMessage fallback when reply fails after Slip2Go pass', async () => {
  const flexTemplates = loadTsModule('src/lib/line/flex-templates.ts', {
    '@/lib/utils': loadTsModule('src/lib/utils.ts', {
      clsx: { clsx: (...a) => a.join(' ') },
      'tailwind-merge': { twMerge: (s) => s },
    }),
  });

  const pushedPayloads = [];
  const realLineClient = loadTsModule('src/lib/line/line-client.ts', {
    crypto,
    __fetch: async (url, init) => {
      if (url.includes('/content')) {
        return { ok: true, status: 200, arrayBuffer: async () => Uint8Array.from([255, 216, 255, 0]).buffer };
      }
      if (url.endsWith('/message/reply')) {
        return { ok: false, status: 400, text: async () => 'Invalid reply token' };
      }
      if (url.endsWith('/message/push')) {
        pushedPayloads.push(JSON.parse(init.body));
        return { ok: true, status: 200, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    },
  });

  const receiptDelivery = loadTsModule('src/lib/line/receipt-delivery.ts', {
    '@/lib/database.service': { DatabaseService: { isRoomNumberMatch: () => true } },
    '@/lib/line/flex-templates': flexTemplates,
    '@/lib/line/line-client': realLineClient,
    '@/lib/supabase-relational': { toUuid: (x) => x },
  });

  const webhook = loadTsModule('src/app/api/line/webhook/route.ts', {
    'next/server': {
      NextResponse: {
        json(body, init = {}) {
          return { status: init.status || 200, body };
        },
      },
    },
    '@/lib/database.service': {
      DatabaseService: {
        async init() { return true; },
        getActivePropertyId() { return 'prop-1'; },
        async getAllProperties() { return [{ id: 'prop-1', name: 'พักดี แมนชั่น' }]; },
        async getProperty() { return { id: 'prop-1', name: 'พักดี แมนชั่น' }; },
        async getBranchSettings() {
          return {
            branchName: 'พักดี แมนชั่น',
            lineChannelSecret: 'secret-abc',
            lineChannelAccessToken: 'access-xyz',
            promptpayNumber: '0812345678',
          };
        },
        async getTenantByLineUser(userId) {
          return { id: 't-1', fullName: '', roomNumber: 'A1', lineUserId: userId };
        },
        async getInvoices() {
          return [{
            id: 'inv-1',
            invoiceNumber: 'INV-202611-A1',
            roomNumber: 'A1',
            tenantName: '',
            tenantPhone: '0811111111',
            billingDate: '2026-11-25',
            dueDate: '2026-11-05',
            totalAmount: 4972,
            status: 'unpaid',
            items: [],
          }];
        },
        isRoomNumberMatch: () => true,
      },
    },
    '@/lib/payment-slips-server': { SlipError: class extends Error {} },
    '@/lib/line/line-client': realLineClient,
    '@/lib/line/verify-payment': {
      async verifyLinePayment() {
        return { amount: 4972, message: '✅ สลิปผ่านการตรวจสอบจาก Slip2Go' };
      },
    },
    '@/lib/line/receipt-delivery': receiptDelivery,
    '@/lib/line/flex-templates': flexTemplates,
    '@/lib/promptpay': { generatePromptPayQRCodeUrl: () => 'https://example.test/qr.png' },
  });

  const bodyObj = {
    events: [
      {
        type: 'message',
        replyToken: 'expired-token-123',
        source: { userId: 'U1234567890abcdef' },
        message: { id: 'msg-img-1', type: 'image' },
      },
    ],
  };
  const rawBody = JSON.stringify(bodyObj);
  const sig = crypto.createHmac('sha256', 'secret-abc').update(rawBody, 'utf8').digest('base64');

  const req = {
    text: async () => rawBody,
    headers: { get: (k) => (k.toLowerCase() === 'x-line-signature' ? sig : null) },
  };

  const res = await webhook.POST(req);
  assert.equal(res.status, 200);
  assert.equal(pushedPayloads.length, 1);
  assert.equal(pushedPayloads[0].to, 'U1234567890abcdef');
  assert.equal(pushedPayloads[0].messages.length, 2);
  assert.equal(pushedPayloads[0].messages[0].type, 'text');
  assert.equal(pushedPayloads[0].messages[0].quickReply, undefined);
  assert.equal(pushedPayloads[0].messages[1].type, 'flex');
  assert.ok(Array.isArray(pushedPayloads[0].messages[1].quickReply?.items));
  assert.match(pushedPayloads[0].messages[1].altText, /REC-202611-A1/);
  const textNodes = collectFlexTextNodes(pushedPayloads[0].messages[1].contents);
  assert.ok(textNodes.every((t) => typeof t === 'string' && t.trim().length > 0));
});

test('payment-slips upload notifies LINE receipt when Slip2Go passes', async () => {
  const pushed = [];
  const route = loadTsModule('src/app/api/payment-slips/route.ts', {
    'next/server': {
      NextResponse: {
        json(body, init = {}) {
          return { status: init.status || 200, body, headers: init.headers };
        },
      },
    },
    '@/lib/payment-slips-server': {
      authorizeSlipRequest: async () => ({ db: {}, propertyUuid: 'uuid-prop-1' }),
      decodeSlipImage: () => Buffer.from('bytes'),
      savePaymentSlip: async () => 'slip-99',
      SlipError: class extends Error { constructor(m, s = 400) { super(m); this.status = s; } },
    },
    '@/lib/slip-verification': { validateImageSignature: () => ({ isValid: true }) },
    '@/lib/line/verify-payment': {
      verifyStoredPayment: async () => ({ status: 'passed', amount: 4972, message: '✅ ตรวจผ่าน' }),
    },
    '@/lib/line/receipt-delivery': {
      async pushReceiptToTenantLine(opts) {
        pushed.push(opts);
        return { notified: true, recipient: 'Uabc', method: 'push' };
      },
    },
  });

  const fakeFile = new File([Uint8Array.from([255, 216, 255, 0])], 'slip.jpg', { type: 'image/jpeg' });
  const fakeForm = new Map([['image', fakeFile], ['invoiceNumber', 'INV-202611-A1']]);
  const req = {
    nextUrl: { searchParams: new URLSearchParams({ propertyId: 'prop-1', action: 'upload' }) },
    formData: async () => fakeForm,
  };

  const res = await route.POST(req);
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'passed');
  assert.equal(res.body.lineNotified, true);
  assert.equal(pushed.length, 1);
  assert.equal(pushed[0].invoiceIdOrNumber, 'INV-202611-A1');
  assert.equal(pushed[0].paidAmount, 4972);
});

test('attachQuickReplyToLast puts quickReply only on the final message and mock defaults have no stale LINE secrets', () => {
  const flexTemplates = loadTsModule('src/lib/line/flex-templates.ts', {
    '@/lib/utils': loadTsModule('src/lib/utils.ts', {
      clsx: (...args) => args.flat().filter(Boolean).join(' '),
      'tailwind-merge': (s) => s,
    }),
  });
  const arranged = flexTemplates.attachQuickReplyToLast([
    { type: 'text', text: 'first', quickReply: { items: [] } },
    { type: 'flex', altText: 'card', contents: { type: 'bubble' } },
  ]);
  assert.equal(arranged[0].quickReply, undefined);
  assert.ok(Array.isArray(arranged[1].quickReply?.items) && arranged[1].quickReply.items.length > 0);

  const mockData = loadTsModule('src/lib/mock-data.ts', {
    '@/types/dormitory': {},
  });
  assert.equal(mockData.initialBranchSettings.lineChannelAccessToken, '');
  assert.equal(mockData.initialBranchSettings.lineChannelSecret, '');
});

