"use strict";


const MAP_URL = "tileset1/map4.json";
const DEFAULT_SPLIT = 0.5;
const SPLIT_MIN = 0.1;
const SPLIT_MAX = 0.9;

const editor = {
    conf: {
        split: DEFAULT_SPLIT,
    },
    context: null,
    wfc: null
}

window.addEventListener("load", (e) => {editor_init(editor, MAP_URL)});


async function editor_init(editor, url) {

    const canvas = document.querySelector(".editor-content .pane-left canvas");
    editor.context = canvas.getContext("2d");

    conf_load("editor-conf", editor.conf);
    const gutter = document.querySelector(".gutter");
    const pane_left = document.querySelector(".pane-left");
    const content = document.querySelector(".editor-content");
    init_split(editor, gutter, pane_left, content);

    const level = await fetch_level(url);
    resize_canvas(editor.context, level);
    draw_level(editor.context, level);
    editor.wfc = generate_rules(level, url);
    editor_update(editor.wfc);

    document.querySelector("#download-rules").addEventListener("click", () => {
        download_rules(editor.wfc);
    });
}


function map_replacer(key, value) {

    if(value instanceof Map) {
        return Object.fromEntries(value);
    }
    return value;
}


function download_rules(wfc) {

    const json = JSON.stringify(wfc, map_replacer, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "wfc_rules.json";
    a.click();

    URL.revokeObjectURL(url);
}


function conf_load(key, conf) {

    const data = localStorage.getItem("editor-conf");
    if(data !== null) {
        const conf_loaded = JSON.parse(data);
        conf.split = conf_loaded.split;
    }
}


function conf_save(key, conf) {

    try {
        const data = JSON.stringify(conf);
        localStorage.setItem(key, data);
    }
    catch (error) {
        console.error(error.message);
    }
}


function init_split(editor, gutter, pane_left, content) {

    const ratio = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, editor.conf.split));
    pane_left.style.flexBasis = `${ratio * 100}%`;

    let dragging = false;

    gutter.addEventListener("mousedown", () => {
        dragging = true;
    });

    window.addEventListener("mousemove", (evt) => {
        if(!dragging) return;
        const rect = content.getBoundingClientRect();
        const new_ratio = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, (evt.clientX - rect.left) / rect.width));
        pane_left.style.flexBasis = `${new_ratio * 100}%`;
    });

    window.addEventListener("mouseup", () => {
        if(!dragging) return;
        dragging = false;
        editor.conf.split = parseFloat(pane_left.style.flexBasis) / 100;
        conf_save("editor-conf", editor.conf);
    });
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

    context.canvas.style.setProperty("width", `${px_width}px`);
    context.canvas.style.setProperty("height", `${px_height}px`);

    context.canvas.width = context.canvas.clientWidth;
    context.canvas.height = context.canvas.clientHeight;
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

    const DIR_NORTH = 0
    const DIR_EAST  = 1
    const DIR_SOUTH = 2
    const DIR_WEST  = 3

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


    // console.log(JSON.stringify(wfc, map_replacer, 2));
    return wfc;
}

function render_side_thumbnails(wfc, rule_by_id, rule, dir, thumb_scale) {

    let html = "";
    for(const [ngid] of rule.sides[dir]) {
        const nrule = rule_by_id.get(ngid);
        const tileset = wfc.tilesets[nrule.tileset_idx];
        const bg = nrule.id !== 0
            ? `background-image:url('${tileset.image_data.src}');background-size:${tileset.imagewidth * thumb_scale}px ${tileset.imageheight * thumb_scale}px;background-position:-${nrule.image_x * thumb_scale}px -${nrule.image_y * thumb_scale}px;`
            : "";
        html += `<div class="tile-thumb" style="width:${tileset.tilewidth * thumb_scale}px;height:${tileset.tileheight * thumb_scale}px;${bg}"></div>`;
    }
    return html;
}


function editor_update(wfc) {

    const rule_by_id = new Map(wfc.rules.map(rule => [rule.id, rule]));

    let html = "";
    let idx = 0;
    const thumb_scale = 2;

    for(const rule of wfc.rules) {
        const tileset = wfc.tilesets[rule.tileset_idx];
        const bg = rule.id !== 0
                ? `background-image:url('${tileset.image_data.src}');background-size:${tileset.imagewidth * thumb_scale}px ${tileset.imageheight * thumb_scale}px;background-position:-${rule.image_x * thumb_scale}px -${rule.image_y * thumb_scale}px;`
            : "";
        const thumb_w = tileset.tilewidth * thumb_scale;
        const thumb_h = tileset.tileheight * thumb_scale;
        html += `<div>
            <div class="grid" style="--thumb-w:${thumb_w}px;--thumb-h:${thumb_h}px;">
                <div class="gid">${rule.id}</div>
                <div class="thumb" style="width:${thumb_w}px;height:${thumb_h}px;${bg}"></div>
                <button class="dir-n active" data-rule-idx="${idx}" data-dir="0">N</button>
                <button class="dir-e" data-rule-idx="${idx}" data-dir="1">E</button>
                <button class="dir-s" data-rule-idx="${idx}" data-dir="2">S</button>
                <button class="dir-w" data-rule-idx="${idx}" data-dir="3">W</button>
            </div>
            <div class="side-content" data-rule-idx="${idx}">${render_side_thumbnails(wfc, rule_by_id, rule, 0, thumb_scale)}</div>
        </div>`;
        idx++;
    }

    const pane_right = document.querySelector(".editor-content .pane-right");
    pane_right.innerHTML = html;

    pane_right.onclick = (evt) => {
        const button = evt.target.closest("button[data-dir]");
        if(button === null) return;

        const rule = wfc.rules[parseInt(button.dataset.ruleIdx)];
        const dir = parseInt(button.dataset.dir);
        const side_content = pane_right.querySelector(`.side-content[data-rule-idx="${button.dataset.ruleIdx}"]`);
        side_content.innerHTML = render_side_thumbnails(wfc, rule_by_id, rule, dir, thumb_scale);

        button.closest(".grid").querySelector("button.active")?.classList.remove("active");
        button.classList.add("active");
    };
}