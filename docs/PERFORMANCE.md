# Desktop performance checkpoint

The pre-change warm visible empty app sample summed 430.25 MiB across LifeOS and six associated WebView processes. Shared pages may be counted repeatedly; this was not private bytes. The 60–120 MiB goal has not been met or closed.

Desktop source b2868c1 removes the motion runtime from the app shell, defers career/habit/planner/note modules until needed, and uses direct imports to avoid loading the features barrel. Vite reports the main JS chunk at approximately 614.82 kB / 181.91 kB gzip, versus roughly 744 kB / 223 kB before. This is a bundle improvement, not proof of a working-set reduction. Focus panels update only while a session exists; reminder scheduling remains native.

Measure the installed package after warm-up, with the same records and visible page. Identify LifeOS by executable path and WebView descendants by process ancestry/profile. Record summed working set and private bytes separately, plus CPU time delta over a fixed idle interval. Run a second sample after normal note/calendar use; do not relabel private bytes as working set or compare incompatible profiles as a benchmark. Native scheduler, tray and focus behavior must remain intact.

Latest installed measurement is recorded below once available.

With five real lesson tasks and their alarms in the previous cd04e8a package, the foreground planner baseline summed 451.09 MiB working set and 337.81 MiB private bytes over LifeOS plus six profile-matched WebView processes. This is a different workload from the initial empty-app sample.

The follow-up Windows patch requests WebView2's LOW memory target when the app loses focus and restores NORMAL on focus. It uses the optional ICoreWebView2_19 interface and silently keeps the runtime default if unsupported. It does not suspend the native queue or modify browser security switches. The declared Tauri minor is pinned to match the platform-handle interface. The new installed measurement must be recorded before asserting a benefit.
