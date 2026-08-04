# Tutorial difficulty badge colors

## Goal

Make tutorial difficulty easier to scan without weakening the monochrome visual system used by the interactive tutorial overview.

## Visual treatment

- Apply semantic color only to the difficulty badge.
- Use a muted green treatment for `Beginner`.
- Use a muted amber treatment for `Intermediate`.
- Use a muted red treatment for `Hard`.
- Combine each color with a subtle tinted background and matching border so the label remains legible in light and dark themes.
- Keep cards, hover states, descriptions, tags, durations, and external-link affordances monochrome.
- Remove the `Open playground` text and its bottom divider.
- Position the external-link arrow as a standalone indicator in the top-right corner of each card. The full card remains the interactive target.

## Implementation

Derive a normalized level class from each tutorial's `level` value and apply it alongside the shared badge class. Define all three level treatments even if the overview does not yet contain a Hard tutorial, so new cards can use the established system without additional styling work. Render the external-link arrow directly within the card and position it independently from the content flow so card titles and metadata retain consistent alignment.

## Verification

- Confirm each supported level maps to the expected class.
- Confirm no level color affects the surrounding card.
- Confirm cards no longer render `Open playground` and expose one top-right external-link indicator.
- Check the overview in the browser at desktop width.
- Run the tutorial structure tests and TypeScript compiler.
