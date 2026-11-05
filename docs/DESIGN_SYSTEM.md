# Design system

Charcoal surfaces (#0B0E13, #121720, #191F2B), thin slate borders (#293140), royal blue (#315CEB) for actions and selection, tangerine (#F28A35) for time/focus, neutral text (#F4F6FA and #A0A9B9), green for completed activity, red for errors. Tokens live in packages/ui/src/styles.css. Segoe UI is the Windows fallback to Inter; no runtime font CDN requests.

The shell has a compact navigation rail, a daily work surface and a secondary conversation/capture panel. The date orbit is the restrained visual signature. Timeline nodes encode time rather than decorative numbering. Cards vary by purpose: compact task rows, quiet project summaries, a warmer focus surface and autosaving note pages. No generated user activity is used to fill layouts.

The workspace panel collapses; below 1180 px it becomes a dismissible side panel. The rail contracts on mobile and content becomes a single column. Day/week/month calendar overflow is intentionally contained inside the planner. The desktop panel is lightly resizable; a fully persisted drag splitter remains future work.

Radix Dialog provides modal labelling, focus trapping and Escape dismissal, following the shadcn composition approach. Tailwind 4 is configured alongside semantic CSS; components are locally owned rather than a large vendor component runtime. Motion respects reduced-motion preferences and does not animate the full dashboard on initial capture. All buttons are semantic, keyboard-focusable controls; form labels are explicit. Turkish resources are centralized in i18n.ts. The localization mechanism is prepared for an additional dictionary, but an English UI is not implemented.
