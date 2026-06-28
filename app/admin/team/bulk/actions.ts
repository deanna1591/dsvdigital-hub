"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const VALID_STATUSES = ["fulltime", "parttime", "contractor", "intern", "leave", "former"];

export type BulkRowResult = {
  row: number;
  name: string;
  email: string;
  status: "invited" | "created" | "skipped" | "error";
  message: string;
};

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (data?.role !== "admin") redirect("/today");
  return { supabase, user };
}

/**
 * Parse a chunk of CSV text and create/invite each employee.
 *
 * Expected columns (header row required, order matters):
 *   name, email, company, status, phone, member_since
 *
 * Behavior:
 *   - sendInvite=true  → calls inviteUserByEmail (sends email)
 *   - sendInvite=false → calls admin.createUser (no email, account
 *     created in "confirmed but no password" state; she can send
 *     invites later via the per-row 'Resend invite' button)
 *
 * Returns a per-row result list so the UI can show what happened.
 */
export async function bulkInviteEmployees(formData: FormData): Promise<{
  results: BulkRowResult[];
  ok: number;
  skipped: number;
  failed: number;
}> {
  await requireAdmin();

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      results: [
        {
          row: 0,
          name: "",
          email: "",
          status: "error",
          message: "Server missing SUPABASE_SERVICE_ROLE_KEY",
        },
      ],
      ok: 0,
      skipped: 0,
      failed: 1,
    };
  }

  const admin = createAdminClient();
  const csv = String(formData.get("csv") || "").trim();
  const sendInvite = formData.get("send_invite") === "on";

  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return {
      results: [
        { row: 0, name: "", email: "", status: "error", message: "CSV needs a header row + at least one data row" },
      ],
      ok: 0,
      skipped: 0,
      failed: 1,
    };
  }

  // Parse header
  const header = lines[0].split(",").map((s) => s.trim().toLowerCase());
  const idx = {
    name: header.indexOf("name"),
    email: header.indexOf("email"),
    company: header.indexOf("company"),
    status: header.indexOf("status"),
    phone: header.indexOf("phone"),
    member_since: header.indexOf("member_since"),
  };
  if (idx.name === -1 || idx.email === -1) {
    return {
      results: [
        { row: 0, name: "", email: "", status: "error", message: "CSV must include 'name' and 'email' columns" },
      ],
      ok: 0,
      skipped: 0,
      failed: 1,
    };
  }

  const results: BulkRowResult[] = [];
  let okCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = (cols[idx.name] || "").trim();
    const email = (cols[idx.email] || "").trim().toLowerCase();
    const company = idx.company > -1 ? (cols[idx.company] || "").trim() || null : null;
    const statusRaw = idx.status > -1 ? (cols[idx.status] || "").trim().toLowerCase() : "";
    const status = VALID_STATUSES.includes(statusRaw) ? statusRaw : null;
    const phone = idx.phone > -1 ? (cols[idx.phone] || "").trim() || null : null;
    const memberSince = idx.member_since > -1 ? (cols[idx.member_since] || "").trim() || null : null;

    if (!name || !email) {
      results.push({ row: i + 1, name, email, status: "skipped", message: "Missing name or email" });
      skippedCount++;
      continue;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      results.push({ row: i + 1, name, email, status: "error", message: "Invalid email" });
      failedCount++;
      continue;
    }

    try {
      let userId: string;
      let actionLabel: "invited" | "created";

      if (sendInvite) {
        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { name },
        });
        if (error || !data?.user) {
          // Check if user already exists — that's a "skipped" not a fail
          if (error?.message?.toLowerCase().includes("already")) {
            results.push({ row: i + 1, name, email, status: "skipped", message: "Already in system" });
            skippedCount++;
            continue;
          }
          throw new Error(error?.message || "no user returned");
        }
        userId = data.user.id;
        actionLabel = "invited";
      } else {
        // Create without sending email — they can be invited later
        const { data, error } = await admin.auth.admin.createUser({
          email,
          email_confirm: true, // skip email confirmation
          user_metadata: { name },
        });
        if (error || !data?.user) {
          if (error?.message?.toLowerCase().includes("already")) {
            results.push({ row: i + 1, name, email, status: "skipped", message: "Already in system" });
            skippedCount++;
            continue;
          }
          throw new Error(error?.message || "no user returned");
        }
        userId = data.user.id;
        actionLabel = "created";
      }

      // Update profile with the rest of the details
      const { error: updErr } = await admin
        .from("profiles")
        .update({
          name,
          email,
          company_client: company,
          employment_status: status,
          phone,
          member_since: memberSince,
        })
        .eq("id", userId);

      if (updErr) {
        results.push({
          row: i + 1,
          name,
          email,
          status: "error",
          message: `Profile update failed: ${updErr.message}`,
        });
        failedCount++;
        continue;
      }

      results.push({ row: i + 1, name, email, status: actionLabel, message: "OK" });
      okCount++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ row: i + 1, name, email, status: "error", message: msg });
      failedCount++;
    }
  }

  revalidatePath("/admin/team");
  return { results, ok: okCount, skipped: skippedCount, failed: failedCount };
}

/**
 * Very small CSV line parser. Handles simple quoted fields with commas.
 * Not a full RFC 4180 parser — adequate for our format.
 */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}
