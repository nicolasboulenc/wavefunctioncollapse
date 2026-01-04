"use strict";

const TILESET_PATH = "wfc_tileset2.png";
const TILESET_SIZE = 16;
const COLS = 40;
const ROWS = 40;


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
    tileset: null,
    tile_size: 0,
    is_complete: false,
}


const DIR_NORTH = 0
const DIR_EAST  = 1
const DIR_SOUTH = 2
const DIR_WEST  = 3

const SIDE_TYPE_BLANK = 0
const SIDE_TYPE_ROAD = 1

const wfc_tiles = [
    {
        // id:     "blank",
        sides: [
            SIDE_TYPE_BLANK,
            SIDE_TYPE_BLANK,
            SIDE_TYPE_BLANK,
            SIDE_TYPE_BLANK,
        ],
        image_x: 0,
        image_y: 0,
    },
    {
        // id:     "top",
        sides: [
            SIDE_TYPE_ROAD,
            SIDE_TYPE_ROAD,
            SIDE_TYPE_BLANK,
            SIDE_TYPE_ROAD,
        ],
        image_x: 16,
        image_y: 0,
    },
    {
        // id:     "east",
        sides: [
            SIDE_TYPE_ROAD,
            SIDE_TYPE_ROAD,
            SIDE_TYPE_ROAD,
            SIDE_TYPE_BLANK,
        ],
        image_x: 32,
        image_y: 0,
    },
    {
        // id:     "south",
        sides: [
            SIDE_TYPE_BLANK,
            SIDE_TYPE_ROAD,
            SIDE_TYPE_ROAD,
            SIDE_TYPE_ROAD,
        ],
        image_x: 48,
        image_y: 0,
    },
    {
        // id:     "west",
        sides: [
            SIDE_TYPE_ROAD,
            SIDE_TYPE_BLANK,
            SIDE_TYPE_ROAD,
            SIDE_TYPE_ROAD,
        ],
        image_x: 64,
        image_y: 0,
    },
]


window.addEventListener("load", window_onload);


function window_onload(evt) {
    window.addEventListener("click", app_onmouseclick);
    window.addEventListener("mousemove", app_onmousemove);
    wfc_init(COLS, ROWS, TILESET_PATH, TILESET_SIZE);
    app_init();
    app_draw();
}


function app_init() {
    const canvas = document.querySelector("canvas");
    app.ctx = canvas.getContext("2d");
    app.ctx.canvas.style.width = `${wfc.cols * wfc.tile_size * app.scale}px`;
    app.ctx.canvas.style.height = `${wfc.rows * wfc.tile_size * app.scale}px`;
    app.ctx.canvas.width = app.ctx.canvas.clientWidth;
    app.ctx.canvas.height = app.ctx.canvas.clientHeight;
    app.ctx.font = `${TILESET_SIZE}px sans-serif`;
    app.ctx.textAlign = "center";
    app.ctx.textBaseline = "middle";
    app.ctx.fillStyle = "white";

    app.generator = new Math.seedrandom("heelo");

    // const index = Math.floor(COLS * ROWS / 2 + COLS / 2)
    // wfc_collapse(index, 0)
    // wfc_propagate_all(index)
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
    if(app.paused === false) {
        wfc_loop();
    }
    wfc_draw();
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
            needs_redraw: true,
        }
    }
    wfc.tile_size = tileset_size;
    wfc.tileset = new Image();
    wfc.tileset.src = tileset_path;
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

    cell.tile = wfc_tiles[chosen_tile_index];
    cell.options = [chosen_tile_index];
    cell.needs_redraw = true;
}


