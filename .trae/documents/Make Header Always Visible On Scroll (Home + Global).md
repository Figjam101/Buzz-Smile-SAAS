## Diagnosis
- On Home, the header does not visually stay at the very top while scrolling. The likely causes are:
  - Page-level offsets applied in the wrong place (e.g., margins on the first section instead of a consistent content padding).
  - Decorative overlays (hero effects) or containers with higher stacking context overlapping the header.

## Fix Strategy
- Use a single, consistent approach across pages so the header is always visible and flush to the viewport top.
- Prefer a fixed header with a uniform top padding on page content.

## Implementation Steps
### 1) Strengthen Header Positioning
- In `client/src/components/Navbar.js`, set the `<nav>` to:
  - `fixed top-0 left-0 right-0 w-full z-[9999]` for highest stacking.
  - Keep the current solid surface (`glass-opaque`) to avoid visual bleed over the hero.

### 2) Normalize Global Layout Offsets
- Home page (`client/src/pages/Home.js`):
  - Add `pt-16` on the root `<div className="min-h-screen">` and REMOVE `mt-16` from the hero section so content consistently starts below the header.
- Dashboard page (`client/src/pages/Dashboard.js`):
  - Add/keep `pt-16` on the root container; ensure sections don’t add extra `mt-16` redundantly.
- Admin page (`client/src/pages/AdminDashboard.js`):
  - Add/keep `pt-16` on the root container.
  - Sidebar uses `fixed top-16 bottom-0 left-0` to sit below the fixed header.

### 3) Ensure No Overlays Cover The Header
- Verify decorative components on Home:
  - `client/src/components/BouncingBall.js` already uses `pointer-events: none` and `style={{ zIndex: 1 }}`; keep it below header.
- Ensure hero content wrappers do not use `z-50` or higher; header will be `z-[9999]` to win the stacking order.

### 4) Global Base Styles
- In `client/src/index.css`, keep `html, body { margin: 0; padding: 0; }` so the header sits flush to viewport top with no unexpected gaps.

## Verification
- Manually check Home (`/`), Dashboard (`/dashboard` and `/dashboard#admin`), and Admin (`/admin`):
  - Scroll each page and confirm the header remains visible and pinned to the very top.
  - Confirm no double spacing at the top and no overlap.

## Optional (If Safari/iOS Issues Persist)
- Fall back to `sticky top-0 z-[9999]` for the header if a device-specific bug affects `position: fixed`, while keeping the page `pt-16` offsets.

Would you like me to apply these changes now?