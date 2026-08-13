"use strict";

const DIR_NORTH = 0
const DIR_EAST  = 1
const DIR_SOUTH = 2
const DIR_WEST  = 3

window.addEventListener("load", app_init);


async function app_init() {

    const canvas = document.querySelector("canvas");
    const context = canvas.getContext("2d");

    const url = "tileset1/map3.json";
    const level = await fetch_level(url);
    console.log(level);

    resize_canvas(context, level);
    draw_level(context, level);
    generate_rules(level, url)
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


function generate_rules(level, url) {

    const wfc = { tilesets: level.tilesets, rules: null }
    wfc.rules = [];
    const rules_map = new Map();
    let index = 0;

    const neig_offsets = [
        {col:  0, row: -1},
        {col: +1, row:  0},
        {col:  0, row: +1},
        {col: -1, row:  0},
    ]

    for(const layer of level.layers) {
        if(layer.visible !== true) continue;
        for(const gid of layer.data) {

            let rule_index = rules_map.get(gid)
            if(rule_index === undefined) {
                const rule = {
                    id: gid,
                    sides: [],
                    tileset_idx: 0,
                    image_x: 0,
                    image_y: 0,
                }

                for(let i=0; i<DIR_WEST+1; i++) {
                    rule.sides.push(new Map());
                }

                if (gid !== 0) {
                    let tsi = 0;
                    while (gid > level.tilesets[tsi].firstgid + level.tilesets[tsi].tilecount - 1) tsi++;
                    const tileset = level.tilesets[tsi];
                    const si = gid - tileset.firstgid;

                    rule.tileset_idx = tsi;
                    rule.image_x = (si % tileset.columns) * tileset.tilewidth;
                    rule.image_y = Math.floor(si / tileset.columns) * tileset.tileheight;
                }
                rule_index = wfc.rules.length;
                wfc.rules.push(rule);
                rules_map.set(gid, rule_index);
            }

            let rule = wfc.rules[rule_index];

            const col = index % layer.width;
            const row = Math.floor(index / layer.width);

            for (let dir = 0; dir < neig_offsets.length; dir++) {
                const offset = neig_offsets[dir];
                const ncol = col + offset.col;
                const nrow = row + offset.row;

                if (ncol < 0 || ncol >= layer.width || nrow < 0 || nrow >= layer.height) continue;

                const nindex = nrow * layer.width + ncol;
                const ngid = layer.data[nindex];

                let count = rule.sides[dir].get(ngid);
                if(count === undefined) {
                    count = 0;
                }

                rule.sides[dir].set(ngid, count + 1);
            }

            index++;
        }
    }

    // add totals


    console.log(JSON.stringify(wfc, map_replacer, 2));
    return wfc;
}


function map_replacer(key, value) {
    if (value instanceof Map) {
        return Object.fromEntries(value);
    }
    return value;
}
