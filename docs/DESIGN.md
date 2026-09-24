# Design direction

Vision Evolution Lab uses a warm, light editorial interface that reads like an interactive history exhibit. The product is mobile-first and tuned for portrait phones. Dark mode is not part of the interface.

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

Do not add a UI dependency, new palette, dark theme, or animated transition that changes inference or model-selection behavior.
