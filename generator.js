"use strict";

const WFC_RULES_PATH = "tileset1/wfc_rules3.json";
const DEFAULT_SCALE = 1;
const DEFAULT_COLS = 50;
const DEFAULT_ROWS = 50;
const DEFAULT_SEED = "2";
const DEFAULT_RENDER_MODE = "progress";

const app = {
    mouse_x: 0,
    mouse_y: 0,
    conf: {
        scale: DEFAULT_SCALE,
        cols: DEFAULT_COLS,
        rows: DEFAULT_ROWS,
        seed: DEFAULT_SEED,
        render_mode: DEFAULT_RENDER_MODE
    },
    ctx: null,
    rules: null,
    tilesets: null,
    random_generator: null,
    is_paused: false,
    start_time: 0,
    time_logged: false,
}


const wfc = {
    cols: 0,
    rows: 0,
    grid: null,
    rules: null,    // from json file
    random_generator: null,
    is_stopped: false,
}


const DIR_NORTH = 0
const DIR_EAST  = 1
const DIR_SOUTH = 2
const DIR_WEST  = 3


window.addEventListener("load", (evt) => { app_init(app); });


function params_onchange(evt) {
    if(evt.currentTarget.id === "scale") {
        app.conf.scale = parseFloat(evt.currentTarget.value);
        document.querySelector("#scale-value").innerHTML = app.conf.scale;
        app_resize(app);
        app_draw();
    }
    else if(evt.currentTarget.id === "cols") {
        app.conf.cols = parseInt(evt.currentTarget.value);
        document.querySelector("#cols-value").innerHTML = app.conf.cols;
        app_resize(app);
        app_draw();
    }
    else if(evt.currentTarget.id === "rows") {
        app.conf.rows = parseInt(evt.currentTarget.value);
        document.querySelector("#rows-value").innerHTML = app.conf.rows;
        app_resize(app);
        app_draw();
    }
    else if(evt.currentTarget.id === "seed") {
        app.conf.seed = evt.currentTarget.value;
    }
    else if(evt.currentTarget.id === "render-mode") {
        app.conf.render_mode = evt.currentTarget.value;
    }
    app_conf_save(app);
}


function generate_onclick(evt) {
    wfc_init(wfc, app.conf.cols, app.conf.rows, app.rules, new Math.seedrandom(app.conf.seed));
    app.is_paused = false;
    app.start_time = performance.now();
    app.time_logged = false;
}


async function app_init(app) {

    window.addEventListener("mousemove", app_onmousemove);
    const ranges = document.querySelectorAll("[type=range]");
    for(const range of ranges) {
        range.addEventListener("change", params_onchange);
    }
    const inputs = document.querySelectorAll("[type=text]");
    for(const input of inputs) {
        input.addEventListener("change", params_onchange);
    }
    const selects = document.querySelectorAll("select");
    for(const select of selects) {
        select.addEventListener("change", params_onchange);
    }
    const button = document.querySelector("#generate").addEventListener("click", generate_onclick);
    


    app_conf_load(app);
    const wfc_rules = await fetch_rules(WFC_RULES_PATH);
    app.rules = wfc_rules.rules;
    app.tilesets = wfc_rules.tilesets;

    const canvas = document.querySelector("canvas");
    app.ctx = canvas.getContext("2d");
    app.ctx.textAlign = "center";
    app.ctx.textBaseline = "middle";
    app.ctx.fillStyle = "white";
    app_resize(app);

    wfc_init(wfc, app.conf.cols, app.conf.rows, app.rules, new Math.seedrandom(app.conf.seed));
    app.start_time = performance.now();
    app.time_logged = false;

    app_draw();
}


function app_conf_load(app) {

    const data = localStorage.getItem("generator-conf");
    if(data !== null) {
        const conf = JSON.parse(data);
        app.conf.scale = conf.scale;
        app.conf.cols = conf.cols;
        app.conf.rows = conf.rows;
        app.conf.seed = conf.seed;
        app.conf.render_mode = conf.render_mode;

        document.getElementById("scale").value = conf.scale;
        document.getElementById("cols").value = conf.cols;
        document.getElementById("rows").value = conf.rows;
        document.getElementById("seed").value = conf.seed;
        document.getElementById("render-mode").value = conf.render_mode;
        document.querySelector("#scale-value").innerHTML = app.conf.scale;
        document.querySelector("#rows-value").innerHTML = app.conf.rows;
        document.querySelector("#cols-value").innerHTML = app.conf.cols;
        document.querySelector("#seed").value = app.conf.seed;
    }
}


function app_conf_save(app) {

    try {
        const data = JSON.stringify(app.conf);
        localStorage.setItem("generator-conf", data);
    }
    catch(e) {
        console.error(e);
    }
}


function app_onmousemove(evt) {
    app.mouse_x = evt.clientX;
    app.mouse_y = evt.clientY;
}


function app_resize(app) {
    if(app.ctx === null) return;
    app.ctx.canvas.style.width = `${app.conf.cols * app.tilesets[0].tilewidth * app.conf.scale}px`;
    app.ctx.canvas.style.height = `${app.conf.rows * app.tilesets[0].tileheight * app.conf.scale}px`;
    app.ctx.canvas.width = app.ctx.canvas.clientWidth;
    app.ctx.canvas.height = app.ctx.canvas.clientHeight;
    app.ctx.font = `${Math.floor(app.tilesets[0].tileheight * app.conf.scale / 2)}px sans-serif`;
    app.ctx.fillStyle = "white";
}


