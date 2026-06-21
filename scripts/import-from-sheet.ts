/**
 * One-time importer: pulls the 49 teammates and their 2025 carryover balances
 * from the DSV Google Sheet into Supabase.
 *
 * Usage:
 *   pnpm tsx scripts/import-from-sheet.ts
 *
 * Pre-reqs:
 *   1. GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_KEY in .env.local
 *   2. SUPABASE_SERVICE_ROLE_KEY in .env.local (NOT the anon key — we need to bypass RLS)
 *   3. Share the Google Sheet with the service account's email (Editor access)
 *
 * What it does:
 *   - Reads the OVERVIEW tab of the sheet
 *   - Creates a `profiles` row for each teammate (49 rows)
 *   - Creates an opening balance entry in `point_activities` reflecting their 2025 carryover
 *   - Skips anyone already imported (idempotent — safe to re-run)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const SA_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
// Private key might be base64-encoded or raw; handle both
const SA_KEY_RAW = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!;
const SA_KEY = SA_KEY_RAW.startsWith('-----BEGIN')
  ? SA_KEY_RAW.replace(/\\n/g, '\n')
  : Buffer.from(SA_KEY_RAW, 'base64').toString('utf-8');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SHEET_ID || !SA_EMAIL || !SA_KEY) {
  console.error('❌ Missing env vars. See .env.local.example.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('🔌 Connecting to Google Sheet...');
  const serviceAccountAuth = new JWT({
    email: SA_EMAIL,
    key: SA_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
  await doc.loadInfo();

  console.log(`📋 Loaded sheet: "${doc.title}"`);

  // OVERVIEW tab has the full roster + 2025 carryover + 2026 YTD
  const sheet = doc.sheetsByTitle['OVERVIEW'];
  if (!sheet) {
    console.error('❌ No tab named "OVERVIEW" found. Tabs:', doc.sheetsByIndex.map(s => s.title));
    process.exit(1);
  }

  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();

  console.log(`👥 Found ${rows.length} teammates in OVERVIEW`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const fullName = String(row.get('Name') || '').trim();
    const email    = String(row.get('Email') || '').trim().toLowerCase();
    const carryover = parseInt(String(row.get('2025 Carryover') || '0').replace(/[^0-9-]/g, '')) || 0;
    const role      = String(row.get('Role') || 'employee').toLowerCase();

    if (!fullName || !email) {
      console.warn(`  ⚠️  Skipping row with missing name/email`);
      skipped++;
      continue;
    }

    if (!email.endsWith('@dsvdigital.com')) {
      console.warn(`  ⚠️  Skipping ${email} (not @dsvdigital.com)`);
      skipped++;
      continue;
    }

    // Check if profile exists (idempotency)
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      console.log(`  ⏭️  ${email} already imported, skipping`);
      skipped++;
      continue;
    }

    // Create profile (id will be auto-generated; will be replaced by auth user id on first sign-in via trigger)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        email,
        full_name: fullName,
        role: role === 'admin' || role === 'manager' ? role : 'employee',
        // avatar_url: '', // populated later from Google profile picture
      })
      .select()
      .single();

    if (profileError) {
      console.error(`  ❌ Failed to insert ${email}:`, profileError.message);
      failed++;
      continue;
    }

    // Insert carryover as an opening balance entry
    if (carryover > 0) {
      const { error: balanceError } = await supabase
        .from('point_activities')
        .insert({
          employee_id: profile.id,
          category_key: 'opening_balance',
          points: carryover,
          note: '2025 carryover (imported from sheet)',
          status: 'approved',
          created_at: '2026-01-01T00:00:00Z',
        });

      if (balanceError) {
        console.warn(`  ⚠️  Profile created but balance failed for ${email}:`, balanceError.message);
      }
    }

    console.log(`  ✅ Imported ${fullName} (${email}) — ${carryover} pts carryover`);
    imported++;
  }

  console.log(`\n✨ Done. Imported: ${imported}, Skipped: ${skipped}, Failed: ${failed}`);
  console.log(`\nNext step: when each teammate signs in via Google, a trigger should link their auth.users.id to their profile (matching by email).`);
  console.log(`Make sure the trigger from migration 001 is active. If not, see the README "First login trigger" section.`);
}

main().catch(err => {
  console.error('💥 Import failed:', err);
  process.exit(1);
});
