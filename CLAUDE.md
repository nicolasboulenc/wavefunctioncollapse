# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A browser-based Wave Function Collapse (WFC) tile generator, plus a companion tool that derives WFC adjacency rules from hand-authored Tiled maps. Static HTML/CSS/JS with no build step, no package manager, and no test suite. There are two independent pages, sharing `index.css` and both loading `seedrandom.min.js` (deterministic PRNG) plus their own script directly as `<script>` tags:

- `index.html` + `generator.js` — the WFC generator itself.
- `editor.html` + `editor.js` — a "Data" tool that renders a Tiled-exported map and derives WFC rules (adjacency data) from it.

## Running

There is no build/lint/test tooling in this repo. Fetches of local JSON/images mean `file://` won't work in most browsers — serve the directory over HTTP:

```
python3 -m http.server
```

Then visit `http://localhost:8000/index.html` for the generator or `http://localhost:8000/editor.html` for the rule-derivation tool.

## Architecture

### Generator (`generator.js`)

Organized around two global state objects:

- `app` — rendering/interaction state: `app.conf` (`scale`, `cols`, `rows`, `seed`, persisted to `localStorage` under `"generator-conf"`), canvas context, mouse position, the seeded RNG instance (`app.generator`), and `paused`.
- `wfc` — algorithm state: grid dimensions, the `grid` array of cells (`{ tile, options, needs_redraw }`), `rules` and `tilesets` (loaded from a rules JSON file), `tile_size`, and `is_complete`.

Unlike a hardcoded tileset, rules are loaded at runtime via `fetch_rules(WFC_RULES_PATH)` — currently `tileset1/wfc_rules3.json` — which returns `{ tilesets, rules }`. Each rule has an `id` (source tile gid, 0 = blank), `tileset_idx`/`image_x`/`image_y` into that tileset's spritesheet, and a `sides` array (indexed by `DIR_NORTH/EAST/SOUTH/WEST`) of `{ neighbor_gid: count }` maps — two edges are compatible if the neighbor's gid is a key in the facing side's map (the count, sourced from the authored map, is not currently used as a weight).

Main loop (driven by `requestAnimationFrame` in `app_draw`, one step per frame unless `app.paused`, or manually stepped by clicking the canvas):

1. `wfc_pick` — scan the grid for uncollapsed cells with the lowest `options.length` (entropy) and randomly choose one via `app.generator`.
2. `wfc_collapse` — randomly choose one of that cell's remaining tile options and lock it in (`options` becomes a single-element array).
3. `wfc_propagate_all` — BFS/queue-based cascading propagation from the collapsed cell: for each dequeued cell's 4 neighbors, remove any remaining neighbor options incompatible with the cell, and enqueue neighbors that actually lost options (so work stays bounded rather than rescanning the whole grid each step). If a neighbor is driven to zero options, generation pauses (`app.paused = true`) since that's a contradiction.

`app_wfc_draw` renders each cell: an entropy count (options remaining) for uncollapsed cells, or the resolved tile's sprite for collapsed ones (tile `id === 0` draws as blank). Hovering the canvas also previews the remaining tile options for the cell under the cursor.

### Editor / rule derivation tool (`editor.js`)

Loads a Tiled JSON map export (currently `tileset1/map3.json`) plus its tileset image(s), draws the composited layers to canvas, then `generate_rules` walks every cell of every visible layer: for each unique tile gid it builds a `sides` array of `Map(neighbor_gid -> occurrence_count)` per direction, based on what actually neighbors that gid in the authored map. The result (`{ tilesets, rules }`) is written to the console via `console.log(JSON.stringify(wfc, map_replacer, 2))` — there is no UI or file-save step; the JSON is currently copy-pasted out of devtools into a `tileset1/wfc_rulesN.json` file for the generator to consume.

### Tile assets

`tileset0/`, `tileset1/`, `tileset2/` hold spritesheets and Tiled project files (`.tmx`/`.tsx`/`.xcf`) plus exported map/tileset JSON. `tileset1/` is the active source (`map3.json` → `wfc_rules3.json`); the other directories and the older `map1`/`map2layers` exports are earlier iterations kept for reference.

## Memory

This project's auto-memory files (the persistent memory system, `MEMORY.md` + individual memory files) live in `memory/` at the repo root, not the default global memory location. When saving or reading memories for this project, use `memory/` here instead of `~/.claude/projects/.../memory/`.
