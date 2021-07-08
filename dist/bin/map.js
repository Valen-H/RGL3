#!/usr/bin/env node
/// <reference path="@types/command-line-args">
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mod = tslib_1.__importStar(require("../lib/rgl"));
const path = tslib_1.__importStar(require("path"));
const util = tslib_1.__importStar(require("util"));
const os = tslib_1.__importStar(require("os"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
let qtcn = false, Rgl, map, gout, cur = [0, 0], prev = [0, 0];
function help() {
    return `Commands:
	h				-	Display this help screen
	d				-	Display Map
	c				-	Clear Screen
	s				-	Save Map
	l				-	Load Map
	r				-	Resize Map (Very Important to do first!!)
	t				-	Trim leftovers after resize
	ev[cd			-	Evaluate code
	m				-	Set/Get Metadata
	mv			   -	Move Cursor (can also use keyboard arrows!)
	ctrl+arrows	  -	Move Line
	fn+arrows		-	Move Fast
	ctrl+fn+arrows   -	Move Fast
	d[cr]			-	Delete Column/Row and resize
	[ch,1,2,3		-	Place Chunk
	ctrl-C/qt		-	Quit
	
	X|N			  -	Command repetition ($ becomes . after repetition)

* Separate Commands with '.' (dot).
* Pass parameters with X[arg,...
* Hit ENTER to execute (or alt-enter to persist).
* Access command history with shift+up/down, move input cursor with shift+up/down and autocomplete with TAB.
* Use \\ to escape dots and other specials.`;
} //help
function move(x = cur[0], y = cur[1]) {
    let t;
    if (t = map.get(...prev))
        t.onrender = (_idx, c) => c.chr ? c.print : ' ';
    if (t = map.get(...cur))
        t.onrender = (_idx, c) => c.chr ? c.print : ' ';
    [prev[0], prev[1]] = cur;
    cur[0] = x % (map.dimens[0] || 1);
    while (cur[0] < 0)
        cur[0] += map.dimens[0];
    cur[1] = y % (map.dimens[1] || 1);
    while (cur[1] < 0)
        cur[1] += map.dimens[1];
    if (cur[0] + map.scroll[0] < 0)
        map.scroll[0] -= cur[0] + map.scroll[0];
    else if (cur[0] + map.scroll[0] >= map.parent.sout.columns)
        map.scroll[0] -= cur[0] + map.scroll[0] - map.parent.sout.columns + 1;
    if (cur[1] + map.scroll[1] < 0)
        map.scroll[1] -= cur[1] + map.scroll[1];
    else if (cur[1] + map.scroll[1] >= map.parent.sout.rows)
        map.scroll[1] -= cur[1] + map.scroll[1] - map.parent.sout.rows + 1;
    if (t = map.get(...cur))
        t.onrender = (_idx, _c) => chalk_1.default.inverse.italic.bold.italic('@');
    return cur;
} //move
function moveBy(dx = 0, dy = 0) {
    return move(cur[0] + dx, cur[1] + dy);
} //moveBy
async function render(after = "") {
    await command(`c${after ? ('.' + after) : ''}`);
    await map.stamp();
} //render
function pad(n = map.dimens[0] * map.dimens[1], wild = false) {
    let t = 0, pd = 0;
    while (map.chunks.length < n) {
        const p = mod.rglm.RGLM.RGLMChunk.blank();
        map.chunks.push(p);
        pd++;
        p.onrender = (_idx, c) => c.chr ? c.print : ' ';
    }
    while (n < map.chunks.length) {
        if (wild || !map.chunks[map.chunks.length - 1].chr) {
            map.chunks.pop();
            t++;
        }
        else
            break;
    }
    return command("d").then(() => Rgl.writeE(chalk_1.default.dim `Padded ${pd}, Trimmed ${t}`));
} //pad
function patch() {
    map.chunks.forEach((c) => c.onrender = (_idx, c) => c.chr ? c.print : ' ');
    return moveBy();
} //patch
function quit() {
    if (!qtcn) {
        Rgl.clear(-1);
        Rgl.move(0).then(() => Rgl.writeE("Press Quit again."));
        qtcn = true;
        setTimeout(() => (qtcn = false), 2000);
    }
    else {
        Rgl.writeE("Quit.");
        process.exit(1);
    }
} //quit
async function command(acc) {
    let comm = acc.replaceAll(/(?<=(?:(?:(?<!\\)\.)|^))(.+?)(?<!\\)\|(\d+)/gmis, (m, p1, p2, off, str) => (p1 + '.').repeat(Number(p2 || 1))).replaceAll(/(?<!\\)\$/gmis, '.').split(/(?<!\\)\./gmis).map(c => c.replaceAll(/(?<!\\)\\/gmi, '').replaceAll("\\\\", "\\"));
    for (const com of comm) {
        const args = (com.match(/\[(.*)$/mis) || [])[1], noarg = com.replace(/\[.*$/mis, "");
        if (/^h(?:elp)?/is.test(com))
            Rgl.writeE(help());
        else if (/^d(?:is(?:p(?:l(?:ay)?)?)?)?(?:\[|$)/is.test(com))
            await render(args);
        else if (/^c(?:l(?:(?:ea)?[rn])?)?(?:\[|$)/is.test(com))
            await Rgl.clear();
        else if (/^e(?:v(?:a?l(?:uate)?)?)?(?:\[|$)/is.test(com)) {
            Rgl.writeE(util.inspect(await eval(args ?? "")));
        }
        else if (/^(?:q(?:(?:ui)?t)?|e(?:(?:xi)?t)?)(?:\[|$)/is.test(com))
            quit();
        else if (/^s(?:ave?|to?re?)?(?:\[|$)/is.test(com)) {
            await map.store(args);
            Rgl.writeE(`Map saved: ${path.resolve(args || map._loadedFrom)}`);
        }
        else if (/^(?:re?)?l(?:(?:oa)?d)?(?:\[|$)/is.test(com)) {
            map = await mod.rglm.RGLM.RGLMap.parse(args || gout, Rgl);
            patch();
            await command("d.r.m");
            Rgl.writeE(`Map loaded: ${path.resolve(args || gout)}`);
        }
        else if (/^re?(?:s(?:i?ze?)?)?(?:\[|$)/is.test(com)) {
            if (args) {
                const s = args.split(',').map(Number);
                map.dimens[0] = Math.max(typeof s[0] == "number" ? s[0] : map.dimens[0], 0);
                map.dimens[1] = Math.max(typeof s[1] == "number" ? s[1] : map.dimens[1], 0);
                await pad();
            }
            moveBy();
            Rgl.writeE(`Size: ${map.dimens.join(", ")}\tCursor: ${cur.join(", ")}`);
        }
        else if (/^t(?:ri?m)?(?:\[|$)/is.test(com)) {
            const s = args ? Number(args) : (map.dimens[0] * map.dimens[1]);
            await pad(s, true);
        }
        else if (/^m(?:eta?(?:da?ta?)?)?(?:\[|$)/is.test(com)) {
            const s = (args ?? "").split('=');
            if (s.length >= 2) {
                map.meta[s[0]] = s[1] ?? "";
                command(`meta[${s[0]}`);
            }
            else if (s.length && s[0])
                Rgl.writeE(s[0], " = ", map.meta[s[0]] ?? "");
            else
                Rgl.writeE(Array.from(Object.entries(map.meta || {}).map(e => "- " + e.join(" = "))).join(os.EOL));
        }
        else if (/^m(?:ove?|v)?(?:\[|$)/is.test(com)) {
            move(...(args ?? "0,0").split(',').map(Number));
            command("d.r");
        }
        else if (/^m(?:ove?|v)?up?(?:\[|$)/is.test(com)) {
            let by = -1;
            if (args)
                by = -Number(args);
            let t = by + cur[1];
            while (t < 0)
                t += map.dimens[1];
            t = t % map.dimens[1];
            if (t != cur[1])
                for (let x = 0; x < map.dimens[0]; x++)
                    map.swap(map.get(x, cur[1]), map.get(x, t));
            moveBy(0, by);
            command("d");
        }
        else if (/^m(?:ove?|v)?d(?:o?wn)?(?:\[|$)/is.test(com)) {
            let by = 1;
            if (args)
                by = Number(args);
            let t = by + cur[1];
            while (t < 0)
                t += map.dimens[1];
            t = t % map.dimens[1];
            if (t != cur[1])
                for (let x = 0; x < map.dimens[0]; x++)
                    map.swap(map.get(x, cur[1]), map.get(x, t));
            moveBy(0, by);
            command("d");
        }
        else if (/^m(?:ove?|v)?r(?:i?gh?t)?(?:\[|$)/is.test(com)) {
            let by = 1;
            if (args)
                by = Number(args);
            let t = by + cur[0];
            while (t < 0)
                t += map.dimens[0];
            t = t % map.dimens[0];
            if (t != cur[0])
                for (let y = 0; y < map.dimens[1]; y++)
                    map.swap(map.get(cur[0], y), map.get(t, y));
            moveBy(by);
            command("d");
        }
        else if (/^m(?:ove?|v)?l(?:e?ft)?(?:\[|$)/is.test(com)) {
            let by = -1;
            if (args)
                by = -Number(args);
            let t = by + cur[0];
            while (t < 0)
                t += map.dimens[0];
            t = t % map.dimens[0];
            if (t != cur[0])
                for (let y = 0; y < map.dimens[1]; y++)
                    map.swap(map.get(cur[0], y), map.get(t, y));
            moveBy(by);
            command("d");
        }
        else if (/^d(?:e?l(?:e?te?))?r(?:o?w)?(?:\[|$)/is.test(com)) {
            moveBy();
            map.place([], 0, cur[1], map.dimens[0]);
            moveBy();
            await command("d");
            await command(`r[${map.dimens[0]},${Math.max(map.dimens[1] - 1, 0)}`);
            if (Number(args ?? 0) > 1)
                await command("dr[" + (Number(args) - 1));
        }
        else if (/^d(?:e?l(?:e?te?))?c(?:o?l(?:u?mn)?)?(?:\[|$)/is.test(com)) {
            let dellist = [];
            for (let i = 0; i < map.dimens[1]; i++) {
                const t = map.get(cur[0], i);
                if (!t)
                    continue;
                t.onrender = (_idx, c) => c.print;
                dellist.push(t);
            }
            moveBy();
            dellist.forEach(d => map.place([], ...map.calcChkCrd(d)));
            moveBy();
            await command("d");
            await command(`r[${Math.max(map.dimens[0] - 1, 0)},${map.dimens[1]}`);
            if (Number(args ?? 0) > 1)
                await command("dc[" + (Number(args) - 1));
        }
        else if (/^de?l(?:ete)?(?:\[|$)/is.test(com)) {
            const cr = (args ? args.split(',').map(Number) : cur);
            moveBy();
            map.place([], ...cr);
            pad();
            moveBy();
        }
        else if (/^b(?:l(?:an)?k)?r(?:o?w)?(?:\[|$)/is.test(com)) {
            let c = [];
            for (let i = 0; i < map.dimens[0]; i++)
                c.push(mod.rglm.RGLM.RGLMChunk.blank());
            map.place(c, 0, cur[1], 0);
            await command(`r[${map.dimens[0]},${map.dimens[1] + 1}`);
            patch();
            await command("d");
            if (Number(args ?? 0) > 1)
                await command("br[" + (Number(args) - 1));
        }
        else if (/^b(?:l(?:an)?k)?c(?:o?l(?:u?mn)?)?(?:\[|$)/is.test(com)) {
            await command(`r[${map.dimens[0] + 1},${map.dimens[1]}`);
            for (let i = 0; i < map.dimens[1]; i++)
                map.place([mod.rglm.RGLM.RGLMChunk.blank()], cur[0], i, 0);
            patch();
            await command("d");
            if (Number(args ?? 0) > 1)
                await command("bc[" + (Number(args) - 1));
        }
        else if (/^b(?:l(?:an)?k)?(?:\[|$)/is.test(com)) {
            const cr = (args ? args.split(',').map(Number) : cur);
            map.place([mod.rglm.RGLM.RGLMChunk.blank()], ...cr, 0);
            patch();
            await command("d");
        }
        else if (/^sw(?:a?p)?(?:\[|$)/is.test(com)) {
            if (args) {
                const cr = (args ? args.split(',').map(Number) : cur);
                map.swap(map.get(...cur), map.get(...cr));
                patch();
                moveBy();
            }
            command("d");
        }
        else if (/^s(?:hi?ft?)?r(?:o?w)?(?:\[|$)/is.test(com)) {
            let arg = Number(args ?? 1), a = 0;
            while (arg < 0)
                arg += map.dimens[0];
            while (arg > 0) {
                const t = map.chunks.splice(map.calcChkIdx(map.dimens[0] - 1, cur[1]), 1)[0];
                map.chunks.splice(map.calcChkIdx(0, cur[1]), 0, t);
                arg--;
                a++;
            }
            patch();
            moveBy(a);
            await command("d");
        }
        else if (/^s(?:hi?ft?)?c(?:o?l(?:u?mn)?)?(?:\[|$)/is.test(com)) {
            let arg = Number(args ?? 1), a = 0;
            while (arg < 0)
                arg += map.dimens[1];
            while (arg > 0) {
                let t = null;
                for (let i = 0; i < map.dimens[1]; i++) {
                    if (t)
                        t = map.place([t], cur[0], i, 1)[0];
                    else {
                        const b = mod.rglm.RGLM.RGLMChunk.blank();
                        b.onrender = (_idx, c) => c.print || ' ';
                        t = map.place([b], cur[0], i, 1)[0];
                    }
                }
                if (t)
                    map.place([t], cur[0], 0, 1);
                arg--;
                a++;
            }
            patch();
            moveBy(0, a);
            await command("d");
        }
        else if (!noarg && args) {
            let c = mod.rglm.RGLM.RGLMChunk.blank();
            const s = args.split(',');
            c.chr = s[0].toString().charAt(0) ?? '';
            c.fg = Math.max(Math.min(Number(s[1] ?? 0xff), 0xff), 0);
            c.bg = Math.max(Math.min(Number(s[2] ?? 0xff), 0xff), 0);
            c.st = Math.max(Math.min(Number(s[3] ?? 0xff), 0xff), 0);
            c.cust = Math.max(Math.min(Number(s[4] ?? 0xff), 0xff), 0);
            map.place([c], ...cur);
            moveBy(1);
            await command("d.r");
        }
    }
} //command
async function inp(acc, acidx) {
    await Rgl.clear(-1);
    await Rgl.move(0);
    Rgl.write(acc);
    await Rgl.move(acidx);
} //inp
module.exports = async function Map(out, args) {
    const mpg = args.map.mappings || args.map.map;
    try {
        Rgl = await mod.rgl.RGL.load();
        if (mpg)
            Rgl.parseMappings(mpg);
    }
    catch (e) {
        Rgl = await mod.rgl.RGL.load({
            name: path.basename(out || "map.rglm"),
            main: "main.js",
            description: "rgl map",
            version: "0.1.0",
            keywords: ["map", "make", "rgl"],
            mappings: mpg || "mappings.js"
        });
    }
    Rgl.capture();
    await Rgl.clear();
    try {
        map = await mod.rglm.RGLM.RGLMap.parse(gout = out || `map${Math.round(Math.random() * 0xffffffff)}.rglm`, Rgl);
    }
    catch (e) {
        map = mod.rglm.RGLM.RGLMap.blank(Rgl);
        map.parent = Rgl;
        map._loadedFrom = gout = out || `map${Math.round(Math.random() * 0xffffffff)}.rglm`;
    }
    Rgl.writeE(`Loaded mappings: ${path.resolve(Rgl.cfg.mappings)}`);
    Rgl.writeE(`Writing: ${gout = path.resolve(gout)}`);
    Rgl.writeE(help());
    let acc = "", history = [], histidx = 0, acidx = 0;
    patch();
    moveBy();
    Rgl.on("rawkey", async (k) => {
        if (!mod.rgl.RGL.special_keys.ctrlC.compare(k))
            quit();
        else if (!mod.rgl.RGL.special_keys.enter.compare(k)) {
            if (!acc)
                return;
            await Rgl.clear(-1);
            await Rgl.move(0);
            await command(acc);
            history.push(acc);
            while (history.length > 100)
                history.shift();
            acc = "";
            acidx = histidx = 0;
        }
        else if (!mod.rgl.RGL.special_keys.altEnter.compare(k)) {
            if (!acc)
                return;
            await Rgl.move(0);
            await command(acc);
            history.push(acc);
            while (history.length > 100)
                history.shift();
            histidx = 0;
            await inp(acc, acidx);
        }
        else if (!mod.rgl.RGL.special_keys.tab.compare(k)) {
            const sug = history.filter((s) => s.toLowerCase().startsWith(acc.toLowerCase())).sort();
            if (sug.length > 1) {
                await Rgl.clear(-1);
                Rgl.move(0);
                Rgl.writeE(sug.join('\t'));
            }
            else if (sug.length == 1) {
                acc = sug[0];
                acidx = acc.length;
            }
            await inp(acc, acidx);
        }
        else if (!mod.rgl.RGL.special_keys.back.compare(k)) {
            acc = acc.slice(0, Math.max(acidx - 1, 0)) + acc.slice(acidx);
            await inp(acc, acidx = Math.max(acidx - 1, 0));
        }
        else if (!mod.rgl.RGL.special_keys.del.compare(k)) {
            acc = acc.slice(0, acidx) + acc.slice(acidx + 1);
            await inp(acc, acidx);
        }
        else if (!mod.rgl.RGL.special_keys.up.compare(k)) {
            moveBy(0, -1);
            await command("d");
            await inp(acc, acidx);
        }
        else if (!mod.rgl.RGL.special_keys.down.compare(k)) {
            moveBy(0, 1);
            await command("d");
            await inp(acc, acidx);
        }
        else if (!mod.rgl.RGL.special_keys.right.compare(k)) {
            moveBy(1, 0);
            await command("d");
            await inp(acc, acidx);
        }
        else if (!mod.rgl.RGL.special_keys.left.compare(k)) {
            moveBy(-1, 0);
            await command("d");
            await inp(acc, acidx);
        }
        else if (!(mod.rgl.RGL.special_keys.fnUp.compare(k) && mod.rgl.RGL.special_keys.fnLeft.compare(k))) {
            await inp(acc, acidx = 0);
        }
        else if (!(mod.rgl.RGL.special_keys.fnDown.compare(k) && mod.rgl.RGL.special_keys.fnRight.compare(k))) {
            await inp(acc, acidx = acc.length);
        }
        else if (!mod.rgl.RGL.special_keys.shiftUp.compare(k)) {
            histidx = histidx <= history.length ? (histidx + 1) : histidx;
            acc = history[history.length - histidx] ?? acc;
            await inp(acc, acidx = acc.length);
        }
        else if (!mod.rgl.RGL.special_keys.shiftDown.compare(k)) {
            histidx = histidx > 0 ? (histidx - 1) : histidx;
            acc = history[history.length - histidx] ?? acc;
            await inp(acc, acidx = acc.length);
        }
        else if (!mod.rgl.RGL.special_keys.shiftRight.compare(k)) {
            await inp(acc, acidx = Math.min(acidx + 1, acc.length));
        }
        else if (!mod.rgl.RGL.special_keys.shiftLeft.compare(k)) {
            await inp(acc, acidx = Math.max(acidx - 1, 0));
        }
        else if (!mod.rgl.RGL.special_keys.ctrlFnUp.compare(k)) {
            move(cur[0], 0);
            command("d");
        }
        else if (!mod.rgl.RGL.special_keys.ctrlFnDown.compare(k)) {
            move(cur[0], map.dimens[1] - 1);
            command("d");
        }
        else if (!mod.rgl.RGL.special_keys.ctrlFnRight.compare(k)) {
            move(map.dimens[0] - 1, cur[1]);
            command("d");
        }
        else if (!mod.rgl.RGL.special_keys.ctrlFnLeft.compare(k)) {
            move(0, cur[1]);
            command("d");
        }
        else if (!mod.rgl.RGL.special_keys.ctrlUp.compare(k)) {
            command("mu");
        }
        else if (!mod.rgl.RGL.special_keys.ctrlDown.compare(k)) {
            command("md");
        }
        else if (!mod.rgl.RGL.special_keys.ctrlRight.compare(k)) {
            command("mr");
        }
        else if (!mod.rgl.RGL.special_keys.ctrlLeft.compare(k)) {
            command("ml");
        }
        else if (!mod.rgl.RGL.special_keys.ctrlShiftUp.compare(k)) {
            command("sc[-1");
        }
        else if (!mod.rgl.RGL.special_keys.ctrlShiftDown.compare(k)) {
            command("sc");
        }
        else if (!mod.rgl.RGL.special_keys.ctrlShiftRight.compare(k)) {
            command("sr");
        }
        else if (!mod.rgl.RGL.special_keys.ctrlShiftLeft.compare(k)) {
            command("sr[-1");
        }
        else {
            let s = k.toString("utf8");
            acc = acc.slice(0, acidx) + s + acc.slice(acidx);
            await inp(acc, ++acidx);
        }
    });
}; //map
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYmluL21hcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0EsK0NBQStDO0FBRS9DLFlBQVksQ0FBQzs7O0FBRWIsd0RBQWtDO0FBQ2xDLG1EQUE2QjtBQUM3QixtREFBNkI7QUFDN0IsK0NBQXlCO0FBQ3pCLDBEQUEwQjtBQUcxQixJQUFJLElBQUksR0FBWSxLQUFLLEVBQ3hCLEdBQWdCLEVBQ2hCLEdBQXlCLEVBQ3pCLElBQVksRUFDWixHQUFHLEdBQXFCLENBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBRSxFQUNoQyxJQUFJLEdBQXFCLENBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBRSxDQUFDO0FBRW5DLFNBQVMsSUFBSTtJQUNaLE9BQU87Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs0Q0F3Qm9DLENBQUM7QUFDN0MsQ0FBQyxDQUFDLE1BQU07QUFFUixTQUFTLElBQUksQ0FBQyxJQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDbkQsSUFBSSxDQUEwQixDQUFDO0lBQy9CLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7UUFBRSxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsSUFBWSxFQUFFLENBQTBCLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztJQUMzRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQVksRUFBRSxDQUEwQixFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7SUFFMUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBRXpCLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUUzQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNsQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFM0MsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU87UUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7SUFDbEksSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNuRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUk7UUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7SUFFNUgsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBMkIsRUFBRSxFQUFFLENBQUMsZUFBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUUzSCxPQUFPLEdBQUcsQ0FBQztBQUNaLENBQUMsQ0FBQyxNQUFNO0FBQ1IsU0FBUyxNQUFNLENBQUMsS0FBYSxDQUFDLEVBQUUsS0FBYSxDQUFDO0lBQzdDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxRQUFRO0FBRVYsS0FBSyxVQUFVLE1BQU0sQ0FBQyxRQUFnQixFQUFFO0lBQ3ZDLE1BQU0sT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNoRCxNQUFNLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNuQixDQUFDLENBQUMsUUFBUTtBQUVWLFNBQVMsR0FBRyxDQUFDLElBQVksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQWdCLEtBQUs7SUFDNUUsSUFBSSxDQUFDLEdBQVcsQ0FBQyxFQUFFLEVBQUUsR0FBVyxDQUFDLENBQUM7SUFFbEMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDN0IsTUFBTSxDQUFDLEdBQTRCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVuRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixFQUFFLEVBQUUsQ0FBQztRQUNMLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFZLEVBQUUsQ0FBMEIsRUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0tBQ3pGO0lBRUQsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7UUFDN0IsSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRTtZQUNuRCxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2pCLENBQUMsRUFBRSxDQUFDO1NBQ0o7O1lBQU0sTUFBTTtLQUNiO0lBRUQsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBSyxDQUFDLEdBQUcsQ0FBQSxVQUFVLEVBQUUsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDbkYsQ0FBQyxDQUFDLEtBQUs7QUFDUCxTQUFTLEtBQUs7SUFDYixHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQTBCLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFZLEVBQUUsQ0FBMEIsRUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFN0ksT0FBTyxNQUFNLEVBQUUsQ0FBQztBQUNqQixDQUFDLENBQUMsT0FBTztBQUVULFNBQVMsSUFBSTtJQUNaLElBQUksQ0FBQyxJQUFJLEVBQUU7UUFDVixHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZCxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztRQUN4RCxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ1osVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQ3ZDO1NBQU07UUFDTixHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDaEI7QUFDRixDQUFDLENBQUMsTUFBTTtBQUVSLEtBQUssVUFBVSxPQUFPLENBQUMsR0FBVztJQUNqQyxJQUFJLElBQUksR0FBYSxHQUFHLENBQUMsVUFBVSxDQUFDLGlEQUFpRCxFQUFFLENBQUMsQ0FBUyxFQUFFLEVBQVUsRUFBRSxFQUFVLEVBQUUsR0FBVyxFQUFFLEdBQVcsRUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUVoVSxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRTtRQUN2QixNQUFNLElBQUksR0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ3hELEtBQUssR0FBVyxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUU1QyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2FBQzVDLElBQUksd0NBQXdDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUFFLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQzNFLElBQUksb0NBQW9DLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUFFLE1BQU0sR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDO2FBQ3RFLElBQUkscUNBQXFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3pELEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2pEO2FBQU0sSUFBSSw4Q0FBOEMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQUUsSUFBSSxFQUFFLENBQUM7YUFDdkUsSUFBSSw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDbEQsTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RCLEdBQUcsQ0FBQyxNQUFNLENBQUMsY0FBYyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ2xFO2FBQU0sSUFBSSxtQ0FBbUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDekQsR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzFELEtBQUssRUFBRSxDQUFDO1lBQ1IsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdkIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxlQUFlLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUN4RDthQUFNLElBQUksZ0NBQWdDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3RELElBQUksSUFBSSxFQUFFO2dCQUNULE1BQU0sQ0FBQyxHQUFhLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUVoRCxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzVFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFNUUsTUFBTSxHQUFHLEVBQUUsQ0FBQzthQUNaO1lBRUQsTUFBTSxFQUFFLENBQUM7WUFFVCxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDeEU7YUFBTSxJQUFJLHVCQUF1QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUM3QyxNQUFNLENBQUMsR0FBVyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV4RSxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDbkI7YUFBTSxJQUFJLGtDQUFrQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN4RCxNQUFNLENBQUMsR0FBcUIsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBcUIsQ0FBQztZQUV4RSxJQUFJLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO2dCQUNsQixHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzVCLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDeEI7aUJBQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7O2dCQUN0RSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDeEc7YUFBTSxJQUFJLHlCQUF5QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUMvQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDaEQsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ2Y7YUFBTSxJQUFJLDRCQUE0QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNsRCxJQUFJLEVBQUUsR0FBVyxDQUFDLENBQUMsQ0FBQztZQUVwQixJQUFJLElBQUk7Z0JBQUUsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTdCLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQztnQkFBRSxDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFdEIsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDZCxLQUFLLElBQUksQ0FBQyxHQUFXLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7b0JBQzdDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU5QyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2I7YUFBTSxJQUFJLG1DQUFtQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN6RCxJQUFJLEVBQUUsR0FBVyxDQUFDLENBQUM7WUFFbkIsSUFBSSxJQUFJO2dCQUFFLEVBQUUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFNUIsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVwQixPQUFPLENBQUMsR0FBRyxDQUFDO2dCQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV0QixJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNkLEtBQUssSUFBSSxDQUFDLEdBQVcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtvQkFDN0MsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTlDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDZCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDYjthQUFNLElBQUkscUNBQXFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzNELElBQUksRUFBRSxHQUFXLENBQUMsQ0FBQztZQUVuQixJQUFJLElBQUk7Z0JBQUUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUU1QixJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXBCLE9BQU8sQ0FBQyxHQUFHLENBQUM7Z0JBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakMsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXRCLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2QsS0FBSyxJQUFJLENBQUMsR0FBVyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO29CQUM3QyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFOUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2I7YUFBTSxJQUFJLG1DQUFtQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN6RCxJQUFJLEVBQUUsR0FBVyxDQUFDLENBQUMsQ0FBQztZQUVwQixJQUFJLElBQUk7Z0JBQUUsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTdCLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQztnQkFBRSxDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFdEIsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDZCxLQUFLLElBQUksQ0FBQyxHQUFXLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7b0JBQzdDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU5QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDYjthQUFNLElBQUksd0NBQXdDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzlELE1BQU0sRUFBRSxDQUFDO1lBQ1QsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEMsTUFBTSxFQUFFLENBQUM7WUFDVCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuQixNQUFNLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdEUsSUFBSSxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQUUsTUFBTSxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDckU7YUFBTSxJQUFJLGlEQUFpRCxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN2RSxJQUFJLE9BQU8sR0FBOEIsRUFBRyxDQUFDO1lBRTdDLEtBQUssSUFBSSxDQUFDLEdBQVcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUMvQyxNQUFNLENBQUMsR0FBNEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRXRELElBQUksQ0FBQyxDQUFDO29CQUFFLFNBQVM7Z0JBRWpCLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFZLEVBQUUsQ0FBMEIsRUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztnQkFDM0UsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNoQjtZQUVELE1BQU0sRUFBRSxDQUFDO1lBQ1QsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUQsTUFBTSxFQUFFLENBQUM7WUFFVCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuQixNQUFNLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdEUsSUFBSSxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQUUsTUFBTSxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDckU7YUFBTSxJQUFJLHlCQUF5QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUMvQyxNQUFNLEVBQUUsR0FBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQXFCLENBQUM7WUFFNUYsTUFBTSxFQUFFLENBQUM7WUFDVCxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQ3JCLEdBQUcsRUFBRSxDQUFDO1lBQ04sTUFBTSxFQUFFLENBQUM7U0FDVDthQUFNLElBQUkscUNBQXFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzNELElBQUksQ0FBQyxHQUE4QixFQUFHLENBQUM7WUFFdkMsS0FBSyxJQUFJLENBQUMsR0FBVyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFFeEYsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMzQixNQUFNLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3pELEtBQUssRUFBRSxDQUFDO1lBQ1IsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkIsSUFBSSxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQUUsTUFBTSxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDckU7YUFBTSxJQUFJLDhDQUE4QyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNwRSxNQUFNLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRXpELEtBQUssSUFBSSxDQUFDLEdBQVcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDN0MsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFNUQsS0FBSyxFQUFFLENBQUM7WUFDUixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuQixJQUFJLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQztnQkFBRSxNQUFNLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNyRTthQUFNLElBQUksNEJBQTRCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ2xELE1BQU0sRUFBRSxHQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBcUIsQ0FBQztZQUU1RixHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFdkQsS0FBSyxFQUFFLENBQUM7WUFDUixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNuQjthQUFNLElBQUksdUJBQXVCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzdDLElBQUksSUFBSSxFQUFFO2dCQUNULE1BQU0sRUFBRSxHQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBcUIsQ0FBQztnQkFFNUYsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFDLEtBQUssRUFBRSxDQUFDO2dCQUNSLE1BQU0sRUFBRSxDQUFDO2FBQ1Q7WUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDYjthQUFNLElBQUksa0NBQWtDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3hELElBQUksR0FBRyxHQUFXLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFXLENBQUMsQ0FBQztZQUVuRCxPQUFPLEdBQUcsR0FBRyxDQUFDO2dCQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXJDLE9BQU8sR0FBRyxHQUFHLENBQUMsRUFBRTtnQkFDZixNQUFNLENBQUMsR0FBNEIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdEcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxHQUFHLEVBQUUsQ0FBQztnQkFDTixDQUFDLEVBQUUsQ0FBQzthQUNKO1lBRUQsS0FBSyxFQUFFLENBQUM7WUFDUixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDVixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNuQjthQUFNLElBQUksMkNBQTJDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ2pFLElBQUksR0FBRyxHQUFXLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFXLENBQUMsQ0FBQztZQUVuRCxPQUFPLEdBQUcsR0FBRyxDQUFDO2dCQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXJDLE9BQU8sR0FBRyxHQUFHLENBQUMsRUFBRTtnQkFDZixJQUFJLENBQUMsR0FBMEMsSUFBSSxDQUFDO2dCQUVwRCxLQUFLLElBQUksQ0FBQyxHQUFXLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtvQkFDL0MsSUFBSSxDQUFDO3dCQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt5QkFDdEM7d0JBQ0osTUFBTSxDQUFDLEdBQTRCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFDbkUsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQVksRUFBRSxDQUEwQixFQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQzt3QkFFbEYsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUNwQztpQkFDRDtnQkFFRCxJQUFJLENBQUM7b0JBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRXBDLEdBQUcsRUFBRSxDQUFDO2dCQUNOLENBQUMsRUFBRSxDQUFDO2FBQ0o7WUFFRCxLQUFLLEVBQUUsQ0FBQztZQUNSLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDYixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNuQjthQUFNLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxFQUFFO1lBQzFCLElBQUksQ0FBQyxHQUE0QixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7WUFFakUsTUFBTSxDQUFDLEdBQTZDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUE2QyxDQUFDO1lBRWhILENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDeEMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN6RCxDQUFDLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3pELENBQUMsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDekQsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUUzRCxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQztZQUN2QixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDVixNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNyQjtLQUNEO0FBQ0YsQ0FBQyxDQUFDLFNBQVM7QUFFWCxLQUFLLFVBQVUsR0FBRyxDQUFDLEdBQVcsRUFBRSxLQUFhO0lBQzVDLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2YsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxLQUFLO0FBRVAsTUFBTSxDQUFDLE9BQU8sR0FBRyxLQUFLLFVBQVUsR0FBRyxDQUFDLEdBQVcsRUFBRSxJQUF3QjtJQUN4RSxNQUFNLEdBQUcsR0FBVyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztJQUV0RCxJQUFJO1FBQ0gsR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFL0IsSUFBSSxHQUFHO1lBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUNoQztJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1gsR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQzVCLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsSUFBSSxVQUFVLENBQUM7WUFDdEMsSUFBSSxFQUFFLFNBQVM7WUFDZixXQUFXLEVBQUUsU0FBUztZQUN0QixPQUFPLEVBQUUsT0FBTztZQUNoQixRQUFRLEVBQUUsQ0FBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBRTtZQUNsQyxRQUFRLEVBQUUsR0FBRyxJQUFJLGFBQWE7U0FDOUIsQ0FBQyxDQUFDO0tBQ0g7SUFFRCxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDZCxNQUFNLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUVsQixJQUFJO1FBQ0gsR0FBRyxHQUFHLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsR0FBRyxJQUFJLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztLQUMvRztJQUFDLE9BQU0sQ0FBQyxFQUFFO1FBQ1YsR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdEMsR0FBRyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUM7UUFDakIsR0FBRyxDQUFDLFdBQVcsR0FBRyxJQUFJLEdBQUcsR0FBRyxJQUFJLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQztLQUNwRjtJQUVELEdBQUcsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbEUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNwRCxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFFbkIsSUFBSSxHQUFHLEdBQVcsRUFBRSxFQUNuQixPQUFPLEdBQWEsRUFBRSxFQUN0QixPQUFPLEdBQVcsQ0FBQyxFQUNuQixLQUFLLEdBQVcsQ0FBQyxDQUFDO0lBRW5CLEtBQUssRUFBRSxDQUFDO0lBQ1IsTUFBTSxFQUFFLENBQUM7SUFFVCxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBUyxFQUFFLEVBQUU7UUFDcEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUFFLElBQUksRUFBRSxDQUFDO2FBQ2xELElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNwRCxJQUFJLENBQUMsR0FBRztnQkFBRSxPQUFPO1lBRWpCLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVsQixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUVuQixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2xCLE9BQU8sT0FBTyxDQUFDLE1BQU0sR0FBRyxHQUFHO2dCQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUU3QyxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQ1QsS0FBSyxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUM7U0FDcEI7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDekQsSUFBSSxDQUFDLEdBQUc7Z0JBQUUsT0FBTztZQUVqQixNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbEIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFbkIsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNsQixPQUFPLE9BQU8sQ0FBQyxNQUFNLEdBQUcsR0FBRztnQkFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7WUFFN0MsT0FBTyxHQUFHLENBQUMsQ0FBQztZQUVaLE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUN0QjthQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNwRCxNQUFNLEdBQUcsR0FBYSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBUyxFQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFbkgsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDbkIsTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BCLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBRVosR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDM0I7aUJBQU0sSUFBSSxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtnQkFDM0IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDYixLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQzthQUNuQjtZQUVELE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUN0QjthQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNyRCxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUU5RCxNQUFNLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQy9DO2FBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3BELEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztZQUVqRCxNQUFNLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDdEI7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDbkQsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2QsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFbkIsTUFBTSxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3RCO2FBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3JELE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDYixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUVuQixNQUFNLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDdEI7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdEQsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNiLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRW5CLE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUN0QjthQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNyRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDZCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUVuQixNQUFNLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDdEI7YUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3JHLE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDMUI7YUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3hHLE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ25DO2FBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3hELE9BQU8sR0FBRyxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUU5RCxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDO1lBRS9DLE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ25DO2FBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzFELE9BQU8sR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBRWhELEdBQUcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUM7WUFFL0MsTUFBTSxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDbkM7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDM0QsTUFBTSxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7U0FDeEQ7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDMUQsTUFBTSxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMvQzthQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN6RCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNiO2FBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzNELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDYjthQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUM1RCxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2I7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDM0QsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoQixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDYjthQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN2RCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDZDthQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN6RCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDZDthQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMxRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDZDthQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN6RCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDZDthQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUM1RCxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDakI7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDOUQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2Q7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDL0QsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2Q7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDOUQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ2pCO2FBQU07WUFDTixJQUFJLENBQUMsR0FBVyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUVqRCxNQUFNLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUN4QjtJQUNGLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsS0FBSyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIkB0eXBlcy9jb21tYW5kLWxpbmUtYXJnc1wiPlxyXG5cclxuXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5pbXBvcnQgKiBhcyBtb2QgZnJvbSBcIi4uL2xpYi9yZ2xcIjtcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gXCJ1dGlsXCI7XHJcbmltcG9ydCAqIGFzIG9zIGZyb20gXCJvc1wiO1xyXG5pbXBvcnQgY2hhbGsgZnJvbSBcImNoYWxrXCI7XHJcbmltcG9ydCB7IENvbW1hbmRMaW5lT3B0aW9ucyB9IGZyb20gXCJjb21tYW5kLWxpbmUtYXJnc1wiO1xyXG5cclxubGV0IHF0Y246IGJvb2xlYW4gPSBmYWxzZSxcclxuXHRSZ2w6IG1vZC5yZ2wuUkdMLFxyXG5cdG1hcDogbW9kLnJnbG0uUkdMTS5SR0xNYXAsXHJcblx0Z291dDogc3RyaW5nLFxyXG5cdGN1cjogW251bWJlciwgbnVtYmVyXSA9IFsgMCwgMCBdLFxyXG5cdHByZXY6IFtudW1iZXIsIG51bWJlcl0gPSBbIDAsIDAgXTtcclxuXHJcbmZ1bmN0aW9uIGhlbHAoKTogc3RyaW5nIHtcclxuXHRyZXR1cm4gYENvbW1hbmRzOlxyXG5cdGhcdFx0XHRcdC1cdERpc3BsYXkgdGhpcyBoZWxwIHNjcmVlblxyXG5cdGRcdFx0XHRcdC1cdERpc3BsYXkgTWFwXHJcblx0Y1x0XHRcdFx0LVx0Q2xlYXIgU2NyZWVuXHJcblx0c1x0XHRcdFx0LVx0U2F2ZSBNYXBcclxuXHRsXHRcdFx0XHQtXHRMb2FkIE1hcFxyXG5cdHJcdFx0XHRcdC1cdFJlc2l6ZSBNYXAgKFZlcnkgSW1wb3J0YW50IHRvIGRvIGZpcnN0ISEpXHJcblx0dFx0XHRcdFx0LVx0VHJpbSBsZWZ0b3ZlcnMgYWZ0ZXIgcmVzaXplXHJcblx0ZXZbY2RcdFx0XHQtXHRFdmFsdWF0ZSBjb2RlXHJcblx0bVx0XHRcdFx0LVx0U2V0L0dldCBNZXRhZGF0YVxyXG5cdG12XHRcdFx0ICAgLVx0TW92ZSBDdXJzb3IgKGNhbiBhbHNvIHVzZSBrZXlib2FyZCBhcnJvd3MhKVxyXG5cdGN0cmwrYXJyb3dzXHQgIC1cdE1vdmUgTGluZVxyXG5cdGZuK2Fycm93c1x0XHQtXHRNb3ZlIEZhc3RcclxuXHRjdHJsK2ZuK2Fycm93cyAgIC1cdE1vdmUgRmFzdFxyXG5cdGRbY3JdXHRcdFx0LVx0RGVsZXRlIENvbHVtbi9Sb3cgYW5kIHJlc2l6ZVxyXG5cdFtjaCwxLDIsM1x0XHQtXHRQbGFjZSBDaHVua1xyXG5cdGN0cmwtQy9xdFx0XHQtXHRRdWl0XHJcblx0XHJcblx0WHxOXHRcdFx0ICAtXHRDb21tYW5kIHJlcGV0aXRpb24gKCQgYmVjb21lcyAuIGFmdGVyIHJlcGV0aXRpb24pXHJcblxyXG4qIFNlcGFyYXRlIENvbW1hbmRzIHdpdGggJy4nIChkb3QpLlxyXG4qIFBhc3MgcGFyYW1ldGVycyB3aXRoIFhbYXJnLC4uLlxyXG4qIEhpdCBFTlRFUiB0byBleGVjdXRlIChvciBhbHQtZW50ZXIgdG8gcGVyc2lzdCkuXHJcbiogQWNjZXNzIGNvbW1hbmQgaGlzdG9yeSB3aXRoIHNoaWZ0K3VwL2Rvd24sIG1vdmUgaW5wdXQgY3Vyc29yIHdpdGggc2hpZnQrdXAvZG93biBhbmQgYXV0b2NvbXBsZXRlIHdpdGggVEFCLlxyXG4qIFVzZSBcXFxcIHRvIGVzY2FwZSBkb3RzIGFuZCBvdGhlciBzcGVjaWFscy5gO1xyXG59IC8vaGVscFxyXG5cclxuZnVuY3Rpb24gbW92ZSh4OiBudW1iZXIgPSBjdXJbMF0sIHk6IG51bWJlciA9IGN1clsxXSkge1xyXG5cdGxldCB0OiBtb2QucmdsbS5SR0xNLlJHTE1DaHVuaztcclxuXHRpZiAodCA9IG1hcC5nZXQoLi4ucHJldikpIHQub25yZW5kZXIgPSAoX2lkeDogbnVtYmVyLCBjOiBtb2QucmdsbS5SR0xNLlJHTE1DaHVuaykgPT4gYy5jaHIgPyBjLnByaW50IDogJyAnO1xyXG5cdGlmICh0ID0gbWFwLmdldCguLi5jdXIpKSB0Lm9ucmVuZGVyID0gKF9pZHg6IG51bWJlciwgYzogbW9kLnJnbG0uUkdMTS5SR0xNQ2h1bmspID0+IGMuY2hyID8gYy5wcmludCA6ICcgJztcclxuXHRcclxuXHRbcHJldlswXSwgcHJldlsxXV0gPSBjdXI7XHJcblx0XHJcblx0Y3VyWzBdID0geCAlIChtYXAuZGltZW5zWzBdIHx8IDEpO1xyXG5cdHdoaWxlIChjdXJbMF0gPCAwKSBjdXJbMF0gKz0gbWFwLmRpbWVuc1swXTtcclxuXHRcclxuXHRjdXJbMV0gPSB5ICUgKG1hcC5kaW1lbnNbMV0gfHwgMSk7XHJcblx0d2hpbGUgKGN1clsxXSA8IDApIGN1clsxXSArPSBtYXAuZGltZW5zWzFdO1xyXG5cdFxyXG5cdGlmIChjdXJbMF0gKyBtYXAuc2Nyb2xsWzBdIDwgMCkgbWFwLnNjcm9sbFswXSAtPSBjdXJbMF0gKyBtYXAuc2Nyb2xsWzBdO1xyXG5cdGVsc2UgaWYgKGN1clswXSArIG1hcC5zY3JvbGxbMF0gPj0gbWFwLnBhcmVudC5zb3V0LmNvbHVtbnMpIG1hcC5zY3JvbGxbMF0gLT0gY3VyWzBdICsgbWFwLnNjcm9sbFswXSAtIG1hcC5wYXJlbnQuc291dC5jb2x1bW5zICsgMTtcclxuXHRpZiAoY3VyWzFdICsgbWFwLnNjcm9sbFsxXSA8IDApIG1hcC5zY3JvbGxbMV0gLT0gY3VyWzFdICsgbWFwLnNjcm9sbFsxXTtcclxuXHRlbHNlIGlmIChjdXJbMV0gKyBtYXAuc2Nyb2xsWzFdID49IG1hcC5wYXJlbnQuc291dC5yb3dzKSBtYXAuc2Nyb2xsWzFdIC09IGN1clsxXSArIG1hcC5zY3JvbGxbMV0gLSBtYXAucGFyZW50LnNvdXQucm93cyArIDE7XHJcblx0XHJcblx0aWYgKHQgPSBtYXAuZ2V0KC4uLmN1cikpIHQub25yZW5kZXIgPSAoX2lkeDogbnVtYmVyLCBfYzogbW9kLnJnbG0uUkdMTS5SR0xNQ2h1bmspID0+IGNoYWxrLmludmVyc2UuaXRhbGljLmJvbGQuaXRhbGljKCdAJyk7XHJcblx0XHJcblx0cmV0dXJuIGN1cjtcclxufSAvL21vdmVcclxuZnVuY3Rpb24gbW92ZUJ5KGR4OiBudW1iZXIgPSAwLCBkeTogbnVtYmVyID0gMCkge1xyXG5cdHJldHVybiBtb3ZlKGN1clswXSArIGR4LCBjdXJbMV0gKyBkeSk7XHJcbn0gLy9tb3ZlQnlcclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHJlbmRlcihhZnRlcjogc3RyaW5nID0gXCJcIikge1xyXG5cdGF3YWl0IGNvbW1hbmQoYGMke2FmdGVyID8gKCcuJyArIGFmdGVyKSA6ICcnfWApO1xyXG5cdGF3YWl0IG1hcC5zdGFtcCgpO1xyXG59IC8vcmVuZGVyXHJcblxyXG5mdW5jdGlvbiBwYWQobjogbnVtYmVyID0gbWFwLmRpbWVuc1swXSAqIG1hcC5kaW1lbnNbMV0sIHdpbGQ6IGJvb2xlYW4gPSBmYWxzZSkge1xyXG5cdGxldCB0OiBudW1iZXIgPSAwLCBwZDogbnVtYmVyID0gMDtcclxuXHRcclxuXHR3aGlsZSAobWFwLmNodW5rcy5sZW5ndGggPCBuKSB7XHJcblx0XHRjb25zdCBwOiBtb2QucmdsbS5SR0xNLlJHTE1DaHVuayA9IG1vZC5yZ2xtLlJHTE0uUkdMTUNodW5rLmJsYW5rKCk7XHJcblx0XHRcclxuXHRcdG1hcC5jaHVua3MucHVzaChwKTtcclxuXHRcdHBkKys7XHJcblx0XHRwLm9ucmVuZGVyID0gKF9pZHg6IG51bWJlciwgYzogbW9kLnJnbG0uUkdMTS5SR0xNQ2h1bmspOiBzdHJpbmcgPT4gYy5jaHIgPyBjLnByaW50IDogJyAnO1xyXG5cdH1cclxuXHRcclxuXHR3aGlsZSAobiA8IG1hcC5jaHVua3MubGVuZ3RoKSB7XHJcblx0XHRpZiAod2lsZCB8fCAhbWFwLmNodW5rc1ttYXAuY2h1bmtzLmxlbmd0aCAtIDFdLmNocikge1xyXG5cdFx0XHRtYXAuY2h1bmtzLnBvcCgpO1xyXG5cdFx0XHR0Kys7XHJcblx0XHR9IGVsc2UgYnJlYWs7XHJcblx0fVxyXG5cdFxyXG5cdHJldHVybiBjb21tYW5kKFwiZFwiKS50aGVuKCgpID0+IFJnbC53cml0ZUUoY2hhbGsuZGltYFBhZGRlZCAke3BkfSwgVHJpbW1lZCAke3R9YCkpO1xyXG59IC8vcGFkXHJcbmZ1bmN0aW9uIHBhdGNoKCkge1xyXG5cdG1hcC5jaHVua3MuZm9yRWFjaCgoYzogbW9kLnJnbG0uUkdMTS5SR0xNQ2h1bmspID0+IGMub25yZW5kZXIgPSAoX2lkeDogbnVtYmVyLCBjOiBtb2QucmdsbS5SR0xNLlJHTE1DaHVuayk6IHN0cmluZyA9PiBjLmNociA/IGMucHJpbnQgOiAnICcpO1xyXG5cdFxyXG5cdHJldHVybiBtb3ZlQnkoKTtcclxufSAvL3BhdGNoXHJcblxyXG5mdW5jdGlvbiBxdWl0KCk6IHZvaWQge1xyXG5cdGlmICghcXRjbikge1xyXG5cdFx0UmdsLmNsZWFyKC0xKTtcclxuXHRcdFJnbC5tb3ZlKDApLnRoZW4oKCkgPT4gUmdsLndyaXRlRShcIlByZXNzIFF1aXQgYWdhaW4uXCIpKTtcclxuXHRcdHF0Y24gPSB0cnVlO1xyXG5cdFx0c2V0VGltZW91dCgoKSA9PiAocXRjbiA9IGZhbHNlKSwgMjAwMCk7XHJcblx0fSBlbHNlIHtcclxuXHRcdFJnbC53cml0ZUUoXCJRdWl0LlwiKTtcclxuXHRcdHByb2Nlc3MuZXhpdCgxKTtcclxuXHR9XHJcbn0gLy9xdWl0XHJcblxyXG5hc3luYyBmdW5jdGlvbiBjb21tYW5kKGFjYzogc3RyaW5nKSB7XHJcblx0bGV0IGNvbW06IHN0cmluZ1tdID0gYWNjLnJlcGxhY2VBbGwoLyg/PD0oPzooPzooPzwhXFxcXClcXC4pfF4pKSguKz8pKD88IVxcXFwpXFx8KFxcZCspL2dtaXMsIChtOiBzdHJpbmcsIHAxOiBzdHJpbmcsIHAyOiBzdHJpbmcsIG9mZjogbnVtYmVyLCBzdHI6IHN0cmluZyk6IHN0cmluZyA9PiAocDEgKyAnLicpLnJlcGVhdChOdW1iZXIocDIgfHwgMSkpKS5yZXBsYWNlQWxsKC8oPzwhXFxcXClcXCQvZ21pcywgJy4nKS5zcGxpdCgvKD88IVxcXFwpXFwuL2dtaXMpLm1hcChjID0+IGMucmVwbGFjZUFsbCgvKD88IVxcXFwpXFxcXC9nbWksICcnKS5yZXBsYWNlQWxsKFwiXFxcXFxcXFxcIiwgXCJcXFxcXCIpKTtcclxuXHRcclxuXHRmb3IgKGNvbnN0IGNvbSBvZiBjb21tKSB7XHJcblx0XHRjb25zdCBhcmdzOiBzdHJpbmcgPSAoY29tLm1hdGNoKC9cXFsoLiopJC9taXMpIHx8IFsgXSlbMV0sXHJcblx0XHRub2FyZzogc3RyaW5nID0gY29tLnJlcGxhY2UoL1xcWy4qJC9taXMsIFwiXCIpO1xyXG5cdFx0XHJcblx0XHRpZiAoL15oKD86ZWxwKT8vaXMudGVzdChjb20pKSBSZ2wud3JpdGVFKGhlbHAoKSk7XHJcblx0XHRlbHNlIGlmICgvXmQoPzppcyg/OnAoPzpsKD86YXkpPyk/KT8pPyg/OlxcW3wkKS9pcy50ZXN0KGNvbSkpIGF3YWl0IHJlbmRlcihhcmdzKTtcclxuXHRcdGVsc2UgaWYgKC9eYyg/OmwoPzooPzplYSk/W3JuXSk/KT8oPzpcXFt8JCkvaXMudGVzdChjb20pKSBhd2FpdCBSZ2wuY2xlYXIoKTtcclxuXHRcdGVsc2UgaWYgKC9eZSg/OnYoPzphP2woPzp1YXRlKT8pPyk/KD86XFxbfCQpL2lzLnRlc3QoY29tKSkge1xyXG5cdFx0XHRSZ2wud3JpdGVFKHV0aWwuaW5zcGVjdChhd2FpdCBldmFsKGFyZ3MgPz8gXCJcIikpKTtcclxuXHRcdH0gZWxzZSBpZiAoL14oPzpxKD86KD86dWkpP3QpP3xlKD86KD86eGkpP3QpPykoPzpcXFt8JCkvaXMudGVzdChjb20pKSBxdWl0KCk7XHJcblx0XHRlbHNlIGlmICgvXnMoPzphdmU/fHRvP3JlPyk/KD86XFxbfCQpL2lzLnRlc3QoY29tKSkge1xyXG5cdFx0XHRhd2FpdCBtYXAuc3RvcmUoYXJncyk7XHJcblx0XHRcdFJnbC53cml0ZUUoYE1hcCBzYXZlZDogJHtwYXRoLnJlc29sdmUoYXJncyB8fCBtYXAuX2xvYWRlZEZyb20pfWApO1xyXG5cdFx0fSBlbHNlIGlmICgvXig/OnJlPyk/bCg/Oig/Om9hKT9kKT8oPzpcXFt8JCkvaXMudGVzdChjb20pKSB7XHJcblx0XHRcdG1hcCA9IGF3YWl0IG1vZC5yZ2xtLlJHTE0uUkdMTWFwLnBhcnNlKGFyZ3MgfHwgZ291dCwgUmdsKTtcclxuXHRcdFx0cGF0Y2goKTtcclxuXHRcdFx0YXdhaXQgY29tbWFuZChcImQuci5tXCIpO1xyXG5cdFx0XHRSZ2wud3JpdGVFKGBNYXAgbG9hZGVkOiAke3BhdGgucmVzb2x2ZShhcmdzIHx8IGdvdXQpfWApO1xyXG5cdFx0fSBlbHNlIGlmICgvXnJlPyg/OnMoPzppP3plPyk/KT8oPzpcXFt8JCkvaXMudGVzdChjb20pKSB7XHJcblx0XHRcdGlmIChhcmdzKSB7XHJcblx0XHRcdFx0Y29uc3QgczogbnVtYmVyW10gPSBhcmdzLnNwbGl0KCcsJykubWFwKE51bWJlcik7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0bWFwLmRpbWVuc1swXSA9IE1hdGgubWF4KHR5cGVvZiBzWzBdID09IFwibnVtYmVyXCIgPyBzWzBdIDogbWFwLmRpbWVuc1swXSwgMCk7XHJcblx0XHRcdFx0bWFwLmRpbWVuc1sxXSA9IE1hdGgubWF4KHR5cGVvZiBzWzFdID09IFwibnVtYmVyXCIgPyBzWzFdIDogbWFwLmRpbWVuc1sxXSwgMCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0YXdhaXQgcGFkKCk7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdG1vdmVCeSgpO1xyXG5cdFx0XHRcclxuXHRcdFx0UmdsLndyaXRlRShgU2l6ZTogJHttYXAuZGltZW5zLmpvaW4oXCIsIFwiKX1cXHRDdXJzb3I6ICR7Y3VyLmpvaW4oXCIsIFwiKX1gKTtcclxuXHRcdH0gZWxzZSBpZiAoL150KD86cmk/bSk/KD86XFxbfCQpL2lzLnRlc3QoY29tKSkge1xyXG5cdFx0XHRjb25zdCBzOiBudW1iZXIgPSBhcmdzID8gTnVtYmVyKGFyZ3MpIDogKG1hcC5kaW1lbnNbMF0gKiBtYXAuZGltZW5zWzFdKTtcclxuXHRcdFx0XHJcblx0XHRcdGF3YWl0IHBhZChzLCB0cnVlKTtcclxuXHRcdH0gZWxzZSBpZiAoL15tKD86ZXRhPyg/OmRhP3RhPyk/KT8oPzpcXFt8JCkvaXMudGVzdChjb20pKSB7XHJcblx0XHRcdGNvbnN0IHM6IFtzdHJpbmcsIHN0cmluZ10gPSAoYXJncyA/PyBcIlwiKS5zcGxpdCgnPScpIGFzIFtzdHJpbmcsIHN0cmluZ107XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAocy5sZW5ndGggPj0gMikge1xyXG5cdFx0XHRcdG1hcC5tZXRhW3NbMF1dID0gc1sxXSA/PyBcIlwiO1xyXG5cdFx0XHRcdGNvbW1hbmQoYG1ldGFbJHtzWzBdfWApO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHMubGVuZ3RoICYmIHNbMF0pIFJnbC53cml0ZUUoc1swXSwgXCIgPSBcIiwgbWFwLm1ldGFbc1swXV0gPz8gXCJcIik7XHJcblx0XHRcdGVsc2UgUmdsLndyaXRlRShBcnJheS5mcm9tKE9iamVjdC5lbnRyaWVzKG1hcC5tZXRhIHx8IHt9KS5tYXAoZSA9PiBcIi0gXCIgKyBlLmpvaW4oXCIgPSBcIikpKS5qb2luKG9zLkVPTCkpO1xyXG5cdFx0fSBlbHNlIGlmICgvXm0oPzpvdmU/fHYpPyg/OlxcW3wkKS9pcy50ZXN0KGNvbSkpIHtcclxuXHRcdFx0bW92ZSguLi4oYXJncyA/PyBcIjAsMFwiKS5zcGxpdCgnLCcpLm1hcChOdW1iZXIpKTtcclxuXHRcdFx0Y29tbWFuZChcImQuclwiKTtcclxuXHRcdH0gZWxzZSBpZiAoL15tKD86b3ZlP3x2KT91cD8oPzpcXFt8JCkvaXMudGVzdChjb20pKSB7XHJcblx0XHRcdGxldCBieTogbnVtYmVyID0gLTE7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoYXJncykgYnkgPSAtTnVtYmVyKGFyZ3MpO1xyXG5cdFx0XHRcclxuXHRcdFx0bGV0IHQgPSBieSArIGN1clsxXTtcclxuXHRcdFx0XHJcblx0XHRcdHdoaWxlICh0IDwgMCkgdCArPSBtYXAuZGltZW5zWzFdO1xyXG5cdFx0XHR0ID0gdCAlIG1hcC5kaW1lbnNbMV07XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAodCAhPSBjdXJbMV0pXHJcblx0XHRcdFx0Zm9yIChsZXQgeDogbnVtYmVyID0gMDsgeCA8IG1hcC5kaW1lbnNbMF07IHgrKylcclxuXHRcdFx0XHRcdG1hcC5zd2FwKG1hcC5nZXQoeCwgY3VyWzFdKSwgbWFwLmdldCh4LCB0KSk7XHJcblx0XHRcdFxyXG5cdFx0XHRtb3ZlQnkoMCwgYnkpO1xyXG5cdFx0XHRjb21tYW5kKFwiZFwiKTtcclxuXHRcdH0gZWxzZSBpZiAoL15tKD86b3ZlP3x2KT9kKD86bz93bik/KD86XFxbfCQpL2lzLnRlc3QoY29tKSkge1xyXG5cdFx0XHRsZXQgYnk6IG51bWJlciA9IDE7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoYXJncykgYnkgPSBOdW1iZXIoYXJncyk7XHJcblx0XHRcdFxyXG5cdFx0XHRsZXQgdCA9IGJ5ICsgY3VyWzFdO1xyXG5cdFx0XHRcclxuXHRcdFx0d2hpbGUgKHQgPCAwKSB0ICs9IG1hcC5kaW1lbnNbMV07XHJcblx0XHRcdHQgPSB0ICUgbWFwLmRpbWVuc1sxXTtcclxuXHRcdFx0XHJcblx0XHRcdGlmICh0ICE9IGN1clsxXSlcclxuXHRcdFx0XHRmb3IgKGxldCB4OiBudW1iZXIgPSAwOyB4IDwgbWFwLmRpbWVuc1swXTsgeCsrKVxyXG5cdFx0XHRcdFx0bWFwLnN3YXAobWFwLmdldCh4LCBjdXJbMV0pLCBtYXAuZ2V0KHgsIHQpKTtcclxuXHRcdFx0XHJcblx0XHRcdG1vdmVCeSgwLCBieSk7XHJcblx0XHRcdGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0fSBlbHNlIGlmICgvXm0oPzpvdmU/fHYpP3IoPzppP2doP3QpPyg/OlxcW3wkKS9pcy50ZXN0KGNvbSkpIHtcclxuXHRcdFx0bGV0IGJ5OiBudW1iZXIgPSAxO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKGFyZ3MpIGJ5ID0gTnVtYmVyKGFyZ3MpO1xyXG5cdFx0XHRcclxuXHRcdFx0bGV0IHQgPSBieSArIGN1clswXTtcclxuXHRcdFx0XHJcblx0XHRcdHdoaWxlICh0IDwgMCkgdCArPSBtYXAuZGltZW5zWzBdO1xyXG5cdFx0XHR0ID0gdCAlIG1hcC5kaW1lbnNbMF07XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAodCAhPSBjdXJbMF0pXHJcblx0XHRcdFx0Zm9yIChsZXQgeTogbnVtYmVyID0gMDsgeSA8IG1hcC5kaW1lbnNbMV07IHkrKylcclxuXHRcdFx0XHRcdG1hcC5zd2FwKG1hcC5nZXQoY3VyWzBdLCB5KSwgbWFwLmdldCh0LCB5KSk7XHJcblx0XHRcdFxyXG5cdFx0XHRtb3ZlQnkoYnkpO1xyXG5cdFx0XHRjb21tYW5kKFwiZFwiKTtcclxuXHRcdH0gZWxzZSBpZiAoL15tKD86b3ZlP3x2KT9sKD86ZT9mdCk/KD86XFxbfCQpL2lzLnRlc3QoY29tKSkge1xyXG5cdFx0XHRsZXQgYnk6IG51bWJlciA9IC0xO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKGFyZ3MpIGJ5ID0gLU51bWJlcihhcmdzKTtcclxuXHRcdFx0XHJcblx0XHRcdGxldCB0ID0gYnkgKyBjdXJbMF07XHJcblx0XHRcdFxyXG5cdFx0XHR3aGlsZSAodCA8IDApIHQgKz0gbWFwLmRpbWVuc1swXTtcclxuXHRcdFx0dCA9IHQgJSBtYXAuZGltZW5zWzBdO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHQgIT0gY3VyWzBdKVxyXG5cdFx0XHRcdGZvciAobGV0IHk6IG51bWJlciA9IDA7IHkgPCBtYXAuZGltZW5zWzFdOyB5KyspXHJcblx0XHRcdFx0XHRtYXAuc3dhcChtYXAuZ2V0KGN1clswXSwgeSksIG1hcC5nZXQodCwgeSkpO1xyXG5cdFx0XHRcclxuXHRcdFx0bW92ZUJ5KGJ5KTtcclxuXHRcdFx0Y29tbWFuZChcImRcIik7XHJcblx0XHR9IGVsc2UgaWYgKC9eZCg/OmU/bCg/OmU/dGU/KSk/cig/Om8/dyk/KD86XFxbfCQpL2lzLnRlc3QoY29tKSkge1xyXG5cdFx0XHRtb3ZlQnkoKTtcclxuXHRcdFx0bWFwLnBsYWNlKFtdLCAwLCBjdXJbMV0sIG1hcC5kaW1lbnNbMF0pO1xyXG5cdFx0XHRtb3ZlQnkoKTtcclxuXHRcdFx0YXdhaXQgY29tbWFuZChcImRcIik7XHJcblx0XHRcdGF3YWl0IGNvbW1hbmQoYHJbJHttYXAuZGltZW5zWzBdfSwke01hdGgubWF4KG1hcC5kaW1lbnNbMV0gLSAxLCAwKX1gKTtcclxuXHRcdFx0aWYgKE51bWJlcihhcmdzID8/IDApID4gMSkgYXdhaXQgY29tbWFuZChcImRyW1wiICsgKE51bWJlcihhcmdzKSAtIDEpKTtcclxuXHRcdH0gZWxzZSBpZiAoL15kKD86ZT9sKD86ZT90ZT8pKT9jKD86bz9sKD86dT9tbik/KT8oPzpcXFt8JCkvaXMudGVzdChjb20pKSB7XHJcblx0XHRcdGxldCBkZWxsaXN0OiBtb2QucmdsbS5SR0xNLlJHTE1DaHVua1tdID0gWyBdO1xyXG5cdFx0XHRcclxuXHRcdFx0Zm9yIChsZXQgaTogbnVtYmVyID0gMDsgaSA8IG1hcC5kaW1lbnNbMV07IGkrKykge1xyXG5cdFx0XHRcdGNvbnN0IHQ6IG1vZC5yZ2xtLlJHTE0uUkdMTUNodW5rID0gbWFwLmdldChjdXJbMF0sIGkpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGlmICghdCkgY29udGludWU7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dC5vbnJlbmRlciA9IChfaWR4OiBudW1iZXIsIGM6IG1vZC5yZ2xtLlJHTE0uUkdMTUNodW5rKTogc3RyaW5nID0+IGMucHJpbnQ7XHJcblx0XHRcdFx0ZGVsbGlzdC5wdXNoKHQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRtb3ZlQnkoKTtcclxuXHRcdFx0ZGVsbGlzdC5mb3JFYWNoKGQgPT4gbWFwLnBsYWNlKFtdLCAuLi5tYXAuY2FsY0Noa0NyZChkKSkpO1xyXG5cdFx0XHRtb3ZlQnkoKTtcclxuXHRcdFx0XHJcblx0XHRcdGF3YWl0IGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0XHRhd2FpdCBjb21tYW5kKGByWyR7TWF0aC5tYXgobWFwLmRpbWVuc1swXSAtIDEsIDApfSwke21hcC5kaW1lbnNbMV19YCk7XHJcblx0XHRcdGlmIChOdW1iZXIoYXJncyA/PyAwKSA+IDEpIGF3YWl0IGNvbW1hbmQoXCJkY1tcIiArIChOdW1iZXIoYXJncykgLSAxKSk7XHJcblx0XHR9IGVsc2UgaWYgKC9eZGU/bCg/OmV0ZSk/KD86XFxbfCQpL2lzLnRlc3QoY29tKSkge1xyXG5cdFx0XHRjb25zdCBjcjogW251bWJlciwgbnVtYmVyXSA9IChhcmdzID8gYXJncy5zcGxpdCgnLCcpLm1hcChOdW1iZXIpIDogY3VyKSBhcyBbbnVtYmVyLCBudW1iZXJdO1xyXG5cdFx0XHRcclxuXHRcdFx0bW92ZUJ5KCk7XHJcblx0XHRcdG1hcC5wbGFjZShbXSwgLi4uY3IpO1xyXG5cdFx0XHRwYWQoKTtcclxuXHRcdFx0bW92ZUJ5KCk7XHJcblx0XHR9IGVsc2UgaWYgKC9eYig/OmwoPzphbik/ayk/cig/Om8/dyk/KD86XFxbfCQpL2lzLnRlc3QoY29tKSkge1xyXG5cdFx0XHRsZXQgYzogbW9kLnJnbG0uUkdMTS5SR0xNQ2h1bmtbXSA9IFsgXTtcclxuXHRcdFx0XHJcblx0XHRcdGZvciAobGV0IGk6IG51bWJlciA9IDA7IGkgPCBtYXAuZGltZW5zWzBdOyBpKyspIGMucHVzaChtb2QucmdsbS5SR0xNLlJHTE1DaHVuay5ibGFuaygpKTtcclxuXHRcdFx0XHJcblx0XHRcdG1hcC5wbGFjZShjLCAwLCBjdXJbMV0sIDApO1xyXG5cdFx0XHRhd2FpdCBjb21tYW5kKGByWyR7bWFwLmRpbWVuc1swXX0sJHttYXAuZGltZW5zWzFdICsgMX1gKTtcclxuXHRcdFx0cGF0Y2goKTtcclxuXHRcdFx0YXdhaXQgY29tbWFuZChcImRcIik7XHJcblx0XHRcdGlmIChOdW1iZXIoYXJncyA/PyAwKSA+IDEpIGF3YWl0IGNvbW1hbmQoXCJicltcIiArIChOdW1iZXIoYXJncykgLSAxKSk7XHJcblx0XHR9IGVsc2UgaWYgKC9eYig/OmwoPzphbik/ayk/Yyg/Om8/bCg/OnU/bW4pPyk/KD86XFxbfCQpL2lzLnRlc3QoY29tKSkge1xyXG5cdFx0XHRhd2FpdCBjb21tYW5kKGByWyR7bWFwLmRpbWVuc1swXSArIDF9LCR7bWFwLmRpbWVuc1sxXX1gKTtcclxuXHRcdFx0XHJcblx0XHRcdGZvciAobGV0IGk6IG51bWJlciA9IDA7IGkgPCBtYXAuZGltZW5zWzFdOyBpKyspXHJcblx0XHRcdFx0bWFwLnBsYWNlKFttb2QucmdsbS5SR0xNLlJHTE1DaHVuay5ibGFuaygpXSwgY3VyWzBdLCBpLCAwKTtcclxuXHRcdFx0XHJcblx0XHRcdHBhdGNoKCk7XHJcblx0XHRcdGF3YWl0IGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0XHRpZiAoTnVtYmVyKGFyZ3MgPz8gMCkgPiAxKSBhd2FpdCBjb21tYW5kKFwiYmNbXCIgKyAoTnVtYmVyKGFyZ3MpIC0gMSkpO1xyXG5cdFx0fSBlbHNlIGlmICgvXmIoPzpsKD86YW4pP2spPyg/OlxcW3wkKS9pcy50ZXN0KGNvbSkpIHtcclxuXHRcdFx0Y29uc3QgY3I6IFtudW1iZXIsIG51bWJlcl0gPSAoYXJncyA/IGFyZ3Muc3BsaXQoJywnKS5tYXAoTnVtYmVyKSA6IGN1cikgYXMgW251bWJlciwgbnVtYmVyXTtcclxuXHRcdFx0XHJcblx0XHRcdG1hcC5wbGFjZShbbW9kLnJnbG0uUkdMTS5SR0xNQ2h1bmsuYmxhbmsoKV0sIC4uLmNyLCAwKTtcclxuXHRcdFx0XHJcblx0XHRcdHBhdGNoKCk7XHJcblx0XHRcdGF3YWl0IGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0fSBlbHNlIGlmICgvXnN3KD86YT9wKT8oPzpcXFt8JCkvaXMudGVzdChjb20pKSB7XHJcblx0XHRcdGlmIChhcmdzKSB7XHJcblx0XHRcdFx0Y29uc3QgY3I6IFtudW1iZXIsIG51bWJlcl0gPSAoYXJncyA/IGFyZ3Muc3BsaXQoJywnKS5tYXAoTnVtYmVyKSA6IGN1cikgYXMgW251bWJlciwgbnVtYmVyXTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRtYXAuc3dhcChtYXAuZ2V0KC4uLmN1ciksIG1hcC5nZXQoLi4uY3IpKTtcclxuXHRcdFx0XHRwYXRjaCgpO1xyXG5cdFx0XHRcdG1vdmVCeSgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRjb21tYW5kKFwiZFwiKTtcclxuXHRcdH0gZWxzZSBpZiAoL15zKD86aGk/ZnQ/KT9yKD86bz93KT8oPzpcXFt8JCkvaXMudGVzdChjb20pKSB7XHJcblx0XHRcdGxldCBhcmc6IG51bWJlciA9IE51bWJlcihhcmdzID8/IDEpLCBhOiBudW1iZXIgPSAwO1xyXG5cdFx0XHRcclxuXHRcdFx0d2hpbGUgKGFyZyA8IDApIGFyZyArPSBtYXAuZGltZW5zWzBdO1xyXG5cdFx0XHRcclxuXHRcdFx0d2hpbGUgKGFyZyA+IDApIHtcclxuXHRcdFx0XHRjb25zdCB0OiBtb2QucmdsbS5SR0xNLlJHTE1DaHVuayA9IG1hcC5jaHVua3Muc3BsaWNlKG1hcC5jYWxjQ2hrSWR4KG1hcC5kaW1lbnNbMF0gLSAxLCBjdXJbMV0pLCAxKVswXTtcclxuXHRcdFx0XHRtYXAuY2h1bmtzLnNwbGljZShtYXAuY2FsY0Noa0lkeCgwLCBjdXJbMV0pLCAwLCB0KTtcclxuXHRcdFx0XHRhcmctLTtcclxuXHRcdFx0XHRhKys7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHBhdGNoKCk7XHJcblx0XHRcdG1vdmVCeShhKTtcclxuXHRcdFx0YXdhaXQgY29tbWFuZChcImRcIik7XHJcblx0XHR9IGVsc2UgaWYgKC9ecyg/OmhpP2Z0Pyk/Yyg/Om8/bCg/OnU/bW4pPyk/KD86XFxbfCQpL2lzLnRlc3QoY29tKSkge1xyXG5cdFx0XHRsZXQgYXJnOiBudW1iZXIgPSBOdW1iZXIoYXJncyA/PyAxKSwgYTogbnVtYmVyID0gMDtcclxuXHRcdFx0XHJcblx0XHRcdHdoaWxlIChhcmcgPCAwKSBhcmcgKz0gbWFwLmRpbWVuc1sxXTtcclxuXHRcdFx0XHJcblx0XHRcdHdoaWxlIChhcmcgPiAwKSB7XHJcblx0XHRcdFx0bGV0IHQ6IG1vZC5OdWxsYWJsZTxtb2QucmdsbS5SR0xNLlJHTE1DaHVuaz4gPSBudWxsO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGZvciAobGV0IGk6IG51bWJlciA9IDA7IGkgPCBtYXAuZGltZW5zWzFdOyBpKyspIHtcclxuXHRcdFx0XHRcdGlmICh0KSB0ID0gbWFwLnBsYWNlKFt0XSwgY3VyWzBdLCBpLCAxKVswXTtcclxuXHRcdFx0XHRcdGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBiOiBtb2QucmdsbS5SR0xNLlJHTE1DaHVuayA9IG1vZC5yZ2xtLlJHTE0uUkdMTUNodW5rLmJsYW5rKCk7XHJcblx0XHRcdFx0XHRcdGIub25yZW5kZXIgPSAoX2lkeDogbnVtYmVyLCBjOiBtb2QucmdsbS5SR0xNLlJHTE1DaHVuayk6IHN0cmluZyA9PiBjLnByaW50IHx8ICcgJztcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdHQgPSBtYXAucGxhY2UoW2JdLCBjdXJbMF0sIGksIDEpWzBdO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAodCkgbWFwLnBsYWNlKFt0XSwgY3VyWzBdLCAwLCAxKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRhcmctLTtcclxuXHRcdFx0XHRhKys7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdHBhdGNoKCk7XHJcblx0XHRcdG1vdmVCeSgwLCBhKTtcclxuXHRcdFx0YXdhaXQgY29tbWFuZChcImRcIik7XHJcblx0XHR9IGVsc2UgaWYgKCFub2FyZyAmJiBhcmdzKSB7XHJcblx0XHRcdGxldCBjOiBtb2QucmdsbS5SR0xNLlJHTE1DaHVuayA9IG1vZC5yZ2xtLlJHTE0uUkdMTUNodW5rLmJsYW5rKCk7XHJcblx0XHRcdFxyXG5cdFx0XHRjb25zdCBzOiBbc3RyaW5nLCBudW1iZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdID0gYXJncy5zcGxpdCgnLCcpIGFzIFtzdHJpbmcsIG51bWJlciwgbnVtYmVyLCBudW1iZXIsIG51bWJlcl07XHJcblx0XHRcdFxyXG5cdFx0XHRjLmNoclx0PSBzWzBdLnRvU3RyaW5nKCkuY2hhckF0KDApID8/ICcnO1xyXG5cdFx0XHRjLmZnXHQ9IE1hdGgubWF4KE1hdGgubWluKE51bWJlcihzWzFdID8/IDB4ZmYpLCAweGZmKSwgMCk7XHJcblx0XHRcdGMuYmdcdD0gTWF0aC5tYXgoTWF0aC5taW4oTnVtYmVyKHNbMl0gPz8gMHhmZiksIDB4ZmYpLCAwKTtcclxuXHRcdFx0Yy5zdFx0PSBNYXRoLm1heChNYXRoLm1pbihOdW1iZXIoc1szXSA/PyAweGZmKSwgMHhmZiksIDApO1xyXG5cdFx0XHRjLmN1c3RcdD0gTWF0aC5tYXgoTWF0aC5taW4oTnVtYmVyKHNbNF0gPz8gMHhmZiksIDB4ZmYpLCAwKTtcclxuXHRcdFx0XHJcblx0XHRcdG1hcC5wbGFjZShbY10sIC4uLmN1cik7XHJcblx0XHRcdG1vdmVCeSgxKTtcclxuXHRcdFx0YXdhaXQgY29tbWFuZChcImQuclwiKTtcclxuXHRcdH1cclxuXHR9XHJcbn0gLy9jb21tYW5kXHJcblxyXG5hc3luYyBmdW5jdGlvbiBpbnAoYWNjOiBzdHJpbmcsIGFjaWR4OiBudW1iZXIpIHtcclxuXHRhd2FpdCBSZ2wuY2xlYXIoLTEpO1xyXG5cdGF3YWl0IFJnbC5tb3ZlKDApO1xyXG5cdFJnbC53cml0ZShhY2MpO1xyXG5cdGF3YWl0IFJnbC5tb3ZlKGFjaWR4KTtcclxufSAvL2lucFxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBhc3luYyBmdW5jdGlvbiBNYXAob3V0OiBzdHJpbmcsIGFyZ3M6IENvbW1hbmRMaW5lT3B0aW9ucykge1xyXG5cdGNvbnN0IG1wZzogc3RyaW5nID0gYXJncy5tYXAubWFwcGluZ3MgfHwgYXJncy5tYXAubWFwO1xyXG5cdFxyXG5cdHRyeSB7XHJcblx0XHRSZ2wgPSBhd2FpdCBtb2QucmdsLlJHTC5sb2FkKCk7XHJcblx0XHRcclxuXHRcdGlmIChtcGcpIFJnbC5wYXJzZU1hcHBpbmdzKG1wZyk7XHJcblx0fSBjYXRjaCAoZSkge1xyXG5cdFx0UmdsID0gYXdhaXQgbW9kLnJnbC5SR0wubG9hZCh7XHJcblx0XHRcdG5hbWU6IHBhdGguYmFzZW5hbWUob3V0IHx8IFwibWFwLnJnbG1cIiksXHJcblx0XHRcdG1haW46IFwibWFpbi5qc1wiLFxyXG5cdFx0XHRkZXNjcmlwdGlvbjogXCJyZ2wgbWFwXCIsXHJcblx0XHRcdHZlcnNpb246IFwiMC4xLjBcIixcclxuXHRcdFx0a2V5d29yZHM6IFsgXCJtYXBcIiwgXCJtYWtlXCIsIFwicmdsXCIgXSxcclxuXHRcdFx0bWFwcGluZ3M6IG1wZyB8fCBcIm1hcHBpbmdzLmpzXCJcclxuXHRcdH0pO1xyXG5cdH1cclxuXHRcclxuXHRSZ2wuY2FwdHVyZSgpO1xyXG5cdGF3YWl0IFJnbC5jbGVhcigpO1xyXG5cdFxyXG5cdHRyeSB7XHJcblx0XHRtYXAgPSBhd2FpdCBtb2QucmdsbS5SR0xNLlJHTE1hcC5wYXJzZShnb3V0ID0gb3V0IHx8IGBtYXAke01hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDB4ZmZmZmZmZmYpfS5yZ2xtYCwgUmdsKTtcclxuXHR9IGNhdGNoKGUpIHtcclxuXHRcdG1hcCA9IG1vZC5yZ2xtLlJHTE0uUkdMTWFwLmJsYW5rKFJnbCk7XHJcblx0XHRtYXAucGFyZW50ID0gUmdsO1xyXG5cdFx0bWFwLl9sb2FkZWRGcm9tID0gZ291dCA9IG91dCB8fCBgbWFwJHtNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAweGZmZmZmZmZmKX0ucmdsbWA7XHJcblx0fVxyXG5cdFxyXG5cdFJnbC53cml0ZUUoYExvYWRlZCBtYXBwaW5nczogJHtwYXRoLnJlc29sdmUoUmdsLmNmZy5tYXBwaW5ncyEpfWApO1xyXG5cdFJnbC53cml0ZUUoYFdyaXRpbmc6ICR7Z291dCA9IHBhdGgucmVzb2x2ZShnb3V0KX1gKTtcclxuXHRSZ2wud3JpdGVFKGhlbHAoKSk7XHJcblx0XHJcblx0bGV0IGFjYzogc3RyaW5nID0gXCJcIixcclxuXHRcdGhpc3Rvcnk6IHN0cmluZ1tdID0gW10sXHJcblx0XHRoaXN0aWR4OiBudW1iZXIgPSAwLFxyXG5cdFx0YWNpZHg6IG51bWJlciA9IDA7XHJcblx0XHJcblx0cGF0Y2goKTtcclxuXHRtb3ZlQnkoKTtcclxuXHRcclxuXHRSZ2wub24oXCJyYXdrZXlcIiwgYXN5bmMgKGs6IEJ1ZmZlcikgPT4ge1xyXG5cdFx0aWYgKCFtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuY3RybEMuY29tcGFyZShrKSkgcXVpdCgpO1xyXG5cdFx0ZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5lbnRlci5jb21wYXJlKGspKSB7XHJcblx0XHRcdGlmICghYWNjKSByZXR1cm47XHJcblx0XHRcdFxyXG5cdFx0XHRhd2FpdCBSZ2wuY2xlYXIoLTEpO1xyXG5cdFx0XHRhd2FpdCBSZ2wubW92ZSgwKTtcclxuXHRcdFx0XHJcblx0XHRcdGF3YWl0IGNvbW1hbmQoYWNjKTtcclxuXHRcdFx0XHJcblx0XHRcdGhpc3RvcnkucHVzaChhY2MpO1xyXG5cdFx0XHR3aGlsZSAoaGlzdG9yeS5sZW5ndGggPiAxMDApIGhpc3Rvcnkuc2hpZnQoKTtcclxuXHRcdFx0XHJcblx0XHRcdGFjYyA9IFwiXCI7XHJcblx0XHRcdGFjaWR4ID0gaGlzdGlkeCA9IDA7XHJcblx0XHR9IGVsc2UgaWYgKCFtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuYWx0RW50ZXIuY29tcGFyZShrKSkge1xyXG5cdFx0XHRpZiAoIWFjYykgcmV0dXJuO1xyXG5cdFx0XHRcclxuXHRcdFx0YXdhaXQgUmdsLm1vdmUoMCk7XHJcblx0XHRcdFxyXG5cdFx0XHRhd2FpdCBjb21tYW5kKGFjYyk7XHJcblx0XHRcdFxyXG5cdFx0XHRoaXN0b3J5LnB1c2goYWNjKTtcclxuXHRcdFx0d2hpbGUgKGhpc3RvcnkubGVuZ3RoID4gMTAwKSBoaXN0b3J5LnNoaWZ0KCk7XHJcblx0XHRcdFxyXG5cdFx0XHRoaXN0aWR4ID0gMDtcclxuXHRcdFx0XHJcblx0XHRcdGF3YWl0IGlucChhY2MsIGFjaWR4KTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy50YWIuY29tcGFyZShrKSkge1xyXG5cdFx0XHRjb25zdCBzdWc6IHN0cmluZ1tdID0gaGlzdG9yeS5maWx0ZXIoKHM6IHN0cmluZyk6IGJvb2xlYW4gPT4gcy50b0xvd2VyQ2FzZSgpLnN0YXJ0c1dpdGgoYWNjLnRvTG93ZXJDYXNlKCkpKS5zb3J0KCk7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoc3VnLmxlbmd0aCA+IDEpIHtcclxuXHRcdFx0XHRhd2FpdCBSZ2wuY2xlYXIoLTEpO1xyXG5cdFx0XHRcdFJnbC5tb3ZlKDApO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdFJnbC53cml0ZUUoc3VnLmpvaW4oJ1xcdCcpKTtcclxuXHRcdFx0fSBlbHNlIGlmIChzdWcubGVuZ3RoID09IDEpIHtcclxuXHRcdFx0XHRhY2MgPSBzdWdbMF07XHJcblx0XHRcdFx0YWNpZHggPSBhY2MubGVuZ3RoO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRhd2FpdCBpbnAoYWNjLCBhY2lkeCk7XHJcblx0XHR9IGVsc2UgaWYgKCFtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuYmFjay5jb21wYXJlKGspKSB7XHJcblx0XHRcdGFjYyA9IGFjYy5zbGljZSgwLCBNYXRoLm1heChhY2lkeCAtIDEsIDApKSArIGFjYy5zbGljZShhY2lkeCk7XHJcblx0XHRcdFxyXG5cdFx0XHRhd2FpdCBpbnAoYWNjLCBhY2lkeCA9IE1hdGgubWF4KGFjaWR4IC0gMSwgMCkpO1xyXG5cdFx0fSBlbHNlIGlmICghbW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLmRlbC5jb21wYXJlKGspKSB7XHJcblx0XHRcdGFjYyA9IGFjYy5zbGljZSgwLCBhY2lkeCkgKyBhY2Muc2xpY2UoYWNpZHggKyAxKTtcclxuXHRcdFx0XHJcblx0XHRcdGF3YWl0IGlucChhY2MsIGFjaWR4KTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy51cC5jb21wYXJlKGspKSB7XHJcblx0XHRcdG1vdmVCeSgwLCAtMSk7XHJcblx0XHRcdGF3YWl0IGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0XHRcclxuXHRcdFx0YXdhaXQgaW5wKGFjYywgYWNpZHgpO1xyXG5cdFx0fSBlbHNlIGlmICghbW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLmRvd24uY29tcGFyZShrKSkge1xyXG5cdFx0XHRtb3ZlQnkoMCwgMSk7XHJcblx0XHRcdGF3YWl0IGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0XHRcclxuXHRcdFx0YXdhaXQgaW5wKGFjYywgYWNpZHgpO1xyXG5cdFx0fSBlbHNlIGlmICghbW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLnJpZ2h0LmNvbXBhcmUoaykpIHtcclxuXHRcdFx0bW92ZUJ5KDEsIDApO1xyXG5cdFx0XHRhd2FpdCBjb21tYW5kKFwiZFwiKTtcclxuXHRcdFx0XHJcblx0XHRcdGF3YWl0IGlucChhY2MsIGFjaWR4KTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5sZWZ0LmNvbXBhcmUoaykpIHtcclxuXHRcdFx0bW92ZUJ5KC0xLCAwKTtcclxuXHRcdFx0YXdhaXQgY29tbWFuZChcImRcIik7XHJcblx0XHRcdFxyXG5cdFx0XHRhd2FpdCBpbnAoYWNjLCBhY2lkeCk7XHJcblx0XHR9IGVsc2UgaWYgKCEobW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLmZuVXAuY29tcGFyZShrKSAmJiBtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuZm5MZWZ0LmNvbXBhcmUoaykpKSB7XHJcblx0XHRcdGF3YWl0IGlucChhY2MsIGFjaWR4ID0gMCk7XHJcblx0XHR9IGVsc2UgaWYgKCEobW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLmZuRG93bi5jb21wYXJlKGspICYmIG1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5mblJpZ2h0LmNvbXBhcmUoaykpKSB7XHJcblx0XHRcdGF3YWl0IGlucChhY2MsIGFjaWR4ID0gYWNjLmxlbmd0aCk7XHJcblx0XHR9IGVsc2UgaWYgKCFtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuc2hpZnRVcC5jb21wYXJlKGspKSB7XHJcblx0XHRcdGhpc3RpZHggPSBoaXN0aWR4IDw9IGhpc3RvcnkubGVuZ3RoID8gKGhpc3RpZHggKyAxKSA6IGhpc3RpZHg7XHJcblx0XHRcdFxyXG5cdFx0XHRhY2MgPSBoaXN0b3J5W2hpc3RvcnkubGVuZ3RoIC0gaGlzdGlkeF0gPz8gYWNjO1xyXG5cdFx0XHRcclxuXHRcdFx0YXdhaXQgaW5wKGFjYywgYWNpZHggPSBhY2MubGVuZ3RoKTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5zaGlmdERvd24uY29tcGFyZShrKSkge1xyXG5cdFx0XHRoaXN0aWR4ID0gaGlzdGlkeCA+IDAgPyAoaGlzdGlkeCAtIDEpIDogaGlzdGlkeDtcclxuXHRcdFx0XHJcblx0XHRcdGFjYyA9IGhpc3RvcnlbaGlzdG9yeS5sZW5ndGggLSBoaXN0aWR4XSA/PyBhY2M7XHJcblx0XHRcdFxyXG5cdFx0XHRhd2FpdCBpbnAoYWNjLCBhY2lkeCA9IGFjYy5sZW5ndGgpO1xyXG5cdFx0fSBlbHNlIGlmICghbW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLnNoaWZ0UmlnaHQuY29tcGFyZShrKSkge1xyXG5cdFx0XHRhd2FpdCBpbnAoYWNjLCBhY2lkeCA9IE1hdGgubWluKGFjaWR4ICsgMSwgYWNjLmxlbmd0aCkpO1xyXG5cdFx0fSBlbHNlIGlmICghbW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLnNoaWZ0TGVmdC5jb21wYXJlKGspKSB7XHJcblx0XHRcdGF3YWl0IGlucChhY2MsIGFjaWR4ID0gTWF0aC5tYXgoYWNpZHggLSAxLCAwKSk7XHJcblx0XHR9IGVsc2UgaWYgKCFtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuY3RybEZuVXAuY29tcGFyZShrKSkge1xyXG5cdFx0XHRtb3ZlKGN1clswXSwgMCk7XHJcblx0XHRcdGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0fSBlbHNlIGlmICghbW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLmN0cmxGbkRvd24uY29tcGFyZShrKSkge1xyXG5cdFx0XHRtb3ZlKGN1clswXSwgbWFwLmRpbWVuc1sxXSAtIDEpO1xyXG5cdFx0XHRjb21tYW5kKFwiZFwiKTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5jdHJsRm5SaWdodC5jb21wYXJlKGspKSB7XHJcblx0XHRcdG1vdmUobWFwLmRpbWVuc1swXSAtIDEsIGN1clsxXSk7XHJcblx0XHRcdGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0fSBlbHNlIGlmICghbW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLmN0cmxGbkxlZnQuY29tcGFyZShrKSkge1xyXG5cdFx0XHRtb3ZlKDAsIGN1clsxXSk7XHJcblx0XHRcdGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0fSBlbHNlIGlmICghbW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLmN0cmxVcC5jb21wYXJlKGspKSB7XHJcblx0XHRcdGNvbW1hbmQoXCJtdVwiKTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5jdHJsRG93bi5jb21wYXJlKGspKSB7XHJcblx0XHRcdGNvbW1hbmQoXCJtZFwiKTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5jdHJsUmlnaHQuY29tcGFyZShrKSkge1xyXG5cdFx0XHRjb21tYW5kKFwibXJcIik7XHJcblx0XHR9IGVsc2UgaWYgKCFtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuY3RybExlZnQuY29tcGFyZShrKSkge1xyXG5cdFx0XHRjb21tYW5kKFwibWxcIik7XHJcblx0XHR9IGVsc2UgaWYgKCFtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuY3RybFNoaWZ0VXAuY29tcGFyZShrKSkge1xyXG5cdFx0XHRjb21tYW5kKFwic2NbLTFcIik7XHJcblx0XHR9IGVsc2UgaWYgKCFtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuY3RybFNoaWZ0RG93bi5jb21wYXJlKGspKSB7XHJcblx0XHRcdGNvbW1hbmQoXCJzY1wiKTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5jdHJsU2hpZnRSaWdodC5jb21wYXJlKGspKSB7XHJcblx0XHRcdGNvbW1hbmQoXCJzclwiKTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5jdHJsU2hpZnRMZWZ0LmNvbXBhcmUoaykpIHtcclxuXHRcdFx0Y29tbWFuZChcInNyWy0xXCIpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0bGV0IHM6IHN0cmluZyA9IGsudG9TdHJpbmcoXCJ1dGY4XCIpO1xyXG5cdFx0XHRhY2MgPSBhY2Muc2xpY2UoMCwgYWNpZHgpICsgcyArIGFjYy5zbGljZShhY2lkeCk7XHJcblx0XHRcdFxyXG5cdFx0XHRhd2FpdCBpbnAoYWNjLCArK2FjaWR4KTtcclxuXHRcdH1cclxuXHR9KTtcclxufTsgLy9tYXBcclxuIl19