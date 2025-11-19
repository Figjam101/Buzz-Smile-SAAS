## Approach
- Add a lightweight CSS class that draws a very fine blue gradient inset shadow along the bottom inside the header.
- Use a pseudo-element for crisp rendering and no layout shifts.

## CSS
- In `client/src/styles/glass.css`, add `.header-inset-blue` that sets `position: relative` and defines `::after`:
  - Positioned `bottom: 0; left: 0; right: 0; height: 10px;`
  - `pointer-events: none;`
  - `background: linear-gradient(to top, rgba(59,130,246,0.24), rgba(59,130,246,0.12), rgba(59,130,246,0));`
  - Optional subtle inner highlight: add a 1px `inset` shadow if needed for extra crispness.

## Navbar Update
- Apply `header-inset-blue` to the `<nav>` element in `client/src/components/Navbar.js` alongside existing classes (`glass-opaque`/`glass-card`, `shiny-outline`, `edge-bottom-3d`).
- Ensure `<nav>` is `position: relative` (the class will set it) so the pseudo-element anchors correctly.

## Tuning
- If the effect is too strong/weak, tweak alpha values (0.24 → 0.18 or 0.30) and/or the gradient height (8–12px).
- Keep compatibility with both home (`glass-opaque`) and other pages (`glass-card`).

## Verification
- Check `/`, `/dashboard`, `/admin`:
  - Header displays a fine blue gradient at the bottom edge.
  - No blur on brand/logo, no overlap with content.

Proceed to implement these changes?