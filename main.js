"use strict";

window.addEventListener("load", window_onload);

const app = {
    ctx: null,
    scale: 4,
}

const TILESET_PATH = "wfc_tileset.png";
const TILESET_SIZE = 16;
const COLS = 10;
const ROWS = 10;

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


function window_onload(evt) {
    window.addEventListener("click", (e) => wfc_step());
    wfc_init(COLS, ROWS, TILESET_PATH, TILESET_SIZE);
    app_init();
    app_draw();
}


function app_init() {
    const canvas = document.querySelector("canvas");
    canvas.style.width = `${wfc.cols * wfc.tile_size * app.scale}px`;
    canvas.style.height = `${wfc.rows * wfc.tile_size * app.scale}px`;
    app.ctx = canvas.getContext("2d", {alpha: false});
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
            tile_idx: null,
            options: Array.from(Array(wfc_tiles.length).keys()),
        }
    }
    wfc.tile_size = tileset_size;
    wfc.cto = new OffscreenCanvas(wfc.cols * wfc.tile_size, wfc.rows * wfc.tile_size).getContext("2d");
    wfc.tileset = new Image();
    wfc.tileset.src = tileset_path;
}


function wfc_step() {

    // find cell with lowest entropy
    let min_entropy = Infinity;
    let min_entropy_elems = [];

    for (let i=0; i<wfc.grid.length; i++) {
        const cell = wfc.grid[i];
        if (cell.options.length < min_entropy && cell.tile_idx === null) {
            min_entropy = cell.options.length;
            min_entropy_elems = [];
            min_entropy_elems.push(i);
        }
        else if (cell.options.length === min_entropy) {
            min_entropy_elems.push(i);
        }
    }

    // all cells collapsed
    if (min_entropy === 0) return;

    // randomly pick one of the lowest entropy cells
    const min_entropy_idx = min_entropy_elems[Math.floor(Math.random() * min_entropy_elems.length)];

    // collapse cell
    const cell = wfc.grid[min_entropy_idx];
    const chosen_idx = cell.options[Math.floor(Math.random() * cell.options.length)];
    cell.tile_idx = chosen_idx;
    cell.options = [];

    // TODO: propagate constraints to neighbors
    wfc_propagate(col, row, cell);
}


function wfc_propagate(col, row, source) {
    const compatible_tiles = [];
    for (let i=0; i<wfc_tiles.length; i++) {
        const tile = wfc_tiles[i];
        if (tile.sides[side] === side_type) {
            compatible_tiles.push(i);
        }
    }
    return compatible_tiles;
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
            if (cell.tile_idx === null) {
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
                const tile = wfc_tiles[cell.tile_idx];
                const x = c * cell_size;
                const y = r * cell_size;
                cto.drawImage(wfc.tileset, tile.image_x, tile.image_y, cell_size, cell_size, x, y, cell_size, cell_size);
            }

        }
    }
}

