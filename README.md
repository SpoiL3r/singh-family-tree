# Sheo Deen Vansh — Family Archive

Interactive patrilineal family tree for the Singh lineage of Babuganj, Lucknow. Seven generations, branch-colored, with a kinship-term relation finder (Hindi + English) and an animated chart canvas.

## Run locally

Open `index.html` directly in any modern browser, or serve the folder over HTTP:

```bash
npx serve .
```

No build step. All assets are static.

## Structure

- [index.html](index.html) — shell, controls, panels, canvas host
- [assets/js/app.js](assets/js/app.js) — layout, rendering, viewport, relation engine, animations
- [assets/css/styles.css](assets/css/styles.css) — styling
- [assets/data/family-data.js](assets/data/family-data.js) — the person records (`window.FamilyTreeData`)

## Data schema

Each entry in `PERSONS` is:

```js
{
  id: "P001",           // unique id
  name: "Name",         // display name
  gender: "M" | "F",
  gen: 0,               // generation (0 = root)
  parentId: "P000",     // paternal parent id (drives tree layout)
  motherId: "P000a",    // optional maternal parent id (used by relation engine)
  branch: "branch-key", // colors the card + descendant lines
  birthOrder: 1,        // optional; falls back to insertion order
  marriedOut: false,    // daughters whose descendants live with another family
  issueless: false,
  status: "deceased" | undefined,
  notes: "..."
}
```

Paternal links (`parentId`) build the visual tree. `motherId` is additive and only feeds the relation engine, so maternal kin (Nana/Nani, Mama/Mausi, Mamera Bhai, etc.) resolve correctly without duplicating cards.

## Relation finder

Type two names in the hero form. The engine runs a BFS over `parentId`+`motherId`, finds the nearest common ancestor, and emits a Hindi term plus the connecting path. Maternal, paternal, and cross-gender terms are all supported (Chachera/Mamera/Phuphera/Mausera Bhai/Behen, Par Dada, 2× Par Dada, and so on).

## Animations

Uses [anime.js 3.2.2](https://animejs.com/) via CDN for two effects:

- **Trail draw-on** — when a relation is traced, the connecting SVG lines animate via `stroke-dashoffset` with a staggered cascade.
- **Viewport tweens** — Fit / Root / focus-on-card transitions interpolate `scale`, `x`, `y` through `Viewport.tweenTo`.

Both respect `prefers-reduced-motion` and fall back to instant transitions. User input (drag, wheel, arrow keys, pinch) cancels any active tween immediately.

## Credits

Maintained by Vaibhav Singh.
