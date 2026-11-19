# แผนแยกข้อมูลแต่ละบัญชีด้วย Supabase Auth + RLS

> เอกสารศึกษาก่อนลงมือ (ยังไม่ได้แก้โค้ดตามแผนนี้) — เขียนเมื่อ 2026-11-19

## 1. สรุปสั้น ๆ

ใช้ฐานข้อมูล Supabase ก้อนเดิม แต่ให้ **ฐานข้อมูลเป็นคนเช็กสิทธิ์เองทุกแถว** (Row Level Security หรือ RLS)
ทุกบัญชีจะอ่าน/เขียนได้เฉพาะข้อมูลของสาขาตัวเอง ต่อให้มีคนเอา anon key ไปยิง API ตรง ๆ ก็ไม่เห็นข้อมูลของบัญชีอื่น

ต้องทำ 2 อย่างคู่กัน:

1. **ย้ายระบบล็อกอินไปใช้ Supabase Auth** — ฐานข้อมูลถึงจะรู้ว่า "ใครกำลังขอข้อมูล" (`auth.uid()`)
2. **เปิด RLS + เขียนกฎ (policy) ทุกตาราง** — "อ่านได้ถ้าสาขาของแถวนี้เป็นของบัญชีที่ล็อกอิน"

---

## 2. ตอนนี้เป็นอย่างไร (และทำไมต้องเปลี่ยน)

| เรื่อง | ตอนนี้ | ปัญหา |
|---|---|---|
| ล็อกอิน | `src/lib/auth-context.tsx` ดึง `user_profiles` **ทุกแถว** มาที่เบราว์เซอร์ แล้วเทียบรหัสผ่านในเบราว์เซอร์ | ⚠️ รหัสผ่านของ**ทุกบัญชี**ถูกส่งมาที่เบราว์เซอร์ของทุกคนที่เปิดหน้าล็อกอิน |
| เก็บรหัสผ่าน | ข้อความเปล่าใน `user_profiles.assigned_branch_ids` รูปแบบ `pwd:รหัส` | ⚠️ ไม่เข้ารหัส ใครเห็นตารางก็เห็นรหัสผ่าน |
| สิทธิ์ตาราง | RLS เปิดอยู่ แต่กฎเป็น `USING (true)` = ทุกคนทำได้ทุกอย่าง | anon key อยู่ในโค้ดหน้าเว็บ ใครก็อ่าน/แก้/ลบได้ทุกแถว |
| แยกบัญชี | กรองที่หน้าเว็บ (`src/lib/branch-ownership.ts`) | กันได้แค่คนที่ใช้หน้าเว็บตามปกติ |
| ฝั่งเซิร์ฟเวอร์ | LINE webhook / ส่งบิล / บรอดแคสต์ ใช้ anon key (`src/lib/supabase.ts`) มีแค่ระบบสลิปที่ใช้ service role key | หลังเปิด RLS จริง ฝั่งเซิร์ฟเวอร์ที่ใช้ anon key จะมองไม่เห็นข้อมูลเลย ต้องเปลี่ยน |
| ลืมรหัสผ่าน | ไม่มีระบบจริง (หน้าเว็บบอกให้ติดต่อผู้ดูแล) | Supabase Auth มีระบบรีเซ็ตทางอีเมลให้ฟรี |

**สิ่งที่ใช้ต่อได้เลย:** โครงสร้างที่ทำไว้แล้ว `บัญชี → สาขา (properties.owner_id) → ทุกตาราง (property_id)`

---

## 3. ภาพหลังเปลี่ยน

```
auth.users (Supabase Auth: อีเมล + รหัสผ่านที่เข้ารหัสแล้ว)
   │  auth.uid()
   ▼
user_profiles (id = U0002, auth_user_id = uuid ของ auth.users, role, ชื่อ, เบอร์)
   │  owner_id = U0002
   ▼
properties (สาขา)
   │  property_id
   ▼
rooms, tenants, contracts, invoices, invoice_items*, meter_readings, repairs,
expenses, daily_bookings, activity_logs, branch_settings, payment_slips,
contract_sign_requests, line_reminder_logs
   (* invoice_items ผูกผ่าน invoices)
```

ใครเข้าได้:

