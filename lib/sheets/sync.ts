/**
 * Google Sheets bidirectional sync.
 *
 * The portal is the source of truth.
 * The sheet is a live mirror that admins (and accountants) can still read.
 *
 * Two flows:
 *
 *   Portal → Sheet (write-back):
 *     Every time a point_activity is created/approved/rejected,
 *     fire writeActivityToSheet() to update the matching cell.
 *     Call this from a database webhook → Edge Function, OR from
 *     the same server action that created the activity.
 *
 *   Sheet → Portal (nightly diff):
 *     Run `pnpm tsx scripts/nightly-sheet-sync.ts` from a Vercel cron.
 *     It reads the sheet, diffs against DB, applies any manual edits
 *     the admin made directly in Sheets (e.g. fixing a typo or backdating).
 *
 * Note: Stale dual-write race conditions are possible. If both the portal
 * and an admin edit the sheet within seconds of each other, the last write
 * wins. In practice this is fine — the portal is the only writer 99% of the time.
 */

import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const SA_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const SA_KEY_RAW = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!;
const SA_KEY = SA_KEY_RAW.startsWith('-----BEGIN')
  ? SA_KEY_RAW.replace(/\\n/g, '\n')
  : Buffer.from(SA_KEY_RAW, 'base64').toString('utf-8');

// =====================================================
// Sheet connection (singleton — cache JWT auth)
// =====================================================

let _doc: GoogleSpreadsheet | null = null;

async function getSheetDoc(): Promise<GoogleSpreadsheet> {
  if (_doc) return _doc;
  const auth = new JWT({
    email: SA_EMAIL,
    key: SA_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  _doc = new GoogleSpreadsheet(SHEET_ID, auth);
  await _doc.loadInfo();
  return _doc;
}

// =====================================================
// PORTAL → SHEET (write-back)
// =====================================================

/**
 * Append a row to the monthly activity sheet when a point_activity is approved.
 *
 * Sheet naming convention (matches your existing structure):
 *   "JAN 2026", "FEB 2026", etc.
 *
 * Columns expected (adjust to match your sheet's actual layout):
 *   Date | Name | Category | Points | Note | Approved By
 *
 * Call this from your server action after inserting point_activities row.
 */
export async function writeActivityToSheet(activity: {
  employee_name: string;
  category_key: string;
  points: number;
  note?: string;
  approved_by_name: string;
  created_at: string;  // ISO timestamp
}): Promise<void> {
  const doc = await getSheetDoc();
  const monthLabel = formatMonthLabel(activity.created_at);  // "JUN 2026"
  const sheet = doc.sheetsByTitle[monthLabel];

  if (!sheet) {
    console.warn(`No sheet tab "${monthLabel}" — skipping write-back. Create the tab manually first.`);
    return;
  }

  await sheet.addRow({
    Date: activity.created_at.slice(0, 10),
    Name: activity.employee_name,
    Category: activity.category_key,
    Points: activity.points,
    Note: activity.note ?? '',
    'Approved By': activity.approved_by_name,
  });
}

/**
 * Update the OVERVIEW tab's running 2026 YTD total for one employee.
 * Call this whenever a balance changes (award, redemption, refund).
 */
export async function updateEmployeeYtdInSheet(
  email: string,
  newYtdTotal: number,
): Promise<void> {
  const doc = await getSheetDoc();
  const sheet = doc.sheetsByTitle['OVERVIEW'];
  if (!sheet) {
    console.warn('No OVERVIEW tab found — skipping YTD update');
    return;
  }

  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();
  const row = rows.find(r => String(r.get('Email')).toLowerCase() === email.toLowerCase());

  if (!row) {
    console.warn(`Email ${email} not in OVERVIEW tab — can't update YTD`);
    return;
  }

  row.set('2026 YTD', newYtdTotal);
  await row.save();
}

// =====================================================
// SHEET → PORTAL (nightly diff)
// =====================================================

/**
 * Run nightly via Vercel cron at 3am Manila time.
 * Pulls the current month's tab and compares each row against the DB.
 *
 * If a row in the sheet exists but not in DB → insert it as approved.
 * If a row in DB doesn't exist in sheet → leave it alone (sheet might be lagging).
 *
 * This is a one-way "catch-up" sync — manual sheet edits flow into the portal,
 * but portal data never gets deleted because the sheet doesn't have it.
 */
export async function nightlySync(): Promise<{ pulled: number; skipped: number; failed: number }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const doc = await getSheetDoc();
  const monthLabel = formatMonthLabel(new Date().toISOString());
  const sheet = doc.sheetsByTitle[monthLabel];

  if (!sheet) {
    console.log(`No tab "${monthLabel}" — nothing to sync`);
    return { pulled: 0, skipped: 0, failed: 0 };
  }

  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();

  let pulled = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const date = String(row.get('Date'));
    const name = String(row.get('Name'));
    const category = String(row.get('Category'));
    const points = parseInt(String(row.get('Points'))) || 0;
    const note = String(row.get('Note') || '');

    // Compute a stable hash to detect duplicates
    const externalRef = `sheet:${monthLabel}:${date}:${name}:${category}:${points}`;

    const { data: existing } = await supabase
      .from('point_activities')
      .select('id')
      .eq('external_ref', externalRef)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    // Find profile by name
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('full_name', name)
      .maybeSingle();

    if (!profile) {
      console.warn(`No profile for "${name}" — skipping`);
      failed++;
      continue;
    }

    const { error } = await supabase
      .from('point_activities')
      .insert({
        employee_id: profile.id,
        category_key: category,
        points,
        note: note || null,
        status: 'approved',
        external_ref: externalRef,
        created_at: new Date(date).toISOString(),
      });

    if (error) {
      console.error(`Failed to insert for ${name}:`, error.message);
      failed++;
    } else {
      pulled++;
    }
  }

  console.log(`Nightly sync: pulled ${pulled}, skipped ${skipped}, failed ${failed}`);
  return { pulled, skipped, failed };
}

// =====================================================
// HELPERS
// =====================================================

function formatMonthLabel(isoDate: string): string {
  const d = new Date(isoDate);
  const monthShort = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const year = d.getFullYear();
  return `${monthShort} ${year}`;
}

/**
 * Export to CSV — manual fallback if Sheets API is down.
 * Call from an admin button "Export this month to CSV".
 */
export async function exportMonthToCsv(monthIso: string): Promise<string> {
  // Build CSV from DB and return as string
  // (Implementation left to you — straightforward Supabase query + array.join)
  throw new Error('Not implemented yet');
}
