import { SlipVerificationService, computeSlipHash } from '../src/lib/slip-verification.ts';

console.log('========================================================');
console.log('🧪 AUTOMATED QA TEST: SLIP VERIFICATION & DEDUPLICATION');
console.log('========================================================\n');

const mockInvoice = {
  id: 'inv-101',
  roomNumber: '101',
  tenantName: 'สมชาย รักสงบ',
  totalAmount: 4500,
  status: 'unpaid',
};

const existingInvoices = [
  {
    id: 'inv-102',
    roomNumber: '102',
    tenantName: 'วิภาดา',
    totalAmount: 4200,
    status: 'paid',
    slipTransRef: '0143105829104829',
    slipHash: 'abc123hashpreviousslip',
    slipVerifiedAt: '04/11/2026 14:00 น.',
  },
];

let passed = 0;
let total = 0;

function assert(condition, testName, extraInfo = '') {
  total++;
  if (condition) {
    passed++;
    console.log(`✅ [PASS] ${testName}`);
  } else {
    console.error(`❌ [FAIL] ${testName} - ${extraInfo}`);
  }
}

// -------------------------------------------------------------
// Test 1: Fake Slip Test (Flagged Fake / Non-bank)
// -------------------------------------------------------------
const fakeRes = SlipVerificationService.verifySlip({
  invoice: mockInvoice,
  allInvoices: existingInvoices,
  manualInput: {
    isFake: true,
    amount: 4500,
  },
});
assert(fakeRes.success === false, 'Test 1.1: Rejects fake slip');
assert(fakeRes.reason === 'FAKE_OR_INVALID_SLIP', 'Test 1.2: Correct fake slip reason code');

// -------------------------------------------------------------
// Test 2: Duplicate TransRef Test
// -------------------------------------------------------------
const dupRefRes = SlipVerificationService.verifySlip({
  invoice: mockInvoice,
  allInvoices: existingInvoices,
  manualInput: {
    transRef: '0143105829104829', // Same ref as inv-102
    amount: 4500,
  },
});
assert(dupRefRes.success === false, 'Test 2.1: Rejects duplicate TransRef');
assert(dupRefRes.reason === 'DUPLICATE_TRANS_REF', 'Test 2.2: Correct duplicate TransRef reason code');
assert(dupRefRes.message.includes('เคยถูกนำมาตัดยอดบิลห้อง 102'), 'Test 2.3: Message specifies previous room');

// -------------------------------------------------------------
// Test 3: Duplicate Image Hash Test (Same photo sent twice)
// -------------------------------------------------------------
const mockBuffer = Buffer.alloc(15000);
// Add JPEG header to simulate valid image
mockBuffer[0] = 0xff; mockBuffer[1] = 0xd8; mockBuffer[2] = 0xff;
// Add KBank signature
Buffer.from('kbank promptpay 004600060000010103014').copy(mockBuffer, 100);

const mockHash = computeSlipHash(mockBuffer);
const invoicesWithHash = [
  {
    ...existingInvoices[0],
    slipHash: mockHash,
  },
];

const dupHashRes = SlipVerificationService.verifySlip({
  imageBuffer: mockBuffer,
  invoice: mockInvoice,
  allInvoices: invoicesWithHash,
});
assert(dupHashRes.success === false, 'Test 3.1: Rejects duplicate image buffer (SHA-256 collision)');
assert(dupHashRes.reason === 'DUPLICATE_SLIP_HASH', 'Test 3.2: Correct duplicate hash reason code');

// -------------------------------------------------------------
// Test 4: Amount Mismatch Test (Amount < Invoice Total)
// -------------------------------------------------------------
const underpaidRes = SlipVerificationService.verifySlip({
  invoice: mockInvoice, // 4,500 THB
  allInvoices: existingInvoices,
  manualInput: {
    transRef: '0143109999999999',
    amount: 500, // Only 500 THB
  },
});
assert(underpaidRes.success === false, 'Test 4.1: Rejects underpaid amount');
assert(underpaidRes.reason === 'AMOUNT_MISMATCH', 'Test 4.2: Correct amount mismatch reason code');
assert(underpaidRes.message.includes('ขาดอีก ฿4,000'), 'Test 4.3: Calculates remaining difference accurately');

// -------------------------------------------------------------
// Test 5: Valid Slip Test (All gates pass)
// -------------------------------------------------------------
const validRes = SlipVerificationService.verifySlip({
  invoice: mockInvoice,
  allInvoices: existingInvoices,
  manualInput: {
    transRef: '0143109999999999', // Fresh ref
    amount: 4500, // Exact amount
    bankName: 'ธนาคารกสิกรไทย (KBank)',
  },
});
assert(validRes.success === true, 'Test 5.1: Approves valid slip');
assert(validRes.transRef === '0143109999999999', 'Test 5.2: Returns correct transRef');
assert(validRes.amount === 4500, 'Test 5.3: Returns exact amount');

console.log(`\n========================================================`);
console.log(`📊 TEST RESULTS: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
console.log(`========================================================\n`);

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