- **เจ้าของหอ (owner):** สาขาที่ `properties.owner_id` = รหัสบัญชีตัวเอง
- **ผู้จัดการ (manager):** สาขาที่อยู่ใน `user_profiles.assigned_branch_ids` ของตัวเอง
- **เซิร์ฟเวอร์ (API / LINE webhook / ตัวตั้งเวลาแจ้งเตือน):** ใช้ service role key ซึ่งข้าม RLS — ต้องกรองตามสาขาเองในโค้ด (ทำอยู่แล้ว)

---

## 4. ขั้นตอน

### ขั้น 0 — เตรียมก่อนเริ่ม (ห้ามข้าม)

1. **commit + push งานที่ค้างทั้งหมด** แล้วแตก branch ใหม่ เช่น `feature/auth-rls`
2. **สร้าง Supabase project ทดสอบ** แยกจากของจริง แล้ว copy โครงสร้าง + ข้อมูลตัวอย่างไป
   (Dashboard → Database → Backups หรือใช้ `pg_dump`) ทดสอบทุกอย่างบน project นี้ก่อน
3. **backup ฐานข้อมูลจริง**
4. **ทุกสาขาต้องมีเจ้าของ** — รันใน SQL Editor:
   ```sql
   SELECT id, name, owner_id, owner_phone FROM public.properties WHERE owner_id IS NULL;
   ```
   ถ้ามีแถว ให้ล็อกอินบัญชีเจ้าของแล้วกด "เป็นสาขาของฉัน" หรือใส่ owner_id เองด้วย `UPDATE`
5. **ทุกแถวต้องรู้สาขา** — รันคำสั่งนับท้ายไฟล์ `docs/supabase_account_scope.sql` ต้องได้ 0 ทุกตาราง
   (แถวที่ `property_id` เป็น NULL จะมองไม่เห็นเลยหลังเปิด RLS)
6. รัน SQL ที่ค้างในรายการ changelog ให้ครบก่อน (`supabase_branch_isolation.sql`, `supabase_account_scope.sql`, ...)

### ขั้น 1 — เปิด Supabase Auth

Dashboard → **Authentication → Providers → Email**: เปิด
- **Confirm email:** ช่วงแรกแนะนำ *ปิด* (สมัครแล้วเข้าได้ทันที) เปิดทีหลังเมื่อพร้อมส่งอีเมลจริง
- **Authentication → URL Configuration:** ใส่ URL ของเว็บ (เช่น `http://192.168.7.127:3000`) สำหรับลิงก์รีเซ็ตรหัสผ่าน

> **เรื่องล็อกอินด้วยเบอร์โทร:** Supabase Auth ล็อกอินด้วยเบอร์ได้ แต่ต้องต่อผู้ให้บริการ SMS (มีค่าใช้จ่าย)
> ทางเลือกที่ไม่เสียเงิน: ให้ผู้ใช้พิมพ์เบอร์เหมือนเดิม แล้วโค้ดแปลงเป็นอีเมลภายใน เช่น `0812345678@phone.pakdee.local`
> (ใช้ได้เมื่อปิด Confirm email — แต่ระบบรีเซ็ตรหัสผ่านทางอีเมลจะใช้กับบัญชีแบบนี้ไม่ได้) → **ต้องตัดสินใจ** (ดูข้อ 7)

### ขั้น 2 — ผูก `user_profiles` กับ `auth.users` (SQL)

```sql
-- รหัสผู้ใช้ของ Supabase Auth
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- ฟังก์ชันช่วย: รหัสบัญชีของคนที่ล็อกอินอยู่ (U0002) — ใช้ในทุก policy
CREATE OR REPLACE FUNCTION public.current_app_user_id() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id::text FROM public.user_profiles
  WHERE auth_user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- ฟังก์ชันช่วย: บัญชีที่ล็อกอินเข้าสาขานี้ได้ไหม (เจ้าของ หรือผู้จัดการที่ได้รับมอบหมาย)
CREATE OR REPLACE FUNCTION public.can_access_property(pid TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id::text = pid AND p.owner_id = public.current_app_user_id()
  ) OR EXISTS (
    SELECT 1 FROM public.user_profiles u
    WHERE u.auth_user_id = auth.uid() AND u.is_active = true
      AND u.role = 'manager' AND pid = ANY(u.assigned_branch_ids)
  );
$$;
```

