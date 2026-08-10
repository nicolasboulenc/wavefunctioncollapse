# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A browser-based Wave Function Collapse (WFC) tile generator. Static HTML/CSS/JS with no build step, no package manager, and no test suite — `index.html` loads `seedrandom.min.js` (deterministic PRNG) and `main.js` directly as `<script>` tags.

## Running

There is no build/lint/test tooling in this repo. To view the app, serve the directory over HTTP (loading `index.html` via `file://` can break canvas/image drawing in some browsers) and open it, e.g.:

```
python3 -m http.server
```

Then visit `http://localhost:8000`.

## Architecture

Everything lives in `main.js`, organized around two global state objects:

- `app` — rendering/interaction state: canvas context, `scale`, mouse position, the seeded RNG instance (`app.generator`), and `paused`.
- `wfc` — algorithm state: grid dimensions, the `grid` array of cells (`{ tile, options, needs_redraw }`), the tileset image, and `is_complete`.

Tiles are defined in `wfc_tiles`, each with a `sides` array (indexed by `DIR_NORTH/EAST/SOUTH/WEST`) describing edge type (`SIDE_TYPE_BLANK`/`SIDE_TYPE_ROAD`) and an `image_x`/`image_y` offset into the tileset spritesheet (`wfc_tileset2.png`, 16px tiles). Two edges are compatible only when adjacent cells' facing sides match.

Main loop (driven by `requestAnimationFrame` in `app_draw`, one step per frame unless `app.paused`):

1. `wfc_pick` — scan the grid for uncollapsed cells with the lowest `options.length` (entropy) and randomly choose one via `app.generator`.
2. `wfc_collapse` — randomly choose one of that cell's remaining tile options and lock it in (`options` becomes a single-element array).
3. `wfc_propagate_all` — for the collapsed cell's 4 neighbors, remove any of their remaining options whose facing side can't match the collapsed cell; if a neighbor is driven to zero options, generation pauses (`app.paused = true`) since that's a contradiction.

`wfc_draw` renders each cell: an entropy count (options remaining) for uncollapsed cells, or the resolved tile's sprite for collapsed ones. Hovering the canvas also previews the remaining tile options for the cell under the cursor.

Note: `wfc_propagate` (single-direction variant) and some `app_init`/`app_draw` code paths are dead/commented-out alternates left in place from earlier iterations of the propagation approach.

## Memory

This project's auto-memory files (the persistent memory system, `MEMORY.md` + individual memory files) live in `memory/` at the repo root, not the default global memory location. When saving or reading memories for this project, use `memory/` here instead of `~/.claude/projects/.../memory/`.
