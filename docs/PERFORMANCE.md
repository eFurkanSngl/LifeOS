# Desktop performance checkpoint

The pre-change warm visible empty app sample summed 430.25 MiB across LifeOS and six associated WebView processes. Shared pages may be counted repeatedly; this was not private bytes. The 60–120 MiB goal has not been met or closed.

Desktop source b2868c1 removes the motion runtime from the app shell, defers career/habit/planner/note modules until needed, and uses direct imports to avoid loading the features barrel. Vite reports the main JS chunk at approximately 614.82 kB / 181.91 kB gzip, versus roughly 744 kB / 223 kB before. This is a bundle improvement, not proof of a working-set reduction. Focus panels update only while a session exists; reminder scheduling remains native.

Measure the installed package after warm-up, with the same records and visible page. Identify LifeOS by executable path and WebView descendants by process ancestry/profile. Record summed working set and private bytes separately, plus CPU time delta over a fixed idle interval. Run a second sample after normal note/calendar use; do not relabel private bytes as working set or compare incompatible profiles as a benchmark. Native scheduler, tray and focus behavior must remain intact.

Latest installed measurement is recorded below once available.

## Installed b64b3c0 samples, 6 November, Europe/Istanbul

Same five lesson tasks and planner page; LifeOS plus six descendant WebView processes, measured with tools/measure-desktop.ps1 over 30.12 seconds. These are single samples, not a sustained benchmark.

| State                             | Summed working set MiB | Summed private bytes MiB | CPU % of one core |
| --------------------------------- | ---------------------: | -----------------------: | ----------------: |
| Previous cd04e8a planner baseline |                 450.90 |                   338.88 |             0.000 |
| New planner, early post-launch    |                 417.95 |                   292.20 |             6.639 |
| New planner, warmed               |                 414.15 |                   306.80 |             3.321 |
| New app behind Windows Settings   |                  53.55 |                   225.03 |             0.000 |

Process identities did not change during each interval. Background memory reduction is observable, but the foreground 60–120 MiB working-set goal remains unmet. Private committed memory is not resident working set; the background result must not be described as a 54 MiB total allocation or a universal idle-memory guarantee. Startup and prior usage differ between baseline and new samples, so the foreground difference alone is not a controlled speed/memory benchmark. The early CPU sample includes initial activity; no sustained idle-CPU improvement is claimed.

With five real lesson tasks and their alarms in the previous cd04e8a package, the foreground planner baseline summed 451.09 MiB working set and 337.81 MiB private bytes over LifeOS plus six profile-matched WebView processes. This is a different workload from the initial empty-app sample.

The follow-up Windows patch requests WebView2's LOW memory target when the app loses focus and restores NORMAL on focus. It uses the optional ICoreWebView2_19 interface and silently keeps the runtime default if unsupported. It does not suspend the native queue or modify browser security switches. The declared Tauri minor is pinned to match the platform-handle interface. The new installed measurement must be recorded before asserting a benefit.