> `SECURITY DEFINER` = ฟังก์ชันอ่านตาราง `properties`/`user_profiles` ได้เองโดยไม่ติด RLS
> (ไม่งั้น policy ของ properties จะเรียกตัวเองวนไม่จบ)

### ขั้น 3 — ย้ายบัญชีเดิมเข้า Supabase Auth

ทางที่ง่ายและปลอดภัยที่สุด: **ให้ผู้ใช้เดิมตั้งรหัสผ่านใหม่ 1 ครั้ง**

1. สร้างผู้ใช้ใน Auth ให้ทุกบัญชีเดิม — ทำจากสคริปต์ฝั่งเซิร์ฟเวอร์ด้วย service role key:
   ```ts
   // scripts/migrate_users_to_auth.ts (รันครั้งเดียว บนเครื่องเรา ไม่ใช่ในเบราว์เซอร์)
   const admin = createClient(URL, SERVICE_ROLE_KEY);
   for (const u of profiles) {
     const { data } = await admin.auth.admin.createUser({
       email: u.email || `${digits(u.phone)}@phone.pakdee.local`,
       password: randomTempPassword(),   // หรือย้ายรหัสเดิมจาก pwd:... (ดูหมายเหตุ)
       email_confirm: true,
     });
     await admin.from("user_profiles").update({ auth_user_id: data.user.id }).eq("id", u.id);
   }
   ```
2. ส่งลิงก์ตั้งรหัสผ่านใหม่ให้แต่ละคน (`admin.auth.admin.generateLink({ type: "recovery", email })`)
   หรือถ้ามีผู้ใช้ไม่กี่คน ตั้งรหัสให้เองแล้วบอกทีละคน
3. **ลบรหัสผ่านข้อความเปล่าทิ้ง:**
   ```sql
   UPDATE public.user_profiles
   SET assigned_branch_ids = array(SELECT x FROM unnest(assigned_branch_ids) x WHERE x NOT LIKE 'pwd:%');
   ```

> **หมายเหตุ:** ใช้รหัสเดิมจาก `pwd:...` เป็นรหัสใน Auth ได้ (ผู้ใช้ไม่ต้องตั้งใหม่) แต่รหัสเหล่านั้นเคยถูกส่งไปทุกเบราว์เซอร์แล้ว ถือว่ารั่ว — แนะนำให้ตั้งใหม่

### ขั้น 4 — แก้โค้ดล็อกอิน/สมัคร (`src/lib/auth-context.tsx`)

| ฟังก์ชัน | เดิม | ใหม่ |
|---|---|---|
| `login` | ดึง `user_profiles` ทั้งตาราง แล้วเทียบรหัสในเบราว์เซอร์ | `supabase.auth.signInWithPassword({ email, password })` แล้วอ่าน `user_profiles` **แถวของตัวเอง** |
| `register` | insert `user_profiles` พร้อม `pwd:รหัส` | `supabase.auth.signUp(...)` แล้ว insert `user_profiles` ด้วย `auth_user_id` (ไม่มีรหัสผ่าน) — ต้องออกรหัส U000x ฝั่งเซิร์ฟเวอร์ (API route) เพราะผู้ใช้ใหม่อ่านรหัสของคนอื่นไม่ได้แล้ว |
| คืน session ตอนเปิดเว็บ | ล็อกอินซ้ำด้วยรหัสที่เก็บใน `localStorage` (`pakdee_user_password`) | `supabase.auth.getSession()` + `onAuthStateChange` — **เลิกเก็บรหัสผ่านใน localStorage** |
| `verifyPassword` (ยืนยันก่อนลบสาขา) | เทียบกับรหัสใน localStorage | `signInWithPassword` ซ้ำอีกครั้ง (re-auth) |
| `logout` | ล้าง localStorage | `supabase.auth.signOut()` + ล้างแคชข้อมูล |
| หมดเวลา 15 นาที | ตัวจับเวลาเอง | ใช้ต่อได้ แค่เรียก `signOut()` |
| ลืมรหัสผ่าน | ไม่มี | `supabase.auth.resetPasswordForEmail(email)` + หน้าใหม่ `/reset-password` |

