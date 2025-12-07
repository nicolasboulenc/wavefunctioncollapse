// @ts-check
"use strict";

const TILESET_PATH = "wfc_tileset.png";
const TILESET_SIZE = 16;
const COLS = 10;
const ROWS = 10;


/**
 * @type {Object}
 * @property {CanvasRenderingContext2D} ctx - Canvas context.
 * @property {number} scale - Canvas scale.
 */
const app = {
    ctx: null,
    scale: 4,
}


/**
 * @type {Object}
 * @property {number} cols - Number of columns.
 * @property {number} rows - Number of rows.
 * @property {Array} grid - The grid.
 * @property {OffscreenCanvas} cto - Backbuffer.
 * @property {Image} tileset - Images containing tiles.
 * @property {number} tile_size - Tile size, assumes they are squares.
 */
const wfc = {
    cols: 0,
    rows: 0,
    grid: null,
    cto: null,
    tileset: null,
    tile_size: 0,
}


// this is tileset dependent
const wfc_side_types = {
    "blank": 0,
    "road": 1,
}


const wfc_tiles = [
    {
        id:     "blank",
        sides: {
            north:  wfc_side_types.blank,
            east:   wfc_side_types.blank,
            south:  wfc_side_types.blank,
            west:   wfc_side_types.blank,
        },
        image_x: 0,
        image_y: 0,
    },
    {
        id:     "top",
        sides: {
            north:  wfc_side_types.road,
            east:   wfc_side_types.road,
            south:  wfc_side_types.blank,
            west:   wfc_side_types.road,
        },
        image_x: 16,
        image_y: 0,
    },
    {
        id:     "east",
        sides: {
            north:  wfc_side_types.road,
            east:   wfc_side_types.road,
            south:  wfc_side_types.road,
            west:   wfc_side_types.blank,
        },
        image_x: 32,
        image_y: 0,
    },
    {
        id:     "south",
        sides: {
            north:  wfc_side_types.blank,
            east:   wfc_side_types.road,
            south:  wfc_side_types.road,
            west:   wfc_side_types.road,
        },
        image_x: 48,
        image_y: 0,
    },
    {
        id:     "west",
        sides: {
            north:  wfc_side_types.road,
            east:   wfc_side_types.blank,
            south:  wfc_side_types.road,
            west:   wfc_side_types.road,
        },
        image_x: 64,
        image_y: 0,
    },
]


window.addEventListener("load", window_onload);


function window_onload(evt) {
    window.addEventListener("click", (e) => wfc_step());
    wfc_init(COLS, ROWS, TILESET_PATH, TILESET_SIZE);
    app_init();
    app_draw();
}


function app_init() {
    const canvas = document.querySelector("canvas");
    if(canvas === null) throw new Error("Canvas not found");
    canvas.style.width = `${wfc.cols * wfc.tile_size * app.scale}px`;
    canvas.style.height = `${wfc.rows * wfc.tile_size * app.scale}px`;
    app.ctx = canvas.getContext("2d", {alpha: false});
    if(app.ctx === null) throw new Error("Ctx not found");
    app.ctx.canvas.width = app.ctx.canvas.clientWidth;
    app.ctx.canvas.height = app.ctx.canvas.clientHeight;
}


function app_draw() {

    wfc_draw();
    const ctx = app.ctx;
    const cto = wfc.cto;

    if (ctx.imageSmoothingEnabled !== false) ctx.imageSmoothingEnabled = false;
    ctx.drawImage(  cto.canvas,
                    0, 0, cto.canvas.width, cto.canvas.height, 
                    0, 0, cto.canvas.width * app.scale, cto.canvas.height * app.scale);

    window.requestAnimationFrame(app_draw);
}


function wfc_init(cols, rows, tileset_path, tileset_size) {
    wfc.cols = cols;
    wfc.rows = rows;
    wfc.grid = [];
    for (let i=0; i<wfc.rows * wfc.cols; i++) {
        wfc.grid[i] = {
            tile: null,
            options: Array.from(Array(wfc_tiles.length).keys()),
        }
    }
    wfc.tile_size = tileset_size;
    wfc.cto = new OffscreenCanvas(wfc.cols * wfc.tile_size, wfc.rows * wfc.tile_size).getContext("2d");
    wfc.tileset = new Image();
    wfc.tileset.src = tileset_path;
}


