const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qygelgekosmklwrgnaxq.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_S6JucHfTQV7ZdzjArXxlYA_ZONRk8DI';

const supabase = createClient(url, key);

async function migrate() {
  console.log('Fetching live database from 192.168.7.127:3000...');
  let db = {};
  try {
    const res = await fetch('http://192.168.7.127:3000/api/db');
    const json = await res.json();
    if (json.success && json.data) {
      db = json.data;
      console.log('Successfully fetched from 127, keys count:', Object.keys(db).length);
    }
  } catch (e) {
    console.warn('Could not fetch from 127, using local file backup:', e.message);
    if (fs.existsSync('D:/DESKTOP/Pakdee/data/db_port3000.json')) {
      db = JSON.parse(fs.readFileSync('D:/DESKTOP/Pakdee/data/db_port3000.json', 'utf8'));
    }
  }

  const entries = Object.entries(db);
  if (entries.length === 0) {
    console.error('No data found to migrate.');
    return;
  }

  console.log(`Migrating ${entries.length} items to Supabase pakdee_store...`);
  let successCount = 0;
  for (const [k, v] of entries) {
    try {
      const { error } = await supabase
        .from('pakdee_store')
        .upsert({
          key: k,
          value: v,
          updated_at: new Date().toISOString(),
        });
      if (error) {
        console.error(`Failed to migrate key [${k}]:`, error.message);
      } else {
        successCount++;
      }
    } catch (err) {
      console.error(`Error migrating [${k}]:`, err.message);
    }
  }

  console.log(`\nMigration completed! ${successCount}/${entries.length} keys migrated to Supabase successfully.`);
}

migrate();
