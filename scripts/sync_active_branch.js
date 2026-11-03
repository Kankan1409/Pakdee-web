const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, '..', 'data', 'db_port3000.json');
const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));

const realToken = "qKsCOa6uRWKLAHJcrs/QljDmKls4sZgZHYrkIcXZ5LQ0CYSOpNKBxxF+aL/pIyXXrljrFz5wqZfCPhMFWTaRtIE0PXT/53dqod9MzjfS48Dx3ZH7nABvX6d/nrtcw6c1aGSWCIZoHtsRv9kcKFwCYAdB04t89/1O/w1cDnyilFU=";
const realSecret = "5a3c837da6ba0045ed0073e06cc45de6";
const realWebhook = "https://ist-receiving-pursue-newport.trycloudflare.com/api/line/webhook";

const activePropId = db.pakdee_dev_active_property_id || db.active_property_id || "prop-1793250152420";
console.log('Active Property ID:', activePropId);

// 1. Update all branch settings keys in db to use the real LINE token and secret
Object.keys(db).forEach(k => {
  if (k.includes('branch_settings')) {
    if (db[k] && typeof db[k] === 'object') {
      db[k].lineChannelAccessToken = realToken;
      db[k].lineChannelSecret = realSecret;
      db[k].lineWebhookUrl = realWebhook;
    }
  }
});

// Also explicitly set for activePropId
['pakdee_dev_branch_settings_' + activePropId, 'branch_settings_' + activePropId, 'pakdee_dev_branch_settings', 'branch_settings'].forEach(k => {
  db[k] = {
    ...(db[k] || {}),
    id: 'settings-' + activePropId,
    branchName: 'วิภาวรรณ 1',
    lineChannelAccessToken: realToken,
    lineChannelSecret: realSecret,
    lineWebhookUrl: realWebhook,
    promptpayNumber: '0854625145',
    promptpayName: 'สสส',
    electricRate: 10,
    waterRate: 20
  };
});

// 2. Synchronize rooms to activePropId
const rooms = db.pakdee_dev_rooms || db.rooms || [];
rooms.forEach(r => {
  r.propertyId = activePropId;
  if (r.currentTenant) {
    r.currentTenant.propertyId = activePropId;
  }
});
// Ensure Room 101 has currentTenant
const r101 = rooms.find(r => r.roomNumber === '101');
if (r101) {
  r101.status = 'occupied';
  r101.currentTenant = {
    id: 't-101',
    propertyId: activePropId,
    roomId: 'room-101',
    roomNumber: '101',
    fullName: 'นายสมชาย สุขสบาย',
    phone: '089-999-8888',
    idCard: '1100200300400',
    lineId: 'somchai_suk'
  };
}
db.pakdee_dev_rooms = rooms;
db.rooms = rooms;

// 3. Synchronize tenants to activePropId
const tenants = db.pakdee_dev_tenants || db.tenants || [];
tenants.forEach(t => {
  t.propertyId = activePropId;
});
let t101 = tenants.find(t => t.roomNumber === '101' || t.id === 't-101');
if (t101) {
  t101.propertyId = activePropId;
  t101.roomNumber = '101';
  t101.roomId = 'room-101';
}
db.pakdee_dev_tenants = tenants;
db.tenants = tenants;

// 4. Synchronize invoices to activePropId
const invoices = db.pakdee_dev_invoices || db.invoices || [];
invoices.forEach(i => {
  i.propertyId = activePropId;
});
const inv101 = invoices.find(i => i.roomNumber === '101');
if (inv101) {
  inv101.propertyId = activePropId;
  inv101.status = 'unpaid';
  delete inv101.paidAt;
}
db.pakdee_dev_invoices = invoices;
db.invoices = invoices;

fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf8');
console.log('Successfully synchronized database with active branch', activePropId);
