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

Follow REMINDER_ENGINE.md for visible banners, sound and toast actions, quiet hours, snooze/retry, hidden tray, sleep/resume, crash-window recovery, rolling recurrence, focus completion, explicit startup, real credential rotation, populated upgrade and backup recovery. Never infer these passes from CI or payload acceptance. Live cloud verification awaits the new Supabase account/project selected by the owner.