ไฟล์อื่นที่เกี่ยว: `src/components/auth/login-view.tsx`, `register-view.tsx`, `src/app/login`, `src/app/register`

**คำขอไป API ฝั่งเซิร์ฟเวอร์:** ตอนนี้ส่ง `Authorization: Basic รหัสบัญชี:รหัสผ่าน` (`payment-slips-client.ts` ฯลฯ)
→ เปลี่ยนเป็น `Authorization: Bearer <access_token>` แล้วฝั่งเซิร์ฟเวอร์ตรวจด้วย `admin.auth.getUser(token)`
(แก้ `authorizeSlipRequest` ใน `src/lib/payment-slips-server.ts`)

### ขั้น 5 — ฝั่งเซิร์ฟเวอร์ใช้ service role key

หลังเปิด RLS จริง anon key ฝั่งเซิร์ฟเวอร์ (ไม่มีผู้ใช้ล็อกอิน) จะ**มองไม่เห็นอะไรเลย**

1. สร้าง `src/lib/supabase-server.ts`:
   ```ts
   import "server-only";
   export const supabaseAdmin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
     auth: { persistSession: false, autoRefreshToken: false },
   });
   ```
2. ไฟล์ที่ต้องเปลี่ยนไปใช้ `supabaseAdmin`:
   - `src/app/api/line/webhook/route.ts`, `send-invoice`, `broadcast`, `notify-slip`, `reminders`
   - `src/app/api/contracts/sign/route.ts`, `src/app/api/db/route.ts`
   - `src/instrumentation.ts` (ตัวตั้งเวลาแจ้งเตือน)
   - `loadCoreContextFromSupabase` / `loadFromRelationalTables` เมื่อถูกเรียกจากเซิร์ฟเวอร์ (ส่ง client เข้าไปเป็นพารามิเตอร์)
3. **ห้าม** import `supabase-server.ts` ในไฟล์ที่รันบนเบราว์เซอร์ (`"server-only"` จะ error ให้ตอน build)
4. service role key ต้องอยู่ใน `.env` เท่านั้น ห้ามขึ้นต้นด้วย `NEXT_PUBLIC_`

### ขั้น 6 — เปิด RLS + กฎทุกตาราง (SQL)

ทำเป็นไฟล์ `docs/supabase_rls_policies.sql` แล้วรันบน project ทดสอบก่อน

```sql
-- ลบกฎเดิมที่ให้ทุกคนทำได้ทุกอย่าง (ชื่อ "Public Access on <ตาราง>")
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['properties','branch_settings','rooms','tenants','contracts','invoices',
    'invoice_items','meter_readings','repairs','expenses','daily_bookings','activity_logs',
    'payment_slips','contract_sign_requests','line_reminder_logs','user_profiles']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public Access on %s" ON public.%I', t, t);
  END LOOP;
END $$;

-- สาขา: เห็น/แก้/ลบได้เฉพาะของตัวเอง, สร้างได้เฉพาะในชื่อตัวเอง
CREATE POLICY properties_select ON public.properties FOR SELECT
  USING (public.can_access_property(id::text));
CREATE POLICY properties_insert ON public.properties FOR INSERT
  WITH CHECK (owner_id = public.current_app_user_id());
CREATE POLICY properties_update ON public.properties FOR UPDATE
  USING (owner_id = public.current_app_user_id())
  WITH CHECK (owner_id = public.current_app_user_id());   -- กันโอนสาขาให้บัญชีอื่น
CREATE POLICY properties_delete ON public.properties FOR DELETE
  USING (owner_id = public.current_app_user_id());

-- ตารางที่มี property_id: กฎเดียวกันหมด
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['branch_settings','rooms','tenants','contracts','invoices','meter_readings',
    'repairs','expenses','daily_bookings','activity_logs','payment_slips','contract_sign_requests',
    'line_reminder_logs']
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL
         USING (public.can_access_property(property_id::text))
         WITH CHECK (public.can_access_property(property_id::text))',
      t || '_by_branch', t);
  END LOOP;
END $$;

-- รายการในบิล: ผูกผ่านบิล
CREATE POLICY invoice_items_by_invoice ON public.invoice_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.invoices i
                 WHERE i.id = invoice_items.invoice_id AND public.can_access_property(i.property_id::text)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i
                 WHERE i.id = invoice_items.invoice_id AND public.can_access_property(i.property_id::text)));

-- โปรไฟล์: เห็น/แก้ได้เฉพาะของตัวเอง (สร้างผ่าน API ฝั่งเซิร์ฟเวอร์)
CREATE POLICY user_profiles_self_select ON public.user_profiles FOR SELECT
  USING (auth_user_id = auth.uid());
CREATE POLICY user_profiles_self_update ON public.user_profiles FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());   -- ระวัง: ควรห้ามแก้ role เอง (ทำผ่าน trigger หรือ API)

-- ดัชนีให้ policy เร็ว
CREATE INDEX IF NOT EXISTS user_profiles_auth_user_id_idx ON public.user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS properties_owner_id_idx ON public.properties(owner_id);

NOTIFY pgrst, 'reload schema';
```

