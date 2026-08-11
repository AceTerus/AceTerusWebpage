// Supabase Edge Function: contact-notify
// Triggered by a Supabase Database Webhook on INSERT into public.contact_submissions.
// Emails chinwei@aceterus.com via Resend.
//
// Required secrets (set with: supabase secrets set ...):
//   RESEND_API_KEY        — Resend API key (project already uses Resend per CLAUDE.md)
//   CONTACT_WEBHOOK_SECRET — arbitrary shared secret; also passed as the
//                            "x-webhook-secret" header when configuring the webhook.
//   NOTIFY_TO             — (optional) recipient; defaults to chinwei@aceterus.com
//   NOTIFY_FROM           — (optional) verified Resend sender; defaults to
//                            "AceTerus <notifications@aceterus.com>"
//
// This function does NOT verify a Supabase JWT (see config.toml). Instead it
// validates the shared secret header, so only your Supabase project can hit it.

import { serve } from "https://deno.land/std@0.213.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("CONTACT_WEBHOOK_SECRET") ?? "";
const NOTIFY_TO = Deno.env.get("NOTIFY_TO") ?? "chinwei@aceterus.com";
const NOTIFY_FROM =
  Deno.env.get("NOTIFY_FROM") ?? "AceTerus <notifications@aceterus.com>";

type SubmissionRow = {
  id: string;
  name: string;
  email: string;
  message: string;
  source: string | null;
  user_agent: string | null;
  created_at: string;
};

// Supabase Database Webhook payload shape (v1):
// { type: "INSERT", table: "contact_submissions", schema: "public",
//   record: { ...new row }, old_record: null }
type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: SubmissionRow | null;
  old_record: SubmissionRow | null;
};

serve(async (req) => {
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  // Shared-secret auth. Supabase Database Webhooks let you add arbitrary
  // request headers — configure "x-webhook-secret: <CONTACT_WEBHOOK_SECRET>".
  const providedSecret = req.headers.get("x-webhook-secret") ?? "";
  if (!WEBHOOK_SECRET || providedSecret !== WEBHOOK_SECRET) {
    return json(401, { error: "Unauthorized" });
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY missing");
    return json(500, { error: "Resend not configured" });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  if (payload.type !== "INSERT" || !payload.record) {
    // Ignore other event types silently — 200 so Supabase doesn't retry.
    return json(200, { ignored: true });
  }

  const row = payload.record;
  const source = row.source ?? "unknown";
  const submittedAt = new Date(row.created_at).toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const subject = `New contact form message from ${row.name}`;
  const text =
    `New message from the AceTerus contact form.\n\n` +
    `From: ${row.name} <${row.email}>\n` +
    `Source: ${source}\n` +
    `Received: ${submittedAt} (MYT)\n\n` +
    `Message:\n${row.message}\n\n` +
    `Reply directly to this email to respond to ${row.name}.`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color:#0F172A; max-width:560px;">
      <h2 style="margin:0 0 8px; font-size:18px;">New contact form message</h2>
      <p style="margin:0 0 16px; color:#475569; font-size:13px;">
        Submitted via <strong>${escapeHtml(source)}</strong> · ${escapeHtml(submittedAt)} (MYT)
      </p>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr>
          <td style="padding:8px 0; color:#64748B; width:80px;">Name</td>
          <td style="padding:8px 0; font-weight:600;">${escapeHtml(row.name)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:#64748B;">Email</td>
          <td style="padding:8px 0;">
            <a href="mailto:${escapeHtml(row.email)}" style="color:#2F7CFF; font-weight:600;">
              ${escapeHtml(row.email)}
            </a>
          </td>
        </tr>
      </table>
      <div style="margin-top:16px; padding:14px 16px; background:#F3FAFF; border:1px solid #E2E8F0; border-radius:12px; white-space:pre-wrap; line-height:1.5;">
${escapeHtml(row.message)}
      </div>
      <p style="margin-top:20px; color:#94A3B8; font-size:12px;">
        Reply to this email to respond to ${escapeHtml(row.name)} directly.
      </p>
    </div>
  `;

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: NOTIFY_FROM,
      to: [NOTIFY_TO],
      reply_to: row.email,
      subject,
      text,
      html,
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    console.error("Resend error:", resendRes.status, errText);
    return json(502, { error: "Failed to send email" });
  }

  return json(200, { sent: true });
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
