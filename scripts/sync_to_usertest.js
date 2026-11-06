const fs = require('fs');
const path = require('path');

const files = [
  'src/types/dormitory.ts',
  'src/lib/database.service.ts',
  'src/lib/mock-data.ts',
  'src/lib/validators.ts',
  'src/lib/slip-verification.ts',
  'src/lib/promptpay.ts',
  'src/lib/popup-context.tsx',
  'src/lib/line/flex-templates.ts',
  'src/lib/line/line-client.ts',
  'src/app/api/db/route.ts',
  'src/app/api/line/webhook/route.ts',
  'src/app/api/line/send-invoice/route.ts',
  'src/app/api/line/broadcast/route.ts',
  'src/components/broadcast/broadcast-line-view.tsx',
  'src/components/invoice/invoice-preview-modal.tsx',
  'src/components/dashboard/daily-checkout-modal.tsx',
  'src/components/dashboard/room-detail-modal.tsx',
  'src/components/dashboard/room-matrix.tsx',
  'src/components/ui/app-popup-modal.tsx',
  'src/components/tenants/tenant-registration-view.tsx',
  'src/components/tenants/add-tenant-modal.tsx',
  'src/components/settings/branch-settings-view.tsx',
  'src/components/contracts/contract-management-view.tsx',
  'src/components/rooms/add-room-modal.tsx',
  'src/components/meters/meter-spreadsheet-view.tsx',
  'src/components/meter/quick-meter-modal.tsx',
  'src/components/accounting/add-expense-modal.tsx',
  'src/components/accounting/accounting-export-view.tsx',
  'src/components/checkout/checkout-management-view.tsx',
  'src/components/daily/daily-calendar-view.tsx',
  'src/components/cleaning/cleaning-board-view.tsx',
  'src/components/tenants/tenants-list-view.tsx',
  'src/components/invoices/invoices-billing-view.tsx',
  'src/components/invoices/slip-verification-view.tsx',
  'src/components/invoices/receipts-list-view.tsx',
  'src/components/layout/sidebar.tsx',
  'src/app/page.tsx',
  'src/app/api/line/notify-slip/route.ts',
  'docs/PAKDEE_LINE_BOT_AND_PAYMENT_SLIP_AUDIT_REPORT.md',
  'next.config.ts'
];

const srcBase = 'D:/DESKTOP/Pakdee';
const dstBase = 'D:/DESKTOP/Pakdee-UserTest';

files.forEach(file => {
  const src = path.join(srcBase, file);
  const dst = path.join(dstBase, file);
  if (!fs.existsSync(src)) return;
  const dir = path.dirname(dst);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.copyFileSync(src, dst);
  console.log(`[SYNC SUCCESS] ${file}`);
});

console.log('All files synced to Pakdee-UserTest successfully!');