> ตรวจชื่อตาราง/คอลัมน์กับฐานข้อมูลจริงก่อนรัน — เช่น `payment_slips`, `contract_sign_requests`, `line_reminder_logs` ต้องมี `property_id` แล้ว
> (ตารางไหนยังไม่มี ต้องเพิ่มคอลัมน์ + เติมค่าก่อน ไม่งั้นแถวพวกนั้นจะมองไม่เห็น)

**Realtime** (`supabase_realtime_relational.sql`) เคารพ RLS อัตโนมัติ — แต่ละบัญชีจะได้รับเฉพาะการเปลี่ยนแปลงของตัวเอง

### ขั้น 7 — เก็บกวาดโค้ดฝั่งเว็บ

หลัง RLS ทำงานแล้ว ของเหล่านี้ไม่จำเป็น/ต้องปรับ:

- `scopeLoadedDataToAccount` ใน `src/lib/supabase-relational.ts` — เก็บไว้ได้ (ไม่เสียหาย) แต่ฐานข้อมูลจะกรองให้แล้ว
- `getRemoteShortIds` / การออกรหัส T0001, I0001 — **ใช้ไม่ได้แล้ว** เพราะมองไม่เห็นรหัสของบัญชีอื่น
  → ต้องย้ายการออกรหัสไปทำในฐานข้อมูล (sequence หรือ trigger `BEFORE INSERT`) หรือใช้ UUID แล้วแสดงเลขสั้นแยก
  ⚠️ เป็นงานที่ใหญ่ที่สุดในแผนนี้ ถ้าไม่ทำ สองบัญชีจะออกรหัสซ้ำแล้ว insert ไม่ผ่าน (RLS ไม่ให้ทับแถวคนอื่น — ข้อมูลไม่หาย แต่บันทึกไม่ได้)
- `pruneOrphanRows` — ปลอดภัยขึ้นเอง (ลบแถวของบัญชีอื่นไม่ได้)
- ปุ่ม "เป็นสาขาของฉัน" — สาขาที่ไม่มีเจ้าของจะไม่มีใครเห็น ต้องจัดการให้ครบที่ขั้น 0
- หน้า "Super Admin (Support)" — ถ้าต้องการให้ผู้ดูแลระบบเห็นทุกสาขา ต้องทำผ่าน API ฝั่งเซิร์ฟเวอร์ (service role) ไม่ใช่จากเบราว์เซอร์

---

## 5. ทดสอบ (บน project ทดสอบ)

- [ ] สมัครบัญชีใหม่ A และ B → สร้างสาขาคนละสาขา → แต่ละบัญชีเห็นเฉพาะสาขาตัวเอง
- [ ] ยิง API ตรงด้วย anon key **ไม่ล็อกอิน**: `GET /rest/v1/rooms` → ต้องได้ `[]`
- [ ] ล็อกอิน A แล้วยิง `GET /rest/v1/invoices?property_id=eq.<สาขาของ B>` → ต้องได้ `[]`
- [ ] A พยายาม `PATCH` สาขาของ B → ต้องไม่มีแถวถูกแก้
- [ ] A พยายามสร้างสาขาโดยใส่ `owner_id` = B → ต้องถูกปฏิเสธ
- [ ] ผู้จัดการ (manager) เห็นเฉพาะสาขาที่ได้รับมอบหมาย
- [ ] LINE webhook: ผู้เช่าส่งสลิป / ขอบิล / ลงทะเบียน ยังทำงาน
- [ ] ส่งบิลทาง LINE, บรอดแคสต์, แจ้งเตือนอัตโนมัติ ยังทำงาน
- [ ] ลิงก์เซ็นสัญญา `/sign/<token>` (ผู้เช่าไม่ได้ล็อกอิน) ยังเปิดได้
- [ ] ลืมรหัสผ่าน → ได้อีเมล → ตั้งรหัสใหม่ → ล็อกอินได้
- [ ] สร้างบิล/ผู้เช่าพร้อมกันสองบัญชี → รหัสไม่ชน บันทึกได้ทั้งคู่
- [ ] `npm run build` + `node --test tests/*.test.cjs` ผ่าน

