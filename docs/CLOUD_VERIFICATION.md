# LifeOS cloud checkpoint - 6 November 2026

Organization: LifeOS, Free plan, `yhhcgfyhzrcotlmjdblt`.
Project: LifeOS, `yydavvhxdanfvjayydvn`, Frankfurt (`eu-central-1`).
Dashboard: https://supabase.com/dashboard/project/yydavvhxdanfvjayydvn

This is a separate organization from Drawtopia. No Drawtopia resources were changed. The existing Supabase connector is scoped to Drawtopia and rejects this project, so the authorized dashboard session was used.

## Applied and verified

The exact `20261105193417_initial_lifeos.sql` script was applied successfully in the empty project's SQL Editor. The public records table, owner-scoped RLS policies, guarded push RPC and validation trigger exist. SQL Editor does not register CLI migration history: the initial version must be marked applied with `supabase migration repair --status applied 20261105193417` after CLI access is authorized, before any future db push. Do not reapply the CREATE script.

Live privilege checks: RLS true, three owner policies, anon SELECT false, authenticated hard DELETE false, anon RPC execution false. A real unauthenticated REST call returned HTTP 401. Auth's public settings confirm `disable_signup:true`, `mailer_autoconfirm:false`; anonymous sign-ins were visibly disabled in the dashboard.

A transaction-only PostgreSQL probe passed owner read/write, stale-version conflict, other-owner read/update/insert denial and anonymous-identity denial. Its auth users and records were rolled back; it created no persistent test account. This exercises actual PostgreSQL roles/JWT claims, not a real signed-in browser token. The complete live login and two-device acceptance remains pending.

## Client configuration

The public URL and existing publishable key are stored in ignored `apps/web/.env.local` and `apps/desktop/.env.local`. No database password or service-role key was collected. GitHub build variables `LIFEOS_SUPABASE_URL` and `LIFEOS_SUPABASE_PUBLISHABLE_KEY` supply only public client configuration to frontend/Windows builds. Existing older installers still need updating to the new configured package.

The owner explicitly selected email/password login. It uses Supabase signInWithPassword; the password is transient component state, cleared after submission and never stored in application persistence. Only the session tokens use the documented session/Windows credential storage. The UI masks the password and uses current-password autocomplete. Authentication failures show a bounded message without provider details.

Free hosted email templates are locked without custom SMTP or a plan change, and default mail is team-only/rate limited. No plan was upgraded and no custom SMTP was configured. Password sign-in for an admin-created confirmed owner does not require sending an email. Password reset/email-change workflows still need SMTP before they can be promised.

## Next owner step

Create the single intended Auth user in the dashboard. The owner must enter and submit their chosen password themselves. Public signup stays disabled. Then sign in through LifeOS Settings and verify real web/desktop sync, offline edits, conflicts, sign-out, session expiry/rotation and credential storage. No password or email sign-in was tested against the real owner yet.
