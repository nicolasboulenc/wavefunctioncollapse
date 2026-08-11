"use strict";

const WFC_RULES_PATH = "tileset1/wfc_rules3.json";
const COLS = 26;
const ROWS = 26;


const app = {
    ctx: null,
    scale: 2,
    mouse_x: 0,
    mouse_y: 0,
    generator: null,
    paused: false,
}


const wfc = {
    cols: 0,
    rows: 0,
    grid: null,
    rules: null,    // from json file
    tilesets: null, // from json file
    is_complete: false,
}


const DIR_NORTH = 0
const DIR_EAST  = 1
const DIR_SOUTH = 2
const DIR_WEST  = 3


window.addEventListener("load", app_init);


async function app_init() {

    window.addEventListener("click", app_onmouseclick);
    window.addEventListener("mousemove", app_onmousemove);


    const wfc_rules = await wfc_fetch(WFC_RULES_PATH);

    wfc_init(COLS, ROWS, wfc_rules.rules, wfc_rules.tilesets);
    const canvas = document.querySelector("canvas");
    app.ctx = canvas.getContext("2d");
    app.ctx.canvas.style.width = `${wfc.cols * wfc.tile_size * app.scale}px`;
    app.ctx.canvas.style.height = `${wfc.rows * wfc.tile_size * app.scale}px`;
    app.ctx.canvas.width = app.ctx.canvas.clientWidth;
    app.ctx.canvas.height = app.ctx.canvas.clientHeight;
    app.ctx.font = `${wfc.tile_size}px sans-serif`;
    app.ctx.textAlign = "center";
    app.ctx.textBaseline = "middle";
    app.ctx.fillStyle = "white";

    app.generator = new Math.seedrandom("heelo");

    // const index = Math.floor(COLS * ROWS / 2 + COLS / 2)
    // wfc_collapse(index, 0)
    // wfc_propagate_all(index)

    app_draw();
}


function app_onmouseclick() {
    wfc_loop();
}


function app_onmousemove(evt) {
    app.mouse_x = evt.clientX;
    app.mouse_y = evt.clientY;
}


function app_draw() {

    // while(wfc.is_complete !== true) {
    //     wfc_loop()
    // }
    // console.log("completed")
    // if(wfc.is_complete === true) {
    //     wfc_draw();
    // }

    // comment to play with mouse
    if(app.paused === false) {
        wfc_loop();
    }

    wfc_draw();
    window.requestAnimationFrame(app_draw);
}


async function wfc_fetch(url) {

    try {
        const response = await fetch(url);
        const result = await response.json();

        const base_url = url.substring(0, url.lastIndexOf("/") + 1);

        for(const ts of result.tilesets) {
            if(ts.image !== "") {
                ts.image_data = new Image();
                ts.image_data.src = base_url + ts.image;
                await ts.image_data.decode();
            }
        }

        return result;
    } 
    catch (error) {
        console.error(error.message);
    }
}


function wfc_init(cols, rows, rules, tilesets) {
    wfc.cols = cols;
    wfc.rows = rows;
    wfc.rules = rules;
    wfc.tilesets = tilesets;
    wfc.tile_size = tilesets[0].tilewidth;

    wfc.grid = [];
    for (let i=0; i<wfc.rows * wfc.cols; i++) {
        wfc.grid[i] = {
            tile: null,
            options: Array.from(Array(wfc.rules.length).keys()),
            needs_redraw: true,
        }
    }
}


function wfc_pick() {
    if(wfc.is_complete === true) return;

    // find cell with lowest entropy
    let min_entropy = Infinity;
    let min_entropy_elems = [];
    let collapsed_count = 0;

    for (let i=0; i<wfc.grid.length; i++) {
        const cell = wfc.grid[i];
        if(cell.tile !== null) {
            collapsed_count++;
            continue;
        }
        if (cell.options.length < min_entropy) {
            min_entropy = cell.options.length;
            min_entropy_elems = [i];
        }
        else if (cell.options.length === min_entropy) {
            min_entropy_elems.push(i);
        }
    }

    // all cells collapsed
    if (collapsed_count === wfc.grid.length) {
        wfc.is_complete = true;
        return 0;
    }

    // randomly pick one of the lowest entropy cells
    const min_entropy_idx = min_entropy_elems[Math.floor(app.generator() * min_entropy_elems.length)];
    return min_entropy_idx;
}


function wfc_collapse(index, tile_index=-1) {

    if(wfc.is_complete === true) return;
    const cell = wfc.grid[index];
    let chosen_index = Math.floor(app.generator() * cell.options.length);
    let chosen_tile_index = cell.options[chosen_index];

    if(tile_index !== -1) chosen_tile_index = tile_index;

    cell.tile = wfc.rules[chosen_tile_index];
    cell.options = [chosen_tile_index];
    cell.needs_redraw = true;
}


