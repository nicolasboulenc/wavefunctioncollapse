"use strict";

const DIR_NORTH = 0
const DIR_EAST  = 1
const DIR_SOUTH = 2
const DIR_WEST  = 3

window.addEventListener("load", app_init);


async function app_init() {

    const canvas = document.querySelector("canvas");
    const context = canvas.getContext("2d");

    const url = "tileset1/map1.json";
    const level = await fetch_level(url);
    console.log(level);

    resize_canvas(context, level);
    draw_level(context, level);
}


async function fetch_level(url) {

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


function resize_canvas(context, level) {

    const px_width = level.width * level.tilewidth;
    const px_height = level.height * level.tileheight;

    context.canvas.style.setProperty("width", `{px_width}px`);
    context.canvas.style.setProperty("height", `{px_height}px`);

    context.canvas.width = px_width;
    context.canvas.height = px_height;
}


function draw_level(context, level) {

    let index = 0;

    context.fillStyle = level.backgroundcolor;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    for(const layer of level.layers) {
        for(const cell of layer.data) {

            let si = cell

            let tsi = 0;
            while(si > level.tilesets[tsi].firstgid + level.tilesets[tsi].tilecount - 1) tsi++;
            const tileset = level.tilesets[tsi];

            si = si - tileset.firstgid
            const sx = (si % tileset.columns) * tileset.tilewidth;
            const sy = Math.floor(si / tileset.columns) * tileset.tileheight;

            const dx = index % layer.width * level.tilewidth;
            const dy = Math.floor(index / layer.width) * level.tileheight;

            context.drawImage(tileset.image_data, sx, sy, tileset.tilewidth, tileset.tileheight, dx, dy, tileset.tilewidth, tileset.tileheight);
            index++;
        }
    }
}


function generate_constraints(level, url) {

    const wfc = { level: url, cells: null }
    wfc.cells = new Map();
    let index = 0;

    // {
    //     // id:     "blank",
    //     sides: [
    //         SIDE_TYPE_BLANK,
    //         SIDE_TYPE_BLANK,
    //         SIDE_TYPE_BLANK,
    //         SIDE_TYPE_BLANK,
    //     ],
    //     image_x: 0,
    //     image_y: 0,
    // },

    for(const layer of level.layers) {
        for(const cell of layer.data) {

            let constraint = wfc.cells.get(cell);
            if(wfc.cells.has(cell) !== true) {
                constraint = {
                                sides: [],
                                tileset_idx: 0,
                                image_x: 0,
                                image_y: 0,
                            }

                for(let i=0; i<DIR_WEST+1; i++) {
                    wfc.cells.push(new Set());
                }
            }
            
            let si = cell;
            let tsi = 0;
            while(si > level.tilesets[tsi].firstgid + level.tilesets[tsi].tilecount - 1) tsi++;
            const tileset = level.tilesets[tsi];

            const sx = (si % tileset.columns) * tileset.tilewidth;
            const sy = Math.floor(si / tileset.columns) * tileset.tileheight;

            index++;
        }
    }
}


function generate_hash() {

}

