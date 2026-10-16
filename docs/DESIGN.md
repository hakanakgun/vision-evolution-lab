# Design direction

Vision Evolution Lab uses a warm, light editorial interface that reads like an interactive history exhibit. The product is mobile-first and tuned for portrait phones. Dark mode is not part of the interface. Its positioning is “An executable history of computer vision”: the user brings one local image, runs a compatible generation, and examines the output and measured browser work.

## Existing visual system

styles.css is the token source of truth. Keep the current paper, ink, muted, line, sage, and terracotta colors:

| Role | CSS token |
| --- | --- |
| Page canvas | --bg |
| Cards and controls | --paper |
| Main text | --ink |
| Supporting text | --muted |
| Borders and timeline rail | --line |
| Selected model / action | --accent |
| Historical experiment marker | --accent2 |
| Soft selected surface | --soft |

Typography uses the existing Inter/system sans-serif stack. Years, small labels, and measured values use the existing system monospace stack. Corners stay softly rounded; borders and restrained shadows separate paper surfaces from the page.

## Time Machine timeline

The timeline is an editorial horizontal rail. Preserve chronological order and give each milestone enough width to read its year, title, and task note at phone size. Keep the scrollbar visible, contain horizontal movement inside the timeline, and use scroll snapping for touch and trackpad movement. The selected model is stated above the rail so it remains clear when its year is off-screen.

Runnable controls use a transparent reset with visible hover, keyboard-focus, and selected states. Terracotta identifies task-specific historical experiments; sage identifies the selected AI model; violet remains reserved for transformer entries. Paper-only and research milestones stay visually distinct and are not exposed as actions.

## Interaction and accessibility

The timeline scroll area has an accessible region label and description. Model and experiment buttons expose their pressed state and a visible keyboard focus ring. Keep normal page scrolling vertical; horizontal scrolling belongs only to the timeline. Respect reduced-motion preferences and retain touch-sized controls.

## Activity navigation and result order

The four primary sections are Experiment, Compare, Learn, and Device. Each reveals only its related secondary tabs. Desktop keeps this navigation near the top of the workspace; portrait phones use a safe-area-aware, four-item bottom bar, with the active tool directly above it. The bottom bar leaves scroll space for its footprint and moves back into document flow while a form control has focus. Secondary tabs use the standard tablist arrow, Home, and End behavior.

Time Machine presents the source image and its current result before the historical rail. The current-run phase measurements stay adjacent to the result. The timeline opens on demand and closes after a model or historical task is selected, while preserving the source image. Device status, startup values, warm-benchmark details, runtime diagnostics, and provenance are progressively disclosed. Download feedback remains visible while a transfer is in progress. A warm Benchmark ×20 completion opens its measured details and keeps startup measurements separate.

Keep live camera state independent from Time Machine state. Keep DINOv3 identified as a 224×224 feature-similarity experiment with a 14×14 patch grid and a selectable reference patch; similarity color is not a class, mask, detector score, or accuracy measure.

Do not add a UI dependency, new palette, dark theme, or animated transition that changes inference or model-selection behavior.

## Architecture Explorer

Keep the native, platform-owned model picker used by Live Camera. Both model choices survive tab navigation within the current page session. Use the existing paper surfaces, sage links, and token-based focus rings. Profiles include the same research and provenance links as Time Machine, with model-specific accessible names; long action labels wrap inside the card on narrow screens.

## Timeline legend and Model Storage

Keep the timeline legend below the scrolling rail so it stays visible on narrow screens. Pair every marker color with text: selected card, historical experiment, transformer, history only, and other runnable models. Selection and architecture are different dimensions; color never represents accuracy.

Model Storage uses the same paper cards, native buttons and token focus rings. Stack each model's text and actions on phones; keep transfer progress and an accessible live status in the introduction card. Do not imply that saved files mean a model session is loaded or that the application is fully offline-ready.


## Historical experiments

When a Time Machine history-only experiment is selected, hide the AI-model device, benchmark, and provenance panel and expand the experiment card to one column. Show only controls and measurements that apply to that task; return the normal model panel when a runnable AI model is selected.
