# LifeOS cloud checkpoint - 6 November 2026

Organization: LifeOS, Free plan, `yhhcgfyhzrcotlmjdblt`.
Project: LifeOS, `yydavvhxdanfvjayydvn`, Frankfurt (`eu-central-1`).
Dashboard: https://supabase.com/dashboard/project/yydavvhxdanfvjayydvn

This is a separate organization from Drawtopia. No Drawtopia resources were changed. The existing Supabase connector is scoped to Drawtopia and rejects this project, so the authorized dashboard session was used.

## Applied and verified

The exact `20261105193417_initial_lifeos.sql` script was applied successfully in the empty project's SQL Editor. The public records table, owner-scoped RLS policies, guarded push RPC and validation trigger exist. SQL Editor does not register CLI migration history: the initial version must be marked applied with `supabase migration repair --status applied 20261105193417` after CLI access is authorized, before any future db push. Do not reapply the CREATE script.

Live privilege checks: RLS true, three owner policies, anon SELECT false, authenticated hard DELETE false, anon RPC execution false. A real unauthenticated REST call returned HTTP 401. Auth's public settings confirm `disable_signup:true`, `mailer_autoconfirm:false`; anonymous sign-ins were visibly disabled in the dashboard.

A transaction-only PostgreSQL probe passed owner read/write, stale-version conflict, other-owner read/update/insert denial and anonymous-identity denial. Its auth users and records were rolled back; it created no persistent test account. This exercises actual PostgreSQL roles/JWT claims. Real native owner login and a server roundtrip also passed below; two-client acceptance remains pending.

## Client configuration

The public URL and existing publishable key are stored in ignored `apps/web/.env.local` and `apps/desktop/.env.local`. No database password or service-role key was collected. GitHub build variables `LIFEOS_SUPABASE_URL` and `LIFEOS_SUPABASE_PUBLISHABLE_KEY` supply only public client configuration to frontend/Windows builds. The configured Windows package from source `3f2648d` is now installed and running.

The owner explicitly selected email/password login. It uses Supabase signInWithPassword; the password is transient component state, cleared after submission and never stored in application persistence. Only the session tokens use the documented session/Windows credential storage. The UI masks the password and uses current-password autocomplete. Authentication failures show a bounded message without provider details.

Free hosted email templates are locked without custom SMTP or a plan change, and default mail is team-only/rate limited. No plan was upgraded and no custom SMTP was configured. Password sign-in for an admin-created confirmed owner does not require sending an email. Password reset/email-change workflows still need SMTP before they can be promised.

## Real native login and roundtrip

On 6 November 2026, the owner created the intended confirmed Auth user and entered their password themselves in the installed app. Settings visibly reported successful cloud login and sync. No password or session token was inspected.

A clearly marked QA note, `[Doğrulama] LifeOS bulut bağlantısı`, was captured in the native app and appeared in the real owner's `lifeos_records` at version 1. A targeted dashboard SQL update changed only that note's body and advanced its version to 2. After manual sync at 19:12:45 Europe/Istanbul, reopening the native editor displayed `Buluttan masaüstüne geri alma doğrulandı.` This verifies native push and server-to-native pull with a real signed-in account. The QA note remains available as evidence. The server edit was an administrative test, not a second client or realtime update.

## Remaining acceptance

A clean native process restart restored the signed-in session without password entry, preserved the QA note, and completed sync at 19:31:54 Europe/Istanbul. No credential contents were inspected. See NATIVE_VERIFICATION.md.

Verify separate web/desktop clients, offline edits, conflicts, sign-out, session expiry/rotation and storage failure recovery. Public signup remains disabled. SMTP-dependent recovery/email-change flows and CLI migration-history registration remain open.

## Conversation import compatibility and current sync - 7 November 2026

The actual native client exposed a cloud check-constraint failure: seven imported Codex titles exceeded the existing 240-character domain limit (longest 1,978). The source importer now accepts bounded source titles, normalizes the display title to 240 and preserves the complete original title in notes. Canonical validation remains aligned with SQL. Legacy JSON backups receive the same lossless normalization. Tests cover cloud constraint compatibility and legacy restoration.

A private full backup preceded version-checked normalization of the seven local records. No cloud DDL, RLS policy or unrelated project was changed. The real signed-in native client then cleared its outbox: 181 Codex references, 1,280 ChatGPT links, 19 tasks, two notes and all reminder records had dirty=0. Settings are local-only and intentionally remain dirty. Native Settings showed successful sync at 16:23:30 Europe/Istanbul; subsequent installed updates retained the session and clean outbox, including three QA reminders. A recovered sync error now clears without hiding unrelated local errors.

The connected Supabase administrative plugin currently exposes another account and does not list LifeOS. It was not used to access or mutate another project. No credentials were inspected. CLI migration history, multi-client conflicts, expiry/rotation and SMTP recovery remain outside this verified desktop checkpoint.
