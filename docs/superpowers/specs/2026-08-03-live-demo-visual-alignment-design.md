# Live Demo Visual Alignment

## Objective

Restyle the interactive tutorial's live demo so it reads as the final stage of the existing tutorial workspace rather than a visually separate product surface.

## Visual thesis

Use the tutorial's flat black, white, and gray system throughout: restrained typography, square bordered regions, minimal depth, and semantic feedback without a decorative accent color.

## Composition

- Keep the existing live-demo heading, node controls, event log, and two-column desktop layout.
- Use the page background (`#0a0a0a`) without a radial gradient.
- Reduce the live-demo heading to the same scale and weight as article section headings.
- Render the node and event areas as adjacent flat panels with square corners and neutral gray dividers.
- Keep the current responsive stacking behavior on smaller screens.

## Component treatment

- Replace green-tinted panel surfaces with the existing neutral page and code-workspace surfaces.
- Replace the filled green node mark with a monochrome outlined mark.
- Style both demo actions from the same black-and-white bordered control system used by tutorial navigation. Use white fill and dark text for the available primary action, and muted gray for disabled states.
- Present node metadata as plain divided regions instead of nested rounded cards where possible.
- Use white or gray for normal event labels and reserve the existing error color for failures.
- Keep the state dot, but render normal and running states through neutral contrast rather than green glow.

## Interaction

- Preserve all existing start, connect, loading, disabled, and error behavior.
- Use a restrained black/white inversion on enabled button hover and focus.
- Use short color and opacity transitions for state changes.
- Allow newly revealed event rows to appear without introducing ornamental motion.

## Responsive behavior

- Preserve the two-column node/event layout on desktop.
- Stack the panels at the existing mobile breakpoint.
- Keep controls full-width and readable when stacked.

## Scope

Only shared live-demo presentation selectors and their responsive variants will change. Tutorial copy, code mapping, node behavior, event data, navigation, and article styling remain unchanged. Because the stylesheet is shared by both interactive tutorials, the neutral live-demo treatment must remain compatible with the channel-payment tutorial.

## Verification

- Run the focused tutorial structure tests.
- Run TypeScript without emitting files.
- Run the repository diff whitespace check.
- Inspect the WASM tutorial at desktop and mobile widths to confirm visual alignment and responsive stacking.
