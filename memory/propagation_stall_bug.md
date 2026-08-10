---
name: propagation-stall-bug
description: WFC used to halt very early due to single-step (non-cascading) constraint propagation in main.js; fixed with a propagation queue, but full-canvas completion still isn't guaranteed because the tileset itself permits genuine dead ends
metadata:
  type: project
---

Fixed 2026-08-10: `wfc_propagate_all` in `main.js` now does queue-based cascading propagation — whenever a neighbor's `options` shrink, that neighbor is pushed back onto the queue so the change propagates further outward, instead of only fanning out one step from the newly-collapsed cell. Also fixed a related bug where a neighbor that was already collapsed (`tile !== null`) could have its single remaining option incorrectly spliced away.

The old dead/commented-out `wfc_propagate` function and the dead `is_propagated` cell flag (never set anywhere) were removed as part of this — they were not a usable alternate fix, see prior history in git log if needed.

**Verified:** with the same seeded RNG, old code stalled at 182/1600 cells (~11%); fixed code reaches 589/1600 (~37%) and produces a large coherent connected pattern before stalling (checked via Chrome automation, driving `wfc_loop()` directly since `requestAnimationFrame` is throttled on a backgrounded automation tab).

**Residual issue (separate from this bug, not yet addressed):** generation still doesn't reach 100% completion. This tileset (`wfc_tiles` in main.js) has only 5 tiles — 1 blank + four "3-way junction" pieces, each missing exactly one road side (no straight, corner, or dead-end road pieces exist). With a tileset this constrained, plain WFC without backtracking can hit genuine dead ends that no amount of forward-propagation avoids — arc-consistency (what cascading propagation gives you) is not the same as global consistency. Fixing that requires backtracking or restart-on-contradiction, which is a separate, larger feature, not a bug in the propagation logic itself.

**Why:** proper WFC needs a propagation queue — whenever any cell's options actually shrink, that cell should be pushed for further propagation to its own neighbors, repeating until stable — not a single fan-out from the originating collapse. This does not by itself guarantee a complete solution for every tileset.

**How to apply:** if asked to make generation reach 100% completion (not just "stops too early"), the cascading-propagation fix here is necessary but not sufficient — that further ask needs backtracking/restart logic, a different task from this one.