function wfc_propagate_all(index) {

    if(app.paused === true) return;
    if(wfc.is_complete === true) return;

    const neig_offsets = [
        {col:  0, row: -1},
        {col: +1, row:  0},
        {col:  0, row: +1},
        {col: -1, row:  0},
    ]

    // cascading propagation: only re-visit a cell when one of its neighbors
    // actually removed an option, so total work stays bounded by how many
    // options can ever be removed (not a full-grid rescan per step)
    const queue = [index];
    const queued = new Set(queue);

    while (queue.length > 0) {
        const current = queue.shift();
        queued.delete(current);

        const col = current % wfc.cols;
        const row = Math.floor(current / wfc.cols);
        const cell_options = wfc.grid[current].options;

        let direction = 0;
        for(let offset of neig_offsets) {
            const nc = col + offset.col;
            const nr = row + offset.row;
            if (nc < 0 || nc >= wfc.cols || nr < 0 || nr >= wfc.rows) { direction++; continue; }

            const neig_index = nr * wfc.cols + nc;
            const neig_cell = wfc.grid[neig_index];
            if (neig_cell.tile !== null) { direction++; continue; }

            const opposite = (direction + Math.floor(wfc.rules[0].sides.length/2)) % wfc.rules[0].sides.length;
            const neig_options = neig_cell.options;
            let changed = false;

            for (let i=neig_options.length-1; i>-1; i--) {
                const neig_option = wfc.rules[neig_options[i]];

                let found = false;
                for (let j=0; j<cell_options.length; j++) {
                    const cell_option = wfc.rules[cell_options[j]];
                    if (Object.prototype.hasOwnProperty.call(cell_option.sides[direction], neig_option.id)) {
                        found = true;
                        break;
                    }
                }
                if(found === false) {
                    neig_options.splice(i, 1);
                    changed = true;
                    if(neig_options.length === 0) {
                        console.log(neig_cell);
                        console.log(`No options left! ${nc} ${nr}`);
                        app.paused = true;
                    }
                }
            }

            if (changed === true) {
                neig_cell.needs_redraw = true;
                if (app.paused === true) return;
                if (queued.has(neig_index) === false) {
                    queue.push(neig_index);
                    queued.add(neig_index);
                }
            }
            direction++;
        }
    }
}


function wfc_loop() {

    if (wfc.grid === null) return;

    // pick min entropy
    const min_entropy_idx = wfc_pick()

    // collapse cell
    wfc_collapse(min_entropy_idx);

    // propagate constraints to neighbors, cascading until stable
    wfc_propagate_all(min_entropy_idx);
}


function wfc_draw() {

    if (wfc.grid === null) return;
    if (wfc.tilesets === null) return;
    if (wfc.tilesets.some(ts => ts.image_data && ts.image_data.complete !== true)) return;

    if (app.ctx.imageSmoothingEnabled !== false) app.ctx.imageSmoothingEnabled = false;

    // draw cells
    const w = wfc.tile_size * app.scale;
    const h = wfc.tile_size * app.scale;

    for (let r=0; r<wfc.rows; r++) {
        for (let c=0; c<wfc.cols; c++) {
            const cell = wfc.grid[r * wfc.cols + c];
            if(cell.needs_redraw === false) continue;
            const x = c * wfc.tile_size * app.scale;
            const y = r * wfc.tile_size * app.scale;

            if (cell.tile === null) {
                // display entropy
                app.ctx.clearRect(x, y, w, h)
                app.ctx.fillText(cell.options.length.toString(), x + w / 2, y + h / 2);
            }
            else if (cell.tile.id === 0) {
                // blank/empty tile
                app.ctx.clearRect(x, y, w, h)
            }
            else {
                // display tile
                const tileset = wfc.tilesets[cell.tile.tileset_idx];
                app.ctx.drawImage(tileset.image_data, cell.tile.image_x, cell.tile.image_y, wfc.tile_size, wfc.tile_size, x, y, w, h);
            }
        }
    }

    const rect = app.ctx.canvas.getBoundingClientRect();
    const col = Math.floor((app.mouse_x - rect.x) / (wfc.tile_size * app.scale));
    const row = Math.floor((app.mouse_y - rect.y) / (wfc.tile_size * app.scale));
    if (col < 0 || col >= wfc.cols || row < 0 || row >= wfc.rows) return;

    const mouse_x = app.mouse_x - rect.x;
    const mouse_y = app.mouse_y - rect.y;

    app.ctx.fillText(`${col} ${row}`, mouse_x - 20, mouse_y);
    
    const options = wfc.grid[row * wfc.cols + col].options
    for(let i=0; i<options.length; i++) {
        const rule = wfc.rules[options[i]];
        if (rule.id === 0) continue;
        const tileset = wfc.tilesets[rule.tileset_idx];
        app.ctx.drawImage(  tileset.image_data,
                            rule.image_x,
                            rule.image_y,
                            wfc.tile_size,
                            wfc.tile_size,
                            mouse_x + 10 + (i * (w+3)), mouse_y + 10, w, h);
    }
}


function i2c(idx) {
    const c = idx % wfc.cols;
    const r = Math.floor(idx / wfc.cols);
    return [c, r];
}