function app_draw() {


    if(app.is_paused === false) {
        if(app.conf.render_mode === "progress") {
            wfc_loop(wfc);
        }
        else if(app.conf.render_mode === "full") {
            while(wfc.is_stopped !== true) {
                wfc_loop(wfc)
            }
        }
        app_wfc_draw(app, wfc);

        if(wfc.is_stopped === true && app.time_logged === false) {
            console.log(`WFC generation took ${(performance.now() - app.start_time).toFixed(2)}ms`);
            app.time_logged = true;
        }
    }

    window.requestAnimationFrame(app_draw);
}


async function fetch_rules(url) {

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


function wfc_init(wfc, cols, rows, rules, random_generator) {
    wfc.cols = cols;
    wfc.rows = rows;
    wfc.rules = rules;
    wfc.random_generator = random_generator;
    wfc.is_stopped = false;

    wfc.grid = [];
    for (let i=0; i<wfc.rows * wfc.cols; i++) {
        wfc.grid[i] = {
            tile: null,
            options: Array.from(Array(wfc.rules.length).keys()),
            needs_redraw: true,
        }
    }
}


function wfc_pick(wfc) {
    if(wfc.is_stopped === true) return;

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
        wfc.is_stopped = true;
        return 0;
    }

    // randomly pick one of the lowest entropy cells
    const min_entropy_idx = min_entropy_elems[Math.floor(wfc.random_generator() * min_entropy_elems.length)];
    return min_entropy_idx;
}


function wfc_collapse(wfc, index, tile_index=-1) {

    if(wfc.is_stopped === true) return;
    const cell = wfc.grid[index];
    let chosen_index = Math.floor(wfc.random_generator() * cell.options.length);
    let chosen_tile_index = cell.options[chosen_index];

    if(tile_index !== -1) chosen_tile_index = tile_index;

    cell.tile = wfc.rules[chosen_tile_index];
    cell.options = [chosen_tile_index];
    cell.needs_redraw = true;
}


function wfc_propagate_all(wfc, index) {

    if(wfc.is_stopped === true) return;

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
                    if (cell_option.sides[direction][neig_option.id] !== undefined) {
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
                        wfc.is_stopped = true;
                        return;
                    }
                }
            }

            if (changed === true) {
                neig_cell.needs_redraw = true;
                // if (wfc.is_stopped === true) return;
                if (queued.has(neig_index) === false) {
                    queue.push(neig_index);
                    queued.add(neig_index);
                }
            }
            direction++;
        }
    }
}


function wfc_loop(wfc) {

    if (wfc.grid === null) return;
    if (wfc.is_stopped === true) return;

    // pick min entropy
    const min_entropy_idx = wfc_pick(wfc);

    // collapse cell
    wfc_collapse(wfc, min_entropy_idx);

    // propagate constraints to neighbors, cascading until stable
    wfc_propagate_all(wfc, min_entropy_idx);
}


function app_wfc_draw(app, wfc) {

    if (wfc.grid === null) return;
    if (app.tilesets === null) return;
    if (app.tilesets.some(ts => ts.image_data && ts.image_data.complete !== true)) return;

    if (app.ctx.imageSmoothingEnabled !== false) app.ctx.imageSmoothingEnabled = false;

    // draw cells
    
    // width and height source
    const ws = app.tilesets[0].tilewidth;
    const hs = app.tilesets[0].tileheight;
    // width and height destination
    const wd = ws * app.conf.scale;
    const hd = hs * app.conf.scale;

    for (let r=0; r<wfc.rows; r++) {
        for (let c=0; c<wfc.cols; c++) {
            const cell = wfc.grid[r * wfc.cols + c];
            if(cell.needs_redraw === false) continue;
            const x = c * wd;
            const y = r * hd;

            if (cell.tile === null) {
                // display entropy
                app.ctx.clearRect(x, y, wd, hd)
                app.ctx.fillText(cell.options.length.toString(), x + wd / 2, y + hd / 2);
            }
            else if (cell.tile.id === 0) {
                // blank/empty tile
                app.ctx.clearRect(x, y, wd, hd);
            }
            else {
                // display tile
                const tileset = app.tilesets[cell.tile.tileset_idx];
                app.ctx.drawImage(tileset.image_data, cell.tile.image_x, cell.tile.image_y, ws, hs, x, y, wd, hd);
            }
        }
    }

    const rect = app.ctx.canvas.getBoundingClientRect();
    const col = Math.floor((app.mouse_x - rect.x) / wd);
    const row = Math.floor((app.mouse_y - rect.y) / hd);
    if (col < 0 || col >= wfc.cols || row < 0 || row >= wfc.rows) return;

    const mouse_x = app.mouse_x - rect.x;
    const mouse_y = app.mouse_y - rect.y;

    app.ctx.fillText(`${col} ${row}`, mouse_x - 20, mouse_y);
    
    const options = wfc.grid[row * wfc.cols + col].options
    for(let i=0; i<options.length; i++) {
        const rule = wfc.rules[options[i]];
        if (rule.id === 0) continue;
        const tileset = app.tilesets[rule.tileset_idx];
        app.ctx.drawImage(  tileset.image_data,
                            rule.image_x, rule.image_y,
                            ws, hs,
                            mouse_x + 10 + (i * (wd+3)), mouse_y + 10, 
                            wd, hd);
    }
}
