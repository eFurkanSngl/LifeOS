# Windows verification checkpoint — 6 November 2026

Source: `0617b9c72ed6ce3c49f7580b8822fcf786ec44bb`.
[Windows CI job](https://github.com/eFurkanSngl/LifeOS/actions/runs/42107806130/job/127527153519): cargo check, six Rust tests, optimized Tauri build and NSIS artifact upload all passed. The overall run had a frontend test failure caused by reloading before reminder saving finished; that test now waits for the editor to close and all 13 local browser checks pass. The corrected frontend job on source `2cb8727` passed all checks including 56 Vitest tests and 13 Chromium E2E checks: https://github.com/eFurkanSngl/LifeOS/actions/runs/42109011712/job/127531324774. Windows source code is unchanged from the successfully packaged commit.

## Artifact and installation

Artifact: `lifeos-windows-unsigned`, `LifeOS_0.1.0_x64-setup.exe`.
SHA256: `320497049840212E3504632968F459566F565ED6AD996233C5505572746CC60A`.

The initial `9a68b87` installer was installed silently into the workspace `.tools/native-run` directory, returning exit 0. Its actual native window showed the empty dashboard and Windows desktop identity. A test notification request returned the success message; no claim of visible OS banner or sound is made. Closing the default window removed it from the window inventory.

The `0617b9c` package updated the same test installation with exit 0 and reopened successfully. The new Settings notification-history panel loaded an empty persistent event list without an error. Windows startup remained unchecked; tray persistence remained off. No user records were created: an explicitly marked QA reminder draft was cancelled without saving. This is installation/update/open/close evidence, not populated database upgrade or backup recovery evidence.

## Initial memory sample

Warm, visible empty app, Windows WebView2 156.0.4314.58. Summed process working sets:

| Process role          | Working set MiB |
| --------------------- | --------------: |
| LifeOS                |           43.84 |
| WebView browser       |          127.25 |
| WebView crash handler |           13.38 |
| WebView GPU           |           91.85 |
| WebView network       |           39.54 |
| WebView storage       |           20.83 |
| WebView renderer      |           93.56 |
| Total                 |      **430.25** |

Only processes with the LifeOS executable or its `local.lifeos.workspace` WebView profile were selected. Shared pages may be counted more than once. This is a single working-set snapshot, not private bytes, a sustained idle CPU profile, or a startup benchmark. It exceeds the 60–120 MiB goal and leaves performance work open.

## Remaining installed acceptance

Follow REMINDER_ENGINE.md for visible banners, sound and toast actions, quiet hours, snooze/retry, hidden tray, sleep/resume, crash-window recovery, rolling recurrence, focus completion, explicit startup, real credential rotation, populated upgrade and backup recovery. Never infer these passes from CI or payload acceptance.

## Configured cloud build update

Source `3f2648d`, workflow https://github.com/eFurkanSngl/LifeOS/actions/runs/42230877395: frontend and Windows native jobs both passed, including 58 Vitest tests, 13 browser tests, six Rust tests and NSIS packaging. The new installer updated `.tools/native-run` with exit 0 after the owner closed the previous app. The configured app reopened, the owner signed in themselves, and a real native-to-Supabase-to-native QA note roundtrip passed. See CLOUD_VERIFICATION.md for the exact boundary. Session restart/rotation and the reminder matrix remain open.

## Installed scheduler and restart probe, 6 November 2026

Computer Use exercised the installed `3f2648d` app. Settings accepted a test notification request. A separate reminder, `[Doğrulama] Zamanlı Windows bildirimi`, was saved for 19:31 Europe/Istanbul with sound enabled and no linked task/habit/contact. LifeOS was put behind another foreground app using Alt+Tab (not minimized or hidden to tray). After the due time, the refreshed persistent notification history showed exactly one `Gönderim istendi` entry at 19:31:01. This confirms native background scheduling and accepted OS submission, not visible banner/sound delivery. The owner was asked to report banner/sound; no result was available at this checkpoint.

LifeOS was then closed normally with close-to-tray disabled and relaunched from the same installation. The QA note and the single original dispatch row survived. No second dispatch row appeared after restart. Settings restored the signed-in session without password entry and showed a successful new sync at 19:31:54. This passes one clean process-restart persistence/duplicate-suppression check and real session restoration. It does not cover crash recovery, overdue startup recovery, sleep, expiry or token rotation. No credentials or token contents were inspected. The existing startup checkbox was already enabled by the owner and was not changed during this probe.

Remaining visible-delivery and lifecycle gates: banner/sound confirmation, toast actions, snooze/reschedule, minimized/tray states, missed-due startup, sleep/resume, quiet hours/timezone, focus completion and crash-window recovery. The QA reminder and note remain as evidence; no user data was deleted.

### Owner result and Windows delivery blocker

The owner reported neither a visible banner nor sound for the test. Visible-delivery acceptance therefore failed and is not closed by the dispatch row. Read-only diagnosis confirmed the installed Start-menu AUMID `local.lifeos.workspace`, running Windows push-notification service, global ToastEnabled=1, and WinRT notifier Setting=Enabled. Windows Settings > System > Notifications visibly showed **Do not disturb ON**, with the explanation that notifications go directly to Notification Center. LifeOS itself showed notifications, banners and sounds enabled. This is a confirmed OS suppression condition; a retest with Do not disturb temporarily off is required before declaring the application delivery path healthy. No Windows setting was changed during diagnosis.

The notification plugin's pinned 2.8.0 source also confirms its Windows tracked show call spawns a thread and discards a subsequent notification.show error. Thus the existing `sent` state/`Gönderim istendi` means payload submission requested, not an acknowledged Windows display. That limitation remains relevant even after the OS suppression is removed.

### Retest after owner disabled Do not disturb

The owner's final corrected result was: banner appeared, no sound. This passes visible delivery for the Settings test only; audible delivery remains open. Inspection of the pinned Windows backend shows an unspecified sound becomes `Toast.sound(None)`, producing silent audio. The Settings test now explicitly requests `Default`, matching the enabled-sound path already used by scheduled reminders. This change requires a new installed package and a real audible retest; no claim of sound delivery is made from source inspection or compilation.

Source `cd04e8a` was built successfully in https://github.com/eFurkanSngl/LifeOS/actions/runs/42274840248: frontend checks and Windows check/tests/NSIS packaging passed. Local rustfmt and diff checks passed. The new installer updated the existing test installation with exit 0; the resulting executable is 9,543,680 bytes. After normal close/reopen, the existing QA note, dispatch history and signed-in session were present. The Settings test was triggered from the newly installed package at approximately 22:00 Europe/Istanbul. The owner reported no banner. Reopening Windows Notifications showed Do not disturb ON again. Automatic activation for gaming, fullscreen, screen duplication and the first post-update hour were checked; the scheduled-hours rule was unchecked. These are potential reactivation causes, not proof of which rule ran. Audible/visible retest remains blocked on OS suppression. The owner previously disabled Do not disturb themselves; no OS preference was changed by the agent.