function wfc_propagate(col, row, neighbor_index, direction) {
    if(wfc.is_complete === true) return;
    if (col < 0 || col >= wfc.cols || row < 0 || row >= wfc.rows) return;
    if (wfc.grid[row * wfc.cols + col].tile !== null) return; // already collapsed
    
    const cell = wfc.grid[row * wfc.cols + col];
    cell.needs_redraw = true;
    const opposite = (direction + Math.floor(wfc_tiles[0].sides.length/2)) % wfc_tiles[0].sides.length
    const neig_options = wfc.grid[neighbor_index].options;

    // work backwards when removing options
    for (let i = cell.options.length - 1; i >= 0; i--) {
        const cell_option_idx = cell.options[i];
        const cell_option = wfc_tiles[cell_option_idx];

        for(let j=0; j<neig_options.length; j++) {
            const neig_option_idx = neig_options[j];
            const neig_option = wfc_tiles[neig_option_idx];
            if (cell_option.sides[opposite] !== neig_option.sides[direction]) {
                cell.options.splice(i, 1);
                break;
            }
        }
    }

    if(cell.options.length === 0) {
        throw new Error(`no options left ${col} ${row}`)
    }
}


function wfc_propagate_all(index) {

    if(app.paused === true) return;
    if(wfc.is_complete === true) return;
    
    const col = index % wfc.cols;
    const row = Math.floor(index / wfc.cols);
    if (col < 0 || col >= wfc.cols || row < 0 || row >= wfc.rows) return;
    
    const cell = wfc.grid[index];
    const cell_options = cell.options;
    cell.needs_redraw = true;

    const neig_offsets = [
        {col:  0, row: -1},
        {col: +1, row:  0},
        {col:  0, row: +1},
        {col: -1, row:  0},
    ]

    let direction = 0;
    for(let offset of neig_offsets) {
        const nc = col + offset.col;
        const nr = row + offset.row;
        if (nc < 0 || nc >= wfc.cols || nr < 0 || nr >= wfc.rows) continue;

        const opposite = (direction + Math.floor(wfc_tiles[0].sides.length/2)) % wfc_tiles[0].sides.length;
        if(wfc.grid[nr * wfc.cols + nc].is_propagated === true) continue;

        let neig_options = wfc.grid[nr * wfc.cols + nc].options;
        for (let i=neig_options.length-1; i>-1; i--) {
            const neig_option_idx = neig_options[i];
            const neig_option = wfc_tiles[neig_option_idx];

            let found = false;
            for (let j=0; j<cell_options.length; j++) {
                const cell_option_idx = cell_options[j];
                const cell_option = wfc_tiles[cell_option_idx];
                if (cell_option.sides[direction] === neig_option.sides[opposite]) {
                    found = true;
                    break;
                }
            }
            if(found === false) {
                neig_options.splice(i, 1);
                if(neig_options.length === 0) {
                    console.log(wfc.grid[nr * wfc.cols + nc]);
                    console.log(`No options left! ${col} ${row}`);
                    // throw new Error(`No options left! ${col} ${row}`)
                    app.paused = true;
                }
            }
        }
        direction++;
    }
}


function wfc_loop() {

    if (wfc.grid === null) return;

    // pick min entropy
    const min_entropy_idx = wfc_pick()

    // collapse cell
    wfc_collapse(min_entropy_idx);

    // propagate constraints to neighbors
    wfc_propagate_all(min_entropy_idx);

    // const [col, row] = i2c(min_entropy_idx);
    // wfc_propagate(col       , row - 1   , min_entropy_idx, DIR_NORTH);
    // wfc_propagate(col + 1   , row       , min_entropy_idx, DIR_EAST);
    // wfc_propagate(col       , row + 1   , min_entropy_idx, DIR_SOUTH);
    // wfc_propagate(col - 1   , row       , min_entropy_idx, DIR_WEST);
}


function wfc_draw() {

    if (wfc.grid === null) return;
    if (wfc.tileset === null) return;
    if (wfc.tileset.complete !== true) return;

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
            else {
                // display tile
                app.ctx.drawImage(wfc.tileset, cell.tile.image_x, cell.tile.image_y, wfc.tile_size, wfc.tile_size, x, y, w, h);
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
        app.ctx.drawImage(  wfc.tileset, 
                            wfc_tiles[options[i]].image_x, 
                            wfc_tiles[options[i]].image_y, 
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