function wfc_collapse(col, row) {

    if (col < 0 || col >= wfc.cols || row < 0 || row >= wfc.rows) return;

    const cell = wfc.grid[row * wfc.cols + col];
    const chosen_idx = cell.options[Math.floor(Math.random() * cell.options.length)];
    // const chosen_idx = 3;
    cell.tile = wfc_tiles[chosen_idx];
    cell.options = [chosen_idx];
}


function wfc_propagate(col, row, neighbor, direction, opposite) {

    if (col < 0 || col >= wfc.cols || row < 0 || row >= wfc.rows) return;

    const cell = wfc.grid[row * wfc.cols + col];
    if (cell.tile !== null) return; // already collapsed

    // work backwards when removing options
    for (let i = cell.options.length - 1; i >= 0; i--) {
        const cell_option_idx = cell.options[i];
        const cell_option = wfc_tiles[cell_option_idx];

        for(let j=0; j<neighbor.options.length; j++) {
            const neig_option_idx = neighbor.options[j];
            const neig_option = wfc_tiles[neig_option_idx];
            if (cell_option.sides[opposite] !== neig_option.sides[direction]) {
                cell.options.splice(i, 1);
                break;
            }
        }
    }
}


function wfc_step() {

    // find cell with lowest entropy
    let min_entropy = Infinity;
    let min_entropy_elems = [];

    for (let i=0; i<wfc.grid.length; i++) {
        const cell = wfc.grid[i];
        if (cell.options.length < min_entropy && cell.tile === null) {
            min_entropy = cell.options.length;
            min_entropy_elems = [];
            min_entropy_elems.push(i);
        }
        else if (cell.options.length === min_entropy) {
            min_entropy_elems.push(i);
        }
    }

    // all cells collapsed
    if (min_entropy === 1) return;

    // randomly pick one of the lowest entropy cells
    const min_entropy_idx = min_entropy_elems[Math.floor(Math.random() * min_entropy_elems.length)];
    const [col, row] = i2c(min_entropy_idx);

    // collapse cell
    wfc_collapse(col, row);
    const cell = wfc.grid[min_entropy_idx];

    // TODO: propagate constraints to neighbors
    wfc_propagate(col       , row - 1   , cell, "north",    "south");
    wfc_propagate(col + 1   , row       , cell, "east",     "west");
    wfc_propagate(col       , row + 1   , cell, "south",    "north");
    wfc_propagate(col - 1   , row       , cell, "west",     "east");
}


function wfc_draw() {

    if (wfc.grid === null) return;
    if (wfc.tileset === null) return;
    if (!wfc.tileset.complete) return;

    if (wfc.cto.imageSmoothingEnabled !== false) wfc.cto.imageSmoothingEnabled = false;

    const cto = wfc.cto;
    const cell_size = wfc.tile_size;
    cto.clearRect(0, 0, cto.canvas.width, cto.canvas.height);

    // draw cells
    for (let r=0; r<wfc.rows; r++) {
        for (let c=0; c<wfc.cols; c++) {
            const cell = wfc.grid[r * wfc.cols + c];
            if (cell.tile === null) {
                // display entropy
                cto.fillStyle = "rgba(0, 0, 0, 0.1)";
                cto.fillRect(c * cell_size, r * cell_size, cell_size, cell_size);
                cto.fillStyle = "white";
                cto.font = `${cell_size}px sans-serif`;
                cto.textAlign = "center";
                cto.textBaseline = "middle";
                cto.fillText(cell.options.length.toString(), c * cell_size + cell_size / 2, r * cell_size + cell_size / 2);
                continue;
            }
            else {
                const x = c * cell_size;
                const y = r * cell_size;
                cto.drawImage(wfc.tileset, cell.tile.image_x, cell.tile.image_y, cell_size, cell_size, x, y, cell_size, cell_size);
            }

        }
    }
}


function oob(c, r, col_count, row_count) {
    // check if out of bounds
    return (r < 0 || r >= row_count || c < 0 || c >= col_count);
}

function i2c(idx) {
    const c = idx % wfc.cols;
    const r = Math.floor(idx / wfc.cols);
    return [c, r];
}
