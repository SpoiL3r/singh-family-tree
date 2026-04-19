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

Type two names in the hero form. The engine finds the lowest common ancestor of the two people across *both* parental lines, then labels the connecting path with a Hindi term (and English gloss). Maternal, paternal, and cross-gender terms are all supported (Chachera/Mamera/Phuphera/Mausera Bhai/Behen, Par Dada, 2× Par Dada, and so on).

### How the traversal works

The family is a DAG, not a tree — each person has up to two parent edges (`parentId`, `motherId`). Relation resolution runs in three stages, all implemented in [assets/js/app.js](assets/js/app.js):

1. **BFS ancestor map per person** — [`buildAncestorMap`](assets/js/app.js#L349) walks up from a starting person using a FIFO queue (`queue.shift()`), visiting both the father and the mother at each step. For every ancestor reached it stores the shortest path and its length. BFS (not DFS) is the right shape here because we want the *closest* link to each shared ancestor — DFS would happily take a long maternal detour when a shorter paternal one exists. A cycle guard (`path.indexOf`) prevents revisiting nodes along the current path.

2. **Common-ancestor pick** — [`findCommonAncestorDetails`](assets/js/app.js#L367) intersects the two ancestor maps and picks the ancestor that minimizes `selfDistance + targetDistance`, tiebroken by the *max* of the two distances. That tiebreak prefers balanced relations (siblings share a parent at distance 1/1) over lopsided ones (great-grandparent at 3/0).

3. **Trail assembly + per-edge labeling** — [`buildConnectionTrail`](assets/js/app.js#L391) stitches the self-side path and the reversed target-side path into a single ordered sequence, which is what the UI staggers during the draw-on animation. Each edge along the trail is then classified as a father-link or mother-link via [`stepKind`](assets/js/app.js#L416) — that's what lets the Hindi generator distinguish paternal (Dada / Chacha / Bhatija) from maternal (Nana / Mama / Bhanja) terms on the same structural relation.

Complexity is O(V+E) per person for the BFS, and O(|ancestors(A)|) for the intersection — fast enough to rerun on every keystroke in the relation form.

## Animations

Uses [anime.js 3.2.2](https://animejs.com/) via CDN for two effects:

- **Trail draw-on** — when a relation is traced, the connecting SVG lines animate via `stroke-dashoffset` with a staggered cascade.
- **Viewport tweens** — Fit / Root / focus-on-card transitions interpolate `scale`, `x`, `y` through `Viewport.tweenTo`.

Both respect `prefers-reduced-motion` and fall back to instant transitions. User input (drag, wheel, arrow keys, pinch) cancels any active tween immediately.

## Credits

Maintained by Vaibhav Singh.