---

## 6. ถ้าพังหลังขึ้นของจริง (ถอยกลับ)

```sql
-- เปิดกฎ "ทุกคนทำได้" กลับชั่วคราว (ตารางที่มีปัญหา)
CREATE POLICY "Public Access on rooms" ON public.rooms FOR ALL USING (true) WITH CHECK (true);
```
แล้ว deploy โค้ด branch เดิมกลับ — ข้อมูลไม่หายเพราะ RLS แค่ซ่อน ไม่ได้ลบ
(ตาราง `auth.users` / คอลัมน์ `auth_user_id` ทิ้งไว้ได้ ไม่กระทบโค้ดเดิม)

---

## 7. ต้องตัดสินใจก่อนเริ่ม

1. **ล็อกอินด้วยอะไร** — อีเมลจริง (รีเซ็ตรหัสได้) / เบอร์แปลงเป็นอีเมลภายใน (ไม่ต้องใช้ SMS แต่รีเซ็ตเองไม่ได้) / เบอร์ + SMS OTP (เสียค่า SMS)
2. **ย้ายรหัสผ่านเดิม หรือให้ตั้งใหม่** — แนะนำตั้งใหม่ (รหัสเดิมเคยรั่วไปทุกเบราว์เซอร์)
3. **รหัสเอกสาร (T0001, I0001, ...)** — ออกในฐานข้อมูลต่อบัญชี/ต่อสาขา หรือเปลี่ยนเป็น UUID
4. **ผู้ดูแลระบบ (Super Admin)** ต้องเห็นทุกบัญชีไหม — ถ้าต้อง ทำเป็นหน้าแยกที่เรียก API ฝั่งเซิร์ฟเวอร์
5. **ผู้จัดการ** ใช้ `assigned_branch_ids` แบบเดิมไหม และใครเป็นคนมอบหมาย

---

## 8. ลำดับงานและขนาดโดยประมาณ

| # | งาน | ขนาด |
|---|---|---|
| 0 | เตรียม: branch, project ทดสอบ, backup, ทุกแถวมีสาขา/เจ้าของ | เล็ก |
| 1–2 | เปิด Auth + SQL ผูก user_profiles + ฟังก์ชันช่วย | เล็ก |
| 3 | สคริปต์ย้ายบัญชีเดิม | เล็ก–กลาง |
| 4 | แก้ล็อกอิน/สมัคร/ลืมรหัส + Bearer token ไป API | กลาง |
| 5 | ฝั่งเซิร์ฟเวอร์ใช้ service role | กลาง |
| 6 | RLS policies + ทดสอบสิทธิ์ | กลาง |
| 7 | ออกรหัสเอกสารในฐานข้อมูล | **ใหญ่** |
| — | ทดสอบรวม + ขึ้นของจริง | กลาง |

ทำ 0 → 6 ได้ก่อนโดยยังไม่แตะข้อ 7 ถ้าช่วงแรกมีบัญชีเดียวที่ใช้งานจริง (รหัสจะไม่ชน)
แต่ต้องทำข้อ 7 ให้เสร็จก่อนเปิดให้หลายบัญชีใช้พร้อมกัน

## อ้างอิง

- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Auth (password): https://supabase.com/docs/guides/auth/passwords
- Next.js + Supabase Auth: https://supabase.com/docs/guides/auth/server-side/nextjs
- Service role key (ฝั่งเซิร์ฟเวอร์เท่านั้น): https://supabase.com/docs/guides/api/api-keys
