const fs = require('fs');
const path = require('path');

const files = [
  'src/lib/validators.ts',
  'src/lib/popup-context.tsx',
  'src/components/ui/app-popup-modal.tsx',
  'src/components/tenants/tenant-registration-view.tsx',
  'src/components/tenants/add-tenant-modal.tsx',
  'src/app/page.tsx',
  'src/components/settings/branch-settings-view.tsx',
  'src/components/contracts/contract-management-view.tsx',
  'src/components/rooms/add-room-modal.tsx'
];

const srcBase = 'D:/DESKTOP/Pakdee';
const dstBase = 'D:/DESKTOP/Pakdee-UserTest';

files.forEach(file => {
  const src = path.join(srcBase, file);
  const dst = path.join(dstBase, file);
  const dir = path.dirname(dst);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.copyFileSync(src, dst);
  console.log(`[SYNC SUCCESS] ${file}`);
});

console.log('All files synced to Pakdee-UserTest successfully!');
