#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mod = tslib_1.__importStar(require("../lib/rgl"));
const path = tslib_1.__importStar(require("path"));
const util = tslib_1.__importStar(require("util"));
const os = tslib_1.__importStar(require("os"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
let qtcn = false, Rgl, map, gout, cur = [0, 0], prev = [0, 0], a = 0;
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
    let comm = acc.replaceAll(/(?<=(?:(?:(?<!\\)\.)|^))(.+?)(?<!\\)\|(\d+)/gmis, (m, p1, p2, off, str) => (p1 + '.').repeat(Number(p2 || 1))).replaceAll(/(?<!\\)\$/gmis, '.').split(/(?<!\\)\./gmis).map(c => c.replaceAll(/(?<!\\)\\/gmi, '').replaceAll("\\\\", "\\")), b = a, c = 0;
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
                map.clip[0] = map.dimens[0] = Math.max(typeof s[0] == "number" ? s[0] : map.dimens[0], 0);
                map.clip[1] = map.dimens[1] = Math.max(typeof s[1] == "number" ? s[1] : map.dimens[1], 0);
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
        b++;
        a++;
        c++;
    }
    a = 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYmluL21hcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBRUEsWUFBWSxDQUFDOzs7QUFFYix3REFBa0M7QUFDbEMsbURBQTZCO0FBQzdCLG1EQUE2QjtBQUM3QiwrQ0FBeUI7QUFDekIsMERBQTBCO0FBRzFCLElBQUksSUFBSSxHQUFZLEtBQUssRUFDeEIsR0FBZ0IsRUFDaEIsR0FBeUIsRUFDekIsSUFBWSxFQUNaLEdBQUcsR0FBcUIsQ0FBRSxDQUFDLEVBQUUsQ0FBQyxDQUFFLEVBQ2hDLElBQUksR0FBcUIsQ0FBRSxDQUFDLEVBQUUsQ0FBQyxDQUFFLEVBQ2pDLENBQUMsR0FBVyxDQUFDLENBQUM7QUFFZixTQUFTLElBQUk7SUFDWixPQUFPOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7NENBd0JvQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxNQUFNO0FBRVIsU0FBUyxJQUFJLENBQUMsSUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ25ELElBQUksQ0FBMEIsQ0FBQztJQUMvQixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQVksRUFBRSxDQUEwQixFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7SUFDM0csSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFZLEVBQUUsQ0FBMEIsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0lBRTFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUV6QixHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNsQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFM0MsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbEMsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTNDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbkUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPO1FBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO0lBQ2xJLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbkUsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJO1FBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBRTVILElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7UUFBRSxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQTJCLEVBQUUsRUFBRSxDQUFDLGVBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFM0gsT0FBTyxHQUFHLENBQUM7QUFDWixDQUFDLENBQUMsTUFBTTtBQUNSLFNBQVMsTUFBTSxDQUFDLEtBQWEsQ0FBQyxFQUFFLEtBQWEsQ0FBQztJQUM3QyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsUUFBUTtBQUVWLEtBQUssVUFBVSxNQUFNLENBQUMsUUFBZ0IsRUFBRTtJQUN2QyxNQUFNLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDaEQsTUFBTSxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDbkIsQ0FBQyxDQUFDLFFBQVE7QUFFVixTQUFTLEdBQUcsQ0FBQyxJQUFZLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFnQixLQUFLO0lBQzVFLElBQUksQ0FBQyxHQUFXLENBQUMsRUFBRSxFQUFFLEdBQVcsQ0FBQyxDQUFDO0lBRWxDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQzdCLE1BQU0sQ0FBQyxHQUE0QixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFbkUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkIsRUFBRSxFQUFFLENBQUM7UUFDTCxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsSUFBWSxFQUFFLENBQTBCLEVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztLQUN6RjtJQUVELE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO1FBQzdCLElBQUksSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUU7WUFDbkQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNqQixDQUFDLEVBQUUsQ0FBQztTQUNKOztZQUFNLE1BQU07S0FDYjtJQUVELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQUssQ0FBQyxHQUFHLENBQUEsVUFBVSxFQUFFLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ25GLENBQUMsQ0FBQyxLQUFLO0FBQ1AsU0FBUyxLQUFLO0lBQ2IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUEwQixFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsSUFBWSxFQUFFLENBQTBCLEVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRTdJLE9BQU8sTUFBTSxFQUFFLENBQUM7QUFDakIsQ0FBQyxDQUFDLE9BQU87QUFFVCxTQUFTLElBQUk7SUFDWixJQUFJLENBQUMsSUFBSSxFQUFFO1FBQ1YsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2QsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDeEQsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNaLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztLQUN2QztTQUFNO1FBQ04sR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2hCO0FBQ0YsQ0FBQyxDQUFDLE1BQU07QUFFUixLQUFLLFVBQVUsT0FBTyxDQUFDLEdBQVc7SUFDakMsSUFBSSxJQUFJLEdBQWEsR0FBRyxDQUFDLFVBQVUsQ0FBQyxpREFBaUQsRUFBRSxDQUFDLENBQVMsRUFBRSxFQUFVLEVBQUUsRUFBVSxFQUFFLEdBQVcsRUFBRSxHQUFXLEVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQzlULENBQUMsR0FBVyxDQUFDLEVBQ2IsQ0FBQyxHQUFXLENBQUMsQ0FBQztJQUVmLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFO1FBQ3ZCLE1BQU0sSUFBSSxHQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDeEQsS0FBSyxHQUFXLEdBQUcsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRTVDLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7WUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7YUFDNUMsSUFBSSx3Q0FBd0MsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQUUsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDM0UsSUFBSSxvQ0FBb0MsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQUUsTUFBTSxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUM7YUFDdEUsSUFBSSxxQ0FBcUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDekQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDakQ7YUFBTSxJQUFJLDhDQUE4QyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7WUFBRSxJQUFJLEVBQUUsQ0FBQzthQUN2RSxJQUFJLDhCQUE4QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNsRCxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDbEU7YUFBTSxJQUFJLG1DQUFtQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN6RCxHQUFHLEdBQUcsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDMUQsS0FBSyxFQUFFLENBQUM7WUFDUixNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN2QixHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ3hEO2FBQU0sSUFBSSxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDdEQsSUFBSSxJQUFJLEVBQUU7Z0JBQ1QsTUFBTSxDQUFDLEdBQWEsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBRWhELEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUMxRixHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFMUYsTUFBTSxHQUFHLEVBQUUsQ0FBQzthQUNaO1lBRUQsTUFBTSxFQUFFLENBQUM7WUFFVCxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDeEU7YUFBTSxJQUFJLHVCQUF1QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUM3QyxNQUFNLENBQUMsR0FBVyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV4RSxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDbkI7YUFBTSxJQUFJLGtDQUFrQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN4RCxNQUFNLENBQUMsR0FBcUIsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBcUIsQ0FBQztZQUV4RSxJQUFJLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO2dCQUNsQixHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzVCLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDeEI7aUJBQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7O2dCQUN0RSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDeEc7YUFBTSxJQUFJLHlCQUF5QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUMvQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDaEQsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ2Y7YUFBTSxJQUFJLDRCQUE0QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNsRCxJQUFJLEVBQUUsR0FBVyxDQUFDLENBQUMsQ0FBQztZQUVwQixJQUFJLElBQUk7Z0JBQUUsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTdCLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQztnQkFBRSxDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFdEIsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDZCxLQUFLLElBQUksQ0FBQyxHQUFXLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7b0JBQzdDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU5QyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2I7YUFBTSxJQUFJLG1DQUFtQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN6RCxJQUFJLEVBQUUsR0FBVyxDQUFDLENBQUM7WUFFbkIsSUFBSSxJQUFJO2dCQUFFLEVBQUUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFNUIsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVwQixPQUFPLENBQUMsR0FBRyxDQUFDO2dCQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV0QixJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNkLEtBQUssSUFBSSxDQUFDLEdBQVcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtvQkFDN0MsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTlDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDZCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDYjthQUFNLElBQUkscUNBQXFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzNELElBQUksRUFBRSxHQUFXLENBQUMsQ0FBQztZQUVuQixJQUFJLElBQUk7Z0JBQUUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUU1QixJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXBCLE9BQU8sQ0FBQyxHQUFHLENBQUM7Z0JBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakMsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXRCLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2QsS0FBSyxJQUFJLENBQUMsR0FBVyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO29CQUM3QyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFOUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2I7YUFBTSxJQUFJLG1DQUFtQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN6RCxJQUFJLEVBQUUsR0FBVyxDQUFDLENBQUMsQ0FBQztZQUVwQixJQUFJLElBQUk7Z0JBQUUsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTdCLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQztnQkFBRSxDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNqQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFdEIsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDZCxLQUFLLElBQUksQ0FBQyxHQUFXLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7b0JBQzdDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU5QyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDYjthQUFNLElBQUksd0NBQXdDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzlELE1BQU0sRUFBRSxDQUFDO1lBQ1QsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEMsTUFBTSxFQUFFLENBQUM7WUFDVCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuQixNQUFNLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdEUsSUFBSSxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQUUsTUFBTSxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDckU7YUFBTSxJQUFJLGlEQUFpRCxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN2RSxJQUFJLE9BQU8sR0FBOEIsRUFBRyxDQUFDO1lBRTdDLEtBQUssSUFBSSxDQUFDLEdBQVcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUMvQyxNQUFNLENBQUMsR0FBNEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRXRELElBQUksQ0FBQyxDQUFDO29CQUFFLFNBQVM7Z0JBRWpCLENBQUMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFZLEVBQUUsQ0FBMEIsRUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztnQkFDM0UsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNoQjtZQUVELE1BQU0sRUFBRSxDQUFDO1lBQ1QsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUQsTUFBTSxFQUFFLENBQUM7WUFFVCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuQixNQUFNLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdEUsSUFBSSxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQUUsTUFBTSxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDckU7YUFBTSxJQUFJLHlCQUF5QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUMvQyxNQUFNLEVBQUUsR0FBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQXFCLENBQUM7WUFFNUYsTUFBTSxFQUFFLENBQUM7WUFDVCxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQ3JCLEdBQUcsRUFBRSxDQUFDO1lBQ04sTUFBTSxFQUFFLENBQUM7U0FDVDthQUFNLElBQUkscUNBQXFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzNELElBQUksQ0FBQyxHQUE4QixFQUFHLENBQUM7WUFFdkMsS0FBSyxJQUFJLENBQUMsR0FBVyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFFeEYsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMzQixNQUFNLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3pELEtBQUssRUFBRSxDQUFDO1lBQ1IsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkIsSUFBSSxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQUUsTUFBTSxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDckU7YUFBTSxJQUFJLDhDQUE4QyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNwRSxNQUFNLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRXpELEtBQUssSUFBSSxDQUFDLEdBQVcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDN0MsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFNUQsS0FBSyxFQUFFLENBQUM7WUFDUixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuQixJQUFJLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQztnQkFBRSxNQUFNLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNyRTthQUFNLElBQUksNEJBQTRCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ2xELE1BQU0sRUFBRSxHQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBcUIsQ0FBQztZQUU1RixHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFdkQsS0FBSyxFQUFFLENBQUM7WUFDUixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNuQjthQUFNLElBQUksdUJBQXVCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzdDLElBQUksSUFBSSxFQUFFO2dCQUNULE1BQU0sRUFBRSxHQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBcUIsQ0FBQztnQkFFNUYsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFDLEtBQUssRUFBRSxDQUFDO2dCQUNSLE1BQU0sRUFBRSxDQUFDO2FBQ1Q7WUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDYjthQUFNLElBQUksa0NBQWtDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3hELElBQUksR0FBRyxHQUFXLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFXLENBQUMsQ0FBQztZQUVuRCxPQUFPLEdBQUcsR0FBRyxDQUFDO2dCQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXJDLE9BQU8sR0FBRyxHQUFHLENBQUMsRUFBRTtnQkFDZixNQUFNLENBQUMsR0FBNEIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDdEcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxHQUFHLEVBQUUsQ0FBQztnQkFDTixDQUFDLEVBQUUsQ0FBQzthQUNKO1lBRUQsS0FBSyxFQUFFLENBQUM7WUFDUixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDVixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNuQjthQUFNLElBQUksMkNBQTJDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ2pFLElBQUksR0FBRyxHQUFXLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFXLENBQUMsQ0FBQztZQUVuRCxPQUFPLEdBQUcsR0FBRyxDQUFDO2dCQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXJDLE9BQU8sR0FBRyxHQUFHLENBQUMsRUFBRTtnQkFDZixJQUFJLENBQUMsR0FBMEMsSUFBSSxDQUFDO2dCQUVwRCxLQUFLLElBQUksQ0FBQyxHQUFXLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtvQkFDL0MsSUFBSSxDQUFDO3dCQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt5QkFDdEM7d0JBQ0osTUFBTSxDQUFDLEdBQTRCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFDbkUsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQVksRUFBRSxDQUEwQixFQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQzt3QkFFbEYsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUNwQztpQkFDRDtnQkFFRCxJQUFJLENBQUM7b0JBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBRXBDLEdBQUcsRUFBRSxDQUFDO2dCQUNOLENBQUMsRUFBRSxDQUFDO2FBQ0o7WUFFRCxLQUFLLEVBQUUsQ0FBQztZQUNSLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDYixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNuQjthQUFNLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxFQUFFO1lBQzFCLElBQUksQ0FBQyxHQUE0QixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7WUFFakUsTUFBTSxDQUFDLEdBQTZDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUE2QyxDQUFDO1lBRWhILENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDeEMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN6RCxDQUFDLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3pELENBQUMsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDekQsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUUzRCxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQztZQUN2QixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDVixNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNyQjtRQUVELENBQUMsRUFBRSxDQUFDO1FBQ0osQ0FBQyxFQUFFLENBQUM7UUFDSixDQUFDLEVBQUUsQ0FBQztLQUNKO0lBRUQsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxTQUFTO0FBRVgsS0FBSyxVQUFVLEdBQUcsQ0FBQyxHQUFXLEVBQUUsS0FBYTtJQUM1QyxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwQixNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNmLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsS0FBSztBQUVQLE1BQU0sQ0FBQyxPQUFPLEdBQUcsS0FBSyxVQUFVLEdBQUcsQ0FBQyxHQUFXLEVBQUUsSUFBd0I7SUFDeEUsTUFBTSxHQUFHLEdBQVcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7SUFFdEQsSUFBSTtRQUNILEdBQUcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRS9CLElBQUksR0FBRztZQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDaEM7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNYLEdBQUcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztZQUM1QixJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksVUFBVSxDQUFDO1lBQ3RDLElBQUksRUFBRSxTQUFTO1lBQ2YsV0FBVyxFQUFFLFNBQVM7WUFDdEIsT0FBTyxFQUFFLE9BQU87WUFDaEIsUUFBUSxFQUFFLENBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUU7WUFDbEMsUUFBUSxFQUFFLEdBQUcsSUFBSSxhQUFhO1NBQzlCLENBQUMsQ0FBQztLQUNIO0lBRUQsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2QsTUFBTSxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUM7SUFFbEIsSUFBSTtRQUNILEdBQUcsR0FBRyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLEdBQUcsSUFBSSxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7S0FDL0c7SUFBQyxPQUFNLENBQUMsRUFBRTtRQUNWLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO1FBQ2pCLEdBQUcsQ0FBQyxXQUFXLEdBQUcsSUFBSSxHQUFHLEdBQUcsSUFBSSxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUM7S0FDcEY7SUFFRCxHQUFHLENBQUMsTUFBTSxDQUFDLG9CQUFvQixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2xFLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBRW5CLElBQUksR0FBRyxHQUFXLEVBQUUsRUFDbkIsT0FBTyxHQUFhLEVBQUUsRUFDdEIsT0FBTyxHQUFXLENBQUMsRUFDbkIsS0FBSyxHQUFXLENBQUMsQ0FBQztJQUVuQixLQUFLLEVBQUUsQ0FBQztJQUNSLE1BQU0sRUFBRSxDQUFDO0lBRVQsR0FBRyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQVMsRUFBRSxFQUFFO1FBQ3BDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFBRSxJQUFJLEVBQUUsQ0FBQzthQUNsRCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDcEQsSUFBSSxDQUFDLEdBQUc7Z0JBQUUsT0FBTztZQUVqQixNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwQixNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbEIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFbkIsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNsQixPQUFPLE9BQU8sQ0FBQyxNQUFNLEdBQUcsR0FBRztnQkFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7WUFFN0MsR0FBRyxHQUFHLEVBQUUsQ0FBQztZQUNULEtBQUssR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFDO1NBQ3BCO2FBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3pELElBQUksQ0FBQyxHQUFHO2dCQUFFLE9BQU87WUFFakIsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRWxCLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRW5CLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbEIsT0FBTyxPQUFPLENBQUMsTUFBTSxHQUFHLEdBQUc7Z0JBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBRTdDLE9BQU8sR0FBRyxDQUFDLENBQUM7WUFFWixNQUFNLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDdEI7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDcEQsTUFBTSxHQUFHLEdBQWEsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQVMsRUFBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRW5ILElBQUksR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQ25CLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNwQixHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVaLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2FBQzNCO2lCQUFNLElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7Z0JBQzNCLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7YUFDbkI7WUFFRCxNQUFNLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDdEI7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDckQsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFOUQsTUFBTSxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUMvQzthQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNwRCxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFFakQsTUFBTSxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3RCO2FBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ25ELE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNkLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRW5CLE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztTQUN0QjthQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNyRCxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2IsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFbkIsTUFBTSxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3RCO2FBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3RELE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDYixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUVuQixNQUFNLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDdEI7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDckQsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2QsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFbkIsTUFBTSxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQ3RCO2FBQU0sSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNyRyxNQUFNLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQzFCO2FBQU0sSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN4RyxNQUFNLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNuQzthQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN4RCxPQUFPLEdBQUcsT0FBTyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFFOUQsR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLEdBQUcsQ0FBQztZQUUvQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNuQzthQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMxRCxPQUFPLEdBQUcsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUVoRCxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDO1lBRS9DLE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ25DO2FBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzNELE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1NBQ3hEO2FBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzFELE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDL0M7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDekQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoQixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDYjthQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMzRCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2I7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDNUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNiO2FBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzNELElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2I7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdkQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2Q7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDekQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2Q7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDMUQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2Q7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDekQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2Q7YUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDNUQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ2pCO2FBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzlELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNkO2FBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQy9ELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNkO2FBQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzlELE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNqQjthQUFNO1lBQ04sSUFBSSxDQUFDLEdBQVcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFakQsTUFBTSxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDeEI7SUFDRixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDLEtBQUsiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXHJcblxyXG5cInVzZSBzdHJpY3RcIjtcclxuXHJcbmltcG9ydCAqIGFzIG1vZCBmcm9tIFwiLi4vbGliL3JnbFwiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSBcInV0aWxcIjtcclxuaW1wb3J0ICogYXMgb3MgZnJvbSBcIm9zXCI7XHJcbmltcG9ydCBjaGFsayBmcm9tIFwiY2hhbGtcIjtcclxuaW1wb3J0IHsgQ29tbWFuZExpbmVPcHRpb25zIH0gZnJvbSBcImNvbW1hbmQtbGluZS1hcmdzXCI7XHJcblxyXG5sZXQgcXRjbjogYm9vbGVhbiA9IGZhbHNlLFxyXG5cdFJnbDogbW9kLnJnbC5SR0wsXHJcblx0bWFwOiBtb2QucmdsbS5SR0xNLlJHTE1hcCxcclxuXHRnb3V0OiBzdHJpbmcsXHJcblx0Y3VyOiBbbnVtYmVyLCBudW1iZXJdID0gWyAwLCAwIF0sXHJcblx0cHJldjogW251bWJlciwgbnVtYmVyXSA9IFsgMCwgMCBdLFxyXG5cdGE6IG51bWJlciA9IDA7XHJcblxyXG5mdW5jdGlvbiBoZWxwKCk6IHN0cmluZyB7XHJcblx0cmV0dXJuIGBDb21tYW5kczpcclxuXHRoXHRcdFx0XHQtXHREaXNwbGF5IHRoaXMgaGVscCBzY3JlZW5cclxuXHRkXHRcdFx0XHQtXHREaXNwbGF5IE1hcFxyXG5cdGNcdFx0XHRcdC1cdENsZWFyIFNjcmVlblxyXG5cdHNcdFx0XHRcdC1cdFNhdmUgTWFwXHJcblx0bFx0XHRcdFx0LVx0TG9hZCBNYXBcclxuXHRyXHRcdFx0XHQtXHRSZXNpemUgTWFwIChWZXJ5IEltcG9ydGFudCB0byBkbyBmaXJzdCEhKVxyXG5cdHRcdFx0XHRcdC1cdFRyaW0gbGVmdG92ZXJzIGFmdGVyIHJlc2l6ZVxyXG5cdGV2W2NkXHRcdFx0LVx0RXZhbHVhdGUgY29kZVxyXG5cdG1cdFx0XHRcdC1cdFNldC9HZXQgTWV0YWRhdGFcclxuXHRtdlx0XHRcdCAgIC1cdE1vdmUgQ3Vyc29yIChjYW4gYWxzbyB1c2Uga2V5Ym9hcmQgYXJyb3dzISlcclxuXHRjdHJsK2Fycm93c1x0ICAtXHRNb3ZlIExpbmVcclxuXHRmbithcnJvd3NcdFx0LVx0TW92ZSBGYXN0XHJcblx0Y3RybCtmbithcnJvd3MgICAtXHRNb3ZlIEZhc3RcclxuXHRkW2NyXVx0XHRcdC1cdERlbGV0ZSBDb2x1bW4vUm93IGFuZCByZXNpemVcclxuXHRbY2gsMSwyLDNcdFx0LVx0UGxhY2UgQ2h1bmtcclxuXHRjdHJsLUMvcXRcdFx0LVx0UXVpdFxyXG5cdFxyXG5cdFh8Tlx0XHRcdCAgLVx0Q29tbWFuZCByZXBldGl0aW9uICgkIGJlY29tZXMgLiBhZnRlciByZXBldGl0aW9uKVxyXG5cclxuKiBTZXBhcmF0ZSBDb21tYW5kcyB3aXRoICcuJyAoZG90KS5cclxuKiBQYXNzIHBhcmFtZXRlcnMgd2l0aCBYW2FyZywuLi5cclxuKiBIaXQgRU5URVIgdG8gZXhlY3V0ZSAob3IgYWx0LWVudGVyIHRvIHBlcnNpc3QpLlxyXG4qIEFjY2VzcyBjb21tYW5kIGhpc3Rvcnkgd2l0aCBzaGlmdCt1cC9kb3duLCBtb3ZlIGlucHV0IGN1cnNvciB3aXRoIHNoaWZ0K3VwL2Rvd24gYW5kIGF1dG9jb21wbGV0ZSB3aXRoIFRBQi5cclxuKiBVc2UgXFxcXCB0byBlc2NhcGUgZG90cyBhbmQgb3RoZXIgc3BlY2lhbHMuYDtcclxufSAvL2hlbHBcclxuXHJcbmZ1bmN0aW9uIG1vdmUoeDogbnVtYmVyID0gY3VyWzBdLCB5OiBudW1iZXIgPSBjdXJbMV0pIHtcclxuXHRsZXQgdDogbW9kLnJnbG0uUkdMTS5SR0xNQ2h1bms7XHJcblx0aWYgKHQgPSBtYXAuZ2V0KC4uLnByZXYpKSB0Lm9ucmVuZGVyID0gKF9pZHg6IG51bWJlciwgYzogbW9kLnJnbG0uUkdMTS5SR0xNQ2h1bmspID0+IGMuY2hyID8gYy5wcmludCA6ICcgJztcclxuXHRpZiAodCA9IG1hcC5nZXQoLi4uY3VyKSkgdC5vbnJlbmRlciA9IChfaWR4OiBudW1iZXIsIGM6IG1vZC5yZ2xtLlJHTE0uUkdMTUNodW5rKSA9PiBjLmNociA/IGMucHJpbnQgOiAnICc7XHJcblx0XHJcblx0W3ByZXZbMF0sIHByZXZbMV1dID0gY3VyO1xyXG5cdFxyXG5cdGN1clswXSA9IHggJSAobWFwLmRpbWVuc1swXSB8fCAxKTtcclxuXHR3aGlsZSAoY3VyWzBdIDwgMCkgY3VyWzBdICs9IG1hcC5kaW1lbnNbMF07XHJcblx0XHJcblx0Y3VyWzFdID0geSAlIChtYXAuZGltZW5zWzFdIHx8IDEpO1xyXG5cdHdoaWxlIChjdXJbMV0gPCAwKSBjdXJbMV0gKz0gbWFwLmRpbWVuc1sxXTtcclxuXHRcclxuXHRpZiAoY3VyWzBdICsgbWFwLnNjcm9sbFswXSA8IDApIG1hcC5zY3JvbGxbMF0gLT0gY3VyWzBdICsgbWFwLnNjcm9sbFswXTtcclxuXHRlbHNlIGlmIChjdXJbMF0gKyBtYXAuc2Nyb2xsWzBdID49IG1hcC5wYXJlbnQuc291dC5jb2x1bW5zKSBtYXAuc2Nyb2xsWzBdIC09IGN1clswXSArIG1hcC5zY3JvbGxbMF0gLSBtYXAucGFyZW50LnNvdXQuY29sdW1ucyArIDE7XHJcblx0aWYgKGN1clsxXSArIG1hcC5zY3JvbGxbMV0gPCAwKSBtYXAuc2Nyb2xsWzFdIC09IGN1clsxXSArIG1hcC5zY3JvbGxbMV07XHJcblx0ZWxzZSBpZiAoY3VyWzFdICsgbWFwLnNjcm9sbFsxXSA+PSBtYXAucGFyZW50LnNvdXQucm93cykgbWFwLnNjcm9sbFsxXSAtPSBjdXJbMV0gKyBtYXAuc2Nyb2xsWzFdIC0gbWFwLnBhcmVudC5zb3V0LnJvd3MgKyAxO1xyXG5cdFxyXG5cdGlmICh0ID0gbWFwLmdldCguLi5jdXIpKSB0Lm9ucmVuZGVyID0gKF9pZHg6IG51bWJlciwgX2M6IG1vZC5yZ2xtLlJHTE0uUkdMTUNodW5rKSA9PiBjaGFsay5pbnZlcnNlLml0YWxpYy5ib2xkLml0YWxpYygnQCcpO1xyXG5cdFxyXG5cdHJldHVybiBjdXI7XHJcbn0gLy9tb3ZlXHJcbmZ1bmN0aW9uIG1vdmVCeShkeDogbnVtYmVyID0gMCwgZHk6IG51bWJlciA9IDApIHtcclxuXHRyZXR1cm4gbW92ZShjdXJbMF0gKyBkeCwgY3VyWzFdICsgZHkpO1xyXG59IC8vbW92ZUJ5XHJcblxyXG5hc3luYyBmdW5jdGlvbiByZW5kZXIoYWZ0ZXI6IHN0cmluZyA9IFwiXCIpIHtcclxuXHRhd2FpdCBjb21tYW5kKGBjJHthZnRlciA/ICgnLicgKyBhZnRlcikgOiAnJ31gKTtcclxuXHRhd2FpdCBtYXAuc3RhbXAoKTtcclxufSAvL3JlbmRlclxyXG5cclxuZnVuY3Rpb24gcGFkKG46IG51bWJlciA9IG1hcC5kaW1lbnNbMF0gKiBtYXAuZGltZW5zWzFdLCB3aWxkOiBib29sZWFuID0gZmFsc2UpIHtcclxuXHRsZXQgdDogbnVtYmVyID0gMCwgcGQ6IG51bWJlciA9IDA7XHJcblx0XHJcblx0d2hpbGUgKG1hcC5jaHVua3MubGVuZ3RoIDwgbikge1xyXG5cdFx0Y29uc3QgcDogbW9kLnJnbG0uUkdMTS5SR0xNQ2h1bmsgPSBtb2QucmdsbS5SR0xNLlJHTE1DaHVuay5ibGFuaygpO1xyXG5cdFx0XHJcblx0XHRtYXAuY2h1bmtzLnB1c2gocCk7XHJcblx0XHRwZCsrO1xyXG5cdFx0cC5vbnJlbmRlciA9IChfaWR4OiBudW1iZXIsIGM6IG1vZC5yZ2xtLlJHTE0uUkdMTUNodW5rKTogc3RyaW5nID0+IGMuY2hyID8gYy5wcmludCA6ICcgJztcclxuXHR9XHJcblx0XHJcblx0d2hpbGUgKG4gPCBtYXAuY2h1bmtzLmxlbmd0aCkge1xyXG5cdFx0aWYgKHdpbGQgfHwgIW1hcC5jaHVua3NbbWFwLmNodW5rcy5sZW5ndGggLSAxXS5jaHIpIHtcclxuXHRcdFx0bWFwLmNodW5rcy5wb3AoKTtcclxuXHRcdFx0dCsrO1xyXG5cdFx0fSBlbHNlIGJyZWFrO1xyXG5cdH1cclxuXHRcclxuXHRyZXR1cm4gY29tbWFuZChcImRcIikudGhlbigoKSA9PiBSZ2wud3JpdGVFKGNoYWxrLmRpbWBQYWRkZWQgJHtwZH0sIFRyaW1tZWQgJHt0fWApKTtcclxufSAvL3BhZFxyXG5mdW5jdGlvbiBwYXRjaCgpIHtcclxuXHRtYXAuY2h1bmtzLmZvckVhY2goKGM6IG1vZC5yZ2xtLlJHTE0uUkdMTUNodW5rKSA9PiBjLm9ucmVuZGVyID0gKF9pZHg6IG51bWJlciwgYzogbW9kLnJnbG0uUkdMTS5SR0xNQ2h1bmspOiBzdHJpbmcgPT4gYy5jaHIgPyBjLnByaW50IDogJyAnKTtcclxuXHRcclxuXHRyZXR1cm4gbW92ZUJ5KCk7XHJcbn0gLy9wYXRjaFxyXG5cclxuZnVuY3Rpb24gcXVpdCgpOiB2b2lkIHtcclxuXHRpZiAoIXF0Y24pIHtcclxuXHRcdFJnbC5jbGVhcigtMSk7XHJcblx0XHRSZ2wubW92ZSgwKS50aGVuKCgpID0+IFJnbC53cml0ZUUoXCJQcmVzcyBRdWl0IGFnYWluLlwiKSk7XHJcblx0XHRxdGNuID0gdHJ1ZTtcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4gKHF0Y24gPSBmYWxzZSksIDIwMDApO1xyXG5cdH0gZWxzZSB7XHJcblx0XHRSZ2wud3JpdGVFKFwiUXVpdC5cIik7XHJcblx0XHRwcm9jZXNzLmV4aXQoMSk7XHJcblx0fVxyXG59IC8vcXVpdFxyXG5cclxuYXN5bmMgZnVuY3Rpb24gY29tbWFuZChhY2M6IHN0cmluZykge1xyXG5cdGxldCBjb21tOiBzdHJpbmdbXSA9IGFjYy5yZXBsYWNlQWxsKC8oPzw9KD86KD86KD88IVxcXFwpXFwuKXxeKSkoLis/KSg/PCFcXFxcKVxcfChcXGQrKS9nbWlzLCAobTogc3RyaW5nLCBwMTogc3RyaW5nLCBwMjogc3RyaW5nLCBvZmY6IG51bWJlciwgc3RyOiBzdHJpbmcpOiBzdHJpbmcgPT4gKHAxICsgJy4nKS5yZXBlYXQoTnVtYmVyKHAyIHx8IDEpKSkucmVwbGFjZUFsbCgvKD88IVxcXFwpXFwkL2dtaXMsICcuJykuc3BsaXQoLyg/PCFcXFxcKVxcLi9nbWlzKS5tYXAoYyA9PiBjLnJlcGxhY2VBbGwoLyg/PCFcXFxcKVxcXFwvZ21pLCAnJykucmVwbGFjZUFsbChcIlxcXFxcXFxcXCIsIFwiXFxcXFwiKSksXHJcblx0XHRiOiBudW1iZXIgPSBhLFxyXG5cdFx0YzogbnVtYmVyID0gMDtcclxuXHRcclxuXHRmb3IgKGNvbnN0IGNvbSBvZiBjb21tKSB7XHJcblx0XHRjb25zdCBhcmdzOiBzdHJpbmcgPSAoY29tLm1hdGNoKC9cXFsoLiopJC9taXMpIHx8IFsgXSlbMV0sXHJcblx0XHRub2FyZzogc3RyaW5nID0gY29tLnJlcGxhY2UoL1xcWy4qJC9taXMsIFwiXCIpO1xyXG5cdFx0XHJcblx0XHRpZiAoL15oKD86ZWxwKT8vaXMudGVzdChjb20pKSBSZ2wud3JpdGVFKGhlbHAoKSk7XHJcblx0XHRlbHNlIGlmICgvXmQoPzppcyg/OnAoPzpsKD86YXkpPyk/KT8pPyg/OlxcW3wkKS9pcy50ZXN0KGNvbSkpIGF3YWl0IHJlbmRlcihhcmdzKTtcclxuXHRcdGVsc2UgaWYgKC9eYyg/OmwoPzooPzplYSk/W3JuXSk/KT8oPzpcXFt8JCkvaXMudGVzdChjb20pKSBhd2FpdCBSZ2wuY2xlYXIoKTtcclxuXHRcdGVsc2UgaWYgKC9eZSg/OnYoPzphP2woPzp1YXRlKT8pPyk/KD86XFxbfCQpL2lzLnRlc3QoY29tKSkge1xyXG5cdFx0XHRSZ2wud3JpdGVFKHV0aWwuaW5zcGVjdChhd2FpdCBldmFsKGFyZ3MgPz8gXCJcIikpKTtcclxuXHRcdH0gZWxzZSBpZiAoL14oPzpxKD86KD86dWkpP3QpP3xlKD86KD86eGkpP3QpPykoPzpcXFt8JCkvaXMudGVzdChjb20pKSBxdWl0KCk7XHJcblx0XHRlbHNlIGlmICgvXnMoPzphdmU/fHRvP3JlPyk/KD86XFxbfCQpL2lzLnRlc3QoY29tKSkge1xyXG5cdFx0XHRhd2FpdCBtYXAuc3RvcmUoYXJncyk7XHJcblx0XHRcdFJnbC53cml0ZUUoYE1hcCBzYXZlZDogJHtwYXRoLnJlc29sdmUoYXJncyB8fCBtYXAuX2xvYWRlZEZyb20pfWApO1xyXG5cdFx0fSBlbHNlIGlmICgvXig/OnJlPyk/bCg/Oig/Om9hKT9kKT8oPzpcXFt8JCkvaXMudGVzdChjb20pKSB7XHJcblx0XHRcdG1hcCA9IGF3YWl0IG1vZC5yZ2xtLlJHTE0uUkdMTWFwLnBhcnNlKGFyZ3MgfHwgZ291dCwgUmdsKTtcclxuXHRcdFx0cGF0Y2goKTtcclxuXHRcdFx0YXdhaXQgY29tbWFuZChcImQuci5tXCIpO1xyXG5cdFx0XHRSZ2wud3JpdGVFKGBNYXAgbG9hZGVkOiAke3BhdGgucmVzb2x2ZShhcmdzIHx8IGdvdXQpfWApO1xyXG5cdFx0fSBlbHNlIGlmICgvXnJlPyg/OnMoPzppP3plPyk/KT8oPzpcXFt8JCkvaXMudGVzdChjb20pKSB7XHJcblx0XHRcdGlmIChhcmdzKSB7XHJcblx0XHRcdFx0Y29uc3QgczogbnVtYmVyW10gPSBhcmdzLnNwbGl0KCcsJykubWFwKE51bWJlcik7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0bWFwLmNsaXBbMF0gPSBtYXAuZGltZW5zWzBdID0gTWF0aC5tYXgodHlwZW9mIHNbMF0gPT0gXCJudW1iZXJcIiA/IHNbMF0gOiBtYXAuZGltZW5zWzBdLCAwKTtcclxuXHRcdFx0XHRtYXAuY2xpcFsxXSA9IG1hcC5kaW1lbnNbMV0gPSBNYXRoLm1heCh0eXBlb2Ygc1sxXSA9PSBcIm51bWJlclwiID8gc1sxXSA6IG1hcC5kaW1lbnNbMV0sIDApO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGF3YWl0IHBhZCgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRtb3ZlQnkoKTtcclxuXHRcdFx0XHJcblx0XHRcdFJnbC53cml0ZUUoYFNpemU6ICR7bWFwLmRpbWVucy5qb2luKFwiLCBcIil9XFx0Q3Vyc29yOiAke2N1ci5qb2luKFwiLCBcIil9YCk7XHJcblx0XHR9IGVsc2UgaWYgKC9edCg/OnJpP20pPyg/OlxcW3wkKS9pcy50ZXN0KGNvbSkpIHtcclxuXHRcdFx0Y29uc3QgczogbnVtYmVyID0gYXJncyA/IE51bWJlcihhcmdzKSA6IChtYXAuZGltZW5zWzBdICogbWFwLmRpbWVuc1sxXSk7XHJcblx0XHRcdFxyXG5cdFx0XHRhd2FpdCBwYWQocywgdHJ1ZSk7XHJcblx0XHR9IGVsc2UgaWYgKC9ebSg/OmV0YT8oPzpkYT90YT8pPyk/KD86XFxbfCQpL2lzLnRlc3QoY29tKSkge1xyXG5cdFx0XHRjb25zdCBzOiBbc3RyaW5nLCBzdHJpbmddID0gKGFyZ3MgPz8gXCJcIikuc3BsaXQoJz0nKSBhcyBbc3RyaW5nLCBzdHJpbmddO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHMubGVuZ3RoID49IDIpIHtcclxuXHRcdFx0XHRtYXAubWV0YVtzWzBdXSA9IHNbMV0gPz8gXCJcIjtcclxuXHRcdFx0XHRjb21tYW5kKGBtZXRhWyR7c1swXX1gKTtcclxuXHRcdFx0fSBlbHNlIGlmIChzLmxlbmd0aCAmJiBzWzBdKSBSZ2wud3JpdGVFKHNbMF0sIFwiID0gXCIsIG1hcC5tZXRhW3NbMF1dID8/IFwiXCIpO1xyXG5cdFx0XHRlbHNlIFJnbC53cml0ZUUoQXJyYXkuZnJvbShPYmplY3QuZW50cmllcyhtYXAubWV0YSB8fCB7fSkubWFwKGUgPT4gXCItIFwiICsgZS5qb2luKFwiID0gXCIpKSkuam9pbihvcy5FT0wpKTtcclxuXHRcdH0gZWxzZSBpZiAoL15tKD86b3ZlP3x2KT8oPzpcXFt8JCkvaXMudGVzdChjb20pKSB7XHJcblx0XHRcdG1vdmUoLi4uKGFyZ3MgPz8gXCIwLDBcIikuc3BsaXQoJywnKS5tYXAoTnVtYmVyKSk7XHJcblx0XHRcdGNvbW1hbmQoXCJkLnJcIik7XHJcblx0XHR9IGVsc2UgaWYgKC9ebSg/Om92ZT98dik/dXA/KD86XFxbfCQpL2lzLnRlc3QoY29tKSkge1xyXG5cdFx0XHRsZXQgYnk6IG51bWJlciA9IC0xO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKGFyZ3MpIGJ5ID0gLU51bWJlcihhcmdzKTtcclxuXHRcdFx0XHJcblx0XHRcdGxldCB0ID0gYnkgKyBjdXJbMV07XHJcblx0XHRcdFxyXG5cdFx0XHR3aGlsZSAodCA8IDApIHQgKz0gbWFwLmRpbWVuc1sxXTtcclxuXHRcdFx0dCA9IHQgJSBtYXAuZGltZW5zWzFdO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHQgIT0gY3VyWzFdKVxyXG5cdFx0XHRcdGZvciAobGV0IHg6IG51bWJlciA9IDA7IHggPCBtYXAuZGltZW5zWzBdOyB4KyspXHJcblx0XHRcdFx0XHRtYXAuc3dhcChtYXAuZ2V0KHgsIGN1clsxXSksIG1hcC5nZXQoeCwgdCkpO1xyXG5cdFx0XHRcclxuXHRcdFx0bW92ZUJ5KDAsIGJ5KTtcclxuXHRcdFx0Y29tbWFuZChcImRcIik7XHJcblx0XHR9IGVsc2UgaWYgKC9ebSg/Om92ZT98dik/ZCg/Om8/d24pPyg/OlxcW3wkKS9pcy50ZXN0KGNvbSkpIHtcclxuXHRcdFx0bGV0IGJ5OiBudW1iZXIgPSAxO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKGFyZ3MpIGJ5ID0gTnVtYmVyKGFyZ3MpO1xyXG5cdFx0XHRcclxuXHRcdFx0bGV0IHQgPSBieSArIGN1clsxXTtcclxuXHRcdFx0XHJcblx0XHRcdHdoaWxlICh0IDwgMCkgdCArPSBtYXAuZGltZW5zWzFdO1xyXG5cdFx0XHR0ID0gdCAlIG1hcC5kaW1lbnNbMV07XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAodCAhPSBjdXJbMV0pXHJcblx0XHRcdFx0Zm9yIChsZXQgeDogbnVtYmVyID0gMDsgeCA8IG1hcC5kaW1lbnNbMF07IHgrKylcclxuXHRcdFx0XHRcdG1hcC5zd2FwKG1hcC5nZXQoeCwgY3VyWzFdKSwgbWFwLmdldCh4LCB0KSk7XHJcblx0XHRcdFxyXG5cdFx0XHRtb3ZlQnkoMCwgYnkpO1xyXG5cdFx0XHRjb21tYW5kKFwiZFwiKTtcclxuXHRcdH0gZWxzZSBpZiAoL15tKD86b3ZlP3x2KT9yKD86aT9naD90KT8oPzpcXFt8JCkvaXMudGVzdChjb20pKSB7XHJcblx0XHRcdGxldCBieTogbnVtYmVyID0gMTtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChhcmdzKSBieSA9IE51bWJlcihhcmdzKTtcclxuXHRcdFx0XHJcblx0XHRcdGxldCB0ID0gYnkgKyBjdXJbMF07XHJcblx0XHRcdFxyXG5cdFx0XHR3aGlsZSAodCA8IDApIHQgKz0gbWFwLmRpbWVuc1swXTtcclxuXHRcdFx0dCA9IHQgJSBtYXAuZGltZW5zWzBdO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHQgIT0gY3VyWzBdKVxyXG5cdFx0XHRcdGZvciAobGV0IHk6IG51bWJlciA9IDA7IHkgPCBtYXAuZGltZW5zWzFdOyB5KyspXHJcblx0XHRcdFx0XHRtYXAuc3dhcChtYXAuZ2V0KGN1clswXSwgeSksIG1hcC5nZXQodCwgeSkpO1xyXG5cdFx0XHRcclxuXHRcdFx0bW92ZUJ5KGJ5KTtcclxuXHRcdFx0Y29tbWFuZChcImRcIik7XHJcblx0XHR9IGVsc2UgaWYgKC9ebSg/Om92ZT98dik/bCg/OmU/ZnQpPyg/OlxcW3wkKS9pcy50ZXN0KGNvbSkpIHtcclxuXHRcdFx0bGV0IGJ5OiBudW1iZXIgPSAtMTtcclxuXHRcdFx0XHJcblx0XHRcdGlmIChhcmdzKSBieSA9IC1OdW1iZXIoYXJncyk7XHJcblx0XHRcdFxyXG5cdFx0XHRsZXQgdCA9IGJ5ICsgY3VyWzBdO1xyXG5cdFx0XHRcclxuXHRcdFx0d2hpbGUgKHQgPCAwKSB0ICs9IG1hcC5kaW1lbnNbMF07XHJcblx0XHRcdHQgPSB0ICUgbWFwLmRpbWVuc1swXTtcclxuXHRcdFx0XHJcblx0XHRcdGlmICh0ICE9IGN1clswXSlcclxuXHRcdFx0XHRmb3IgKGxldCB5OiBudW1iZXIgPSAwOyB5IDwgbWFwLmRpbWVuc1sxXTsgeSsrKVxyXG5cdFx0XHRcdFx0bWFwLnN3YXAobWFwLmdldChjdXJbMF0sIHkpLCBtYXAuZ2V0KHQsIHkpKTtcclxuXHRcdFx0XHJcblx0XHRcdG1vdmVCeShieSk7XHJcblx0XHRcdGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0fSBlbHNlIGlmICgvXmQoPzplP2woPzplP3RlPykpP3IoPzpvP3cpPyg/OlxcW3wkKS9pcy50ZXN0KGNvbSkpIHtcclxuXHRcdFx0bW92ZUJ5KCk7XHJcblx0XHRcdG1hcC5wbGFjZShbXSwgMCwgY3VyWzFdLCBtYXAuZGltZW5zWzBdKTtcclxuXHRcdFx0bW92ZUJ5KCk7XHJcblx0XHRcdGF3YWl0IGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0XHRhd2FpdCBjb21tYW5kKGByWyR7bWFwLmRpbWVuc1swXX0sJHtNYXRoLm1heChtYXAuZGltZW5zWzFdIC0gMSwgMCl9YCk7XHJcblx0XHRcdGlmIChOdW1iZXIoYXJncyA/PyAwKSA+IDEpIGF3YWl0IGNvbW1hbmQoXCJkcltcIiArIChOdW1iZXIoYXJncykgLSAxKSk7XHJcblx0XHR9IGVsc2UgaWYgKC9eZCg/OmU/bCg/OmU/dGU/KSk/Yyg/Om8/bCg/OnU/bW4pPyk/KD86XFxbfCQpL2lzLnRlc3QoY29tKSkge1xyXG5cdFx0XHRsZXQgZGVsbGlzdDogbW9kLnJnbG0uUkdMTS5SR0xNQ2h1bmtbXSA9IFsgXTtcclxuXHRcdFx0XHJcblx0XHRcdGZvciAobGV0IGk6IG51bWJlciA9IDA7IGkgPCBtYXAuZGltZW5zWzFdOyBpKyspIHtcclxuXHRcdFx0XHRjb25zdCB0OiBtb2QucmdsbS5SR0xNLlJHTE1DaHVuayA9IG1hcC5nZXQoY3VyWzBdLCBpKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAoIXQpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdHQub25yZW5kZXIgPSAoX2lkeDogbnVtYmVyLCBjOiBtb2QucmdsbS5SR0xNLlJHTE1DaHVuayk6IHN0cmluZyA9PiBjLnByaW50O1xyXG5cdFx0XHRcdGRlbGxpc3QucHVzaCh0KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0bW92ZUJ5KCk7XHJcblx0XHRcdGRlbGxpc3QuZm9yRWFjaChkID0+IG1hcC5wbGFjZShbXSwgLi4ubWFwLmNhbGNDaGtDcmQoZCkpKTtcclxuXHRcdFx0bW92ZUJ5KCk7XHJcblx0XHRcdFxyXG5cdFx0XHRhd2FpdCBjb21tYW5kKFwiZFwiKTtcclxuXHRcdFx0YXdhaXQgY29tbWFuZChgclske01hdGgubWF4KG1hcC5kaW1lbnNbMF0gLSAxLCAwKX0sJHttYXAuZGltZW5zWzFdfWApO1xyXG5cdFx0XHRpZiAoTnVtYmVyKGFyZ3MgPz8gMCkgPiAxKSBhd2FpdCBjb21tYW5kKFwiZGNbXCIgKyAoTnVtYmVyKGFyZ3MpIC0gMSkpO1xyXG5cdFx0fSBlbHNlIGlmICgvXmRlP2woPzpldGUpPyg/OlxcW3wkKS9pcy50ZXN0KGNvbSkpIHtcclxuXHRcdFx0Y29uc3QgY3I6IFtudW1iZXIsIG51bWJlcl0gPSAoYXJncyA/IGFyZ3Muc3BsaXQoJywnKS5tYXAoTnVtYmVyKSA6IGN1cikgYXMgW251bWJlciwgbnVtYmVyXTtcclxuXHRcdFx0XHJcblx0XHRcdG1vdmVCeSgpO1xyXG5cdFx0XHRtYXAucGxhY2UoW10sIC4uLmNyKTtcclxuXHRcdFx0cGFkKCk7XHJcblx0XHRcdG1vdmVCeSgpO1xyXG5cdFx0fSBlbHNlIGlmICgvXmIoPzpsKD86YW4pP2spP3IoPzpvP3cpPyg/OlxcW3wkKS9pcy50ZXN0KGNvbSkpIHtcclxuXHRcdFx0bGV0IGM6IG1vZC5yZ2xtLlJHTE0uUkdMTUNodW5rW10gPSBbIF07XHJcblx0XHRcdFxyXG5cdFx0XHRmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgbWFwLmRpbWVuc1swXTsgaSsrKSBjLnB1c2gobW9kLnJnbG0uUkdMTS5SR0xNQ2h1bmsuYmxhbmsoKSk7XHJcblx0XHRcdFxyXG5cdFx0XHRtYXAucGxhY2UoYywgMCwgY3VyWzFdLCAwKTtcclxuXHRcdFx0YXdhaXQgY29tbWFuZChgclske21hcC5kaW1lbnNbMF19LCR7bWFwLmRpbWVuc1sxXSArIDF9YCk7XHJcblx0XHRcdHBhdGNoKCk7XHJcblx0XHRcdGF3YWl0IGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0XHRpZiAoTnVtYmVyKGFyZ3MgPz8gMCkgPiAxKSBhd2FpdCBjb21tYW5kKFwiYnJbXCIgKyAoTnVtYmVyKGFyZ3MpIC0gMSkpO1xyXG5cdFx0fSBlbHNlIGlmICgvXmIoPzpsKD86YW4pP2spP2MoPzpvP2woPzp1P21uKT8pPyg/OlxcW3wkKS9pcy50ZXN0KGNvbSkpIHtcclxuXHRcdFx0YXdhaXQgY29tbWFuZChgclske21hcC5kaW1lbnNbMF0gKyAxfSwke21hcC5kaW1lbnNbMV19YCk7XHJcblx0XHRcdFxyXG5cdFx0XHRmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgbWFwLmRpbWVuc1sxXTsgaSsrKVxyXG5cdFx0XHRcdG1hcC5wbGFjZShbbW9kLnJnbG0uUkdMTS5SR0xNQ2h1bmsuYmxhbmsoKV0sIGN1clswXSwgaSwgMCk7XHJcblx0XHRcdFxyXG5cdFx0XHRwYXRjaCgpO1xyXG5cdFx0XHRhd2FpdCBjb21tYW5kKFwiZFwiKTtcclxuXHRcdFx0aWYgKE51bWJlcihhcmdzID8/IDApID4gMSkgYXdhaXQgY29tbWFuZChcImJjW1wiICsgKE51bWJlcihhcmdzKSAtIDEpKTtcclxuXHRcdH0gZWxzZSBpZiAoL15iKD86bCg/OmFuKT9rKT8oPzpcXFt8JCkvaXMudGVzdChjb20pKSB7XHJcblx0XHRcdGNvbnN0IGNyOiBbbnVtYmVyLCBudW1iZXJdID0gKGFyZ3MgPyBhcmdzLnNwbGl0KCcsJykubWFwKE51bWJlcikgOiBjdXIpIGFzIFtudW1iZXIsIG51bWJlcl07XHJcblx0XHRcdFxyXG5cdFx0XHRtYXAucGxhY2UoW21vZC5yZ2xtLlJHTE0uUkdMTUNodW5rLmJsYW5rKCldLCAuLi5jciwgMCk7XHJcblx0XHRcdFxyXG5cdFx0XHRwYXRjaCgpO1xyXG5cdFx0XHRhd2FpdCBjb21tYW5kKFwiZFwiKTtcclxuXHRcdH0gZWxzZSBpZiAoL15zdyg/OmE/cCk/KD86XFxbfCQpL2lzLnRlc3QoY29tKSkge1xyXG5cdFx0XHRpZiAoYXJncykge1xyXG5cdFx0XHRcdGNvbnN0IGNyOiBbbnVtYmVyLCBudW1iZXJdID0gKGFyZ3MgPyBhcmdzLnNwbGl0KCcsJykubWFwKE51bWJlcikgOiBjdXIpIGFzIFtudW1iZXIsIG51bWJlcl07XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0bWFwLnN3YXAobWFwLmdldCguLi5jdXIpLCBtYXAuZ2V0KC4uLmNyKSk7XHJcblx0XHRcdFx0cGF0Y2goKTtcclxuXHRcdFx0XHRtb3ZlQnkoKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRcclxuXHRcdFx0Y29tbWFuZChcImRcIik7XHJcblx0XHR9IGVsc2UgaWYgKC9ecyg/OmhpP2Z0Pyk/cig/Om8/dyk/KD86XFxbfCQpL2lzLnRlc3QoY29tKSkge1xyXG5cdFx0XHRsZXQgYXJnOiBudW1iZXIgPSBOdW1iZXIoYXJncyA/PyAxKSwgYTogbnVtYmVyID0gMDtcclxuXHRcdFx0XHJcblx0XHRcdHdoaWxlIChhcmcgPCAwKSBhcmcgKz0gbWFwLmRpbWVuc1swXTtcclxuXHRcdFx0XHJcblx0XHRcdHdoaWxlIChhcmcgPiAwKSB7XHJcblx0XHRcdFx0Y29uc3QgdDogbW9kLnJnbG0uUkdMTS5SR0xNQ2h1bmsgPSBtYXAuY2h1bmtzLnNwbGljZShtYXAuY2FsY0Noa0lkeChtYXAuZGltZW5zWzBdIC0gMSwgY3VyWzFdKSwgMSlbMF07XHJcblx0XHRcdFx0bWFwLmNodW5rcy5zcGxpY2UobWFwLmNhbGNDaGtJZHgoMCwgY3VyWzFdKSwgMCwgdCk7XHJcblx0XHRcdFx0YXJnLS07XHJcblx0XHRcdFx0YSsrO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRwYXRjaCgpO1xyXG5cdFx0XHRtb3ZlQnkoYSk7XHJcblx0XHRcdGF3YWl0IGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0fSBlbHNlIGlmICgvXnMoPzpoaT9mdD8pP2MoPzpvP2woPzp1P21uKT8pPyg/OlxcW3wkKS9pcy50ZXN0KGNvbSkpIHtcclxuXHRcdFx0bGV0IGFyZzogbnVtYmVyID0gTnVtYmVyKGFyZ3MgPz8gMSksIGE6IG51bWJlciA9IDA7XHJcblx0XHRcdFxyXG5cdFx0XHR3aGlsZSAoYXJnIDwgMCkgYXJnICs9IG1hcC5kaW1lbnNbMV07XHJcblx0XHRcdFxyXG5cdFx0XHR3aGlsZSAoYXJnID4gMCkge1xyXG5cdFx0XHRcdGxldCB0OiBtb2QuTnVsbGFibGU8bW9kLnJnbG0uUkdMTS5SR0xNQ2h1bms+ID0gbnVsbDtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRmb3IgKGxldCBpOiBudW1iZXIgPSAwOyBpIDwgbWFwLmRpbWVuc1sxXTsgaSsrKSB7XHJcblx0XHRcdFx0XHRpZiAodCkgdCA9IG1hcC5wbGFjZShbdF0sIGN1clswXSwgaSwgMSlbMF07XHJcblx0XHRcdFx0XHRlbHNlIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgYjogbW9kLnJnbG0uUkdMTS5SR0xNQ2h1bmsgPSBtb2QucmdsbS5SR0xNLlJHTE1DaHVuay5ibGFuaygpO1xyXG5cdFx0XHRcdFx0XHRiLm9ucmVuZGVyID0gKF9pZHg6IG51bWJlciwgYzogbW9kLnJnbG0uUkdMTS5SR0xNQ2h1bmspOiBzdHJpbmcgPT4gYy5wcmludCB8fCAnICc7XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHR0ID0gbWFwLnBsYWNlKFtiXSwgY3VyWzBdLCBpLCAxKVswXTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0aWYgKHQpIG1hcC5wbGFjZShbdF0sIGN1clswXSwgMCwgMSk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0YXJnLS07XHJcblx0XHRcdFx0YSsrO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRwYXRjaCgpO1xyXG5cdFx0XHRtb3ZlQnkoMCwgYSk7XHJcblx0XHRcdGF3YWl0IGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0fSBlbHNlIGlmICghbm9hcmcgJiYgYXJncykge1xyXG5cdFx0XHRsZXQgYzogbW9kLnJnbG0uUkdMTS5SR0xNQ2h1bmsgPSBtb2QucmdsbS5SR0xNLlJHTE1DaHVuay5ibGFuaygpO1xyXG5cdFx0XHRcclxuXHRcdFx0Y29uc3QgczogW3N0cmluZywgbnVtYmVyLCBudW1iZXIsIG51bWJlciwgbnVtYmVyXSA9IGFyZ3Muc3BsaXQoJywnKSBhcyBbc3RyaW5nLCBudW1iZXIsIG51bWJlciwgbnVtYmVyLCBudW1iZXJdO1xyXG5cdFx0XHRcclxuXHRcdFx0Yy5jaHJcdD0gc1swXS50b1N0cmluZygpLmNoYXJBdCgwKSA/PyAnJztcclxuXHRcdFx0Yy5mZ1x0PSBNYXRoLm1heChNYXRoLm1pbihOdW1iZXIoc1sxXSA/PyAweGZmKSwgMHhmZiksIDApO1xyXG5cdFx0XHRjLmJnXHQ9IE1hdGgubWF4KE1hdGgubWluKE51bWJlcihzWzJdID8/IDB4ZmYpLCAweGZmKSwgMCk7XHJcblx0XHRcdGMuc3RcdD0gTWF0aC5tYXgoTWF0aC5taW4oTnVtYmVyKHNbM10gPz8gMHhmZiksIDB4ZmYpLCAwKTtcclxuXHRcdFx0Yy5jdXN0XHQ9IE1hdGgubWF4KE1hdGgubWluKE51bWJlcihzWzRdID8/IDB4ZmYpLCAweGZmKSwgMCk7XHJcblx0XHRcdFxyXG5cdFx0XHRtYXAucGxhY2UoW2NdLCAuLi5jdXIpO1xyXG5cdFx0XHRtb3ZlQnkoMSk7XHJcblx0XHRcdGF3YWl0IGNvbW1hbmQoXCJkLnJcIik7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdGIrKztcclxuXHRcdGErKztcclxuXHRcdGMrKztcclxuXHR9XHJcblx0XHJcblx0YSA9IDA7XHJcbn0gLy9jb21tYW5kXHJcblxyXG5hc3luYyBmdW5jdGlvbiBpbnAoYWNjOiBzdHJpbmcsIGFjaWR4OiBudW1iZXIpIHtcclxuXHRhd2FpdCBSZ2wuY2xlYXIoLTEpO1xyXG5cdGF3YWl0IFJnbC5tb3ZlKDApO1xyXG5cdFJnbC53cml0ZShhY2MpO1xyXG5cdGF3YWl0IFJnbC5tb3ZlKGFjaWR4KTtcclxufSAvL2lucFxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBhc3luYyBmdW5jdGlvbiBNYXAob3V0OiBzdHJpbmcsIGFyZ3M6IENvbW1hbmRMaW5lT3B0aW9ucykge1xyXG5cdGNvbnN0IG1wZzogc3RyaW5nID0gYXJncy5tYXAubWFwcGluZ3MgfHwgYXJncy5tYXAubWFwO1xyXG5cdFxyXG5cdHRyeSB7XHJcblx0XHRSZ2wgPSBhd2FpdCBtb2QucmdsLlJHTC5sb2FkKCk7XHJcblx0XHRcclxuXHRcdGlmIChtcGcpIFJnbC5wYXJzZU1hcHBpbmdzKG1wZyk7XHJcblx0fSBjYXRjaCAoZSkge1xyXG5cdFx0UmdsID0gYXdhaXQgbW9kLnJnbC5SR0wubG9hZCh7XHJcblx0XHRcdG5hbWU6IHBhdGguYmFzZW5hbWUob3V0IHx8IFwibWFwLnJnbG1cIiksXHJcblx0XHRcdG1haW46IFwibWFpbi5qc1wiLFxyXG5cdFx0XHRkZXNjcmlwdGlvbjogXCJyZ2wgbWFwXCIsXHJcblx0XHRcdHZlcnNpb246IFwiMC4xLjBcIixcclxuXHRcdFx0a2V5d29yZHM6IFsgXCJtYXBcIiwgXCJtYWtlXCIsIFwicmdsXCIgXSxcclxuXHRcdFx0bWFwcGluZ3M6IG1wZyB8fCBcIm1hcHBpbmdzLmpzXCJcclxuXHRcdH0pO1xyXG5cdH1cclxuXHRcclxuXHRSZ2wuY2FwdHVyZSgpO1xyXG5cdGF3YWl0IFJnbC5jbGVhcigpO1xyXG5cdFxyXG5cdHRyeSB7XHJcblx0XHRtYXAgPSBhd2FpdCBtb2QucmdsbS5SR0xNLlJHTE1hcC5wYXJzZShnb3V0ID0gb3V0IHx8IGBtYXAke01hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIDB4ZmZmZmZmZmYpfS5yZ2xtYCwgUmdsKTtcclxuXHR9IGNhdGNoKGUpIHtcclxuXHRcdG1hcCA9IG1vZC5yZ2xtLlJHTE0uUkdMTWFwLmJsYW5rKFJnbCk7XHJcblx0XHRtYXAucGFyZW50ID0gUmdsO1xyXG5cdFx0bWFwLl9sb2FkZWRGcm9tID0gZ291dCA9IG91dCB8fCBgbWFwJHtNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAweGZmZmZmZmZmKX0ucmdsbWA7XHJcblx0fVxyXG5cdFxyXG5cdFJnbC53cml0ZUUoYExvYWRlZCBtYXBwaW5nczogJHtwYXRoLnJlc29sdmUoUmdsLmNmZy5tYXBwaW5ncyEpfWApO1xyXG5cdFJnbC53cml0ZUUoYFdyaXRpbmc6ICR7Z291dCA9IHBhdGgucmVzb2x2ZShnb3V0KX1gKTtcclxuXHRSZ2wud3JpdGVFKGhlbHAoKSk7XHJcblx0XHJcblx0bGV0IGFjYzogc3RyaW5nID0gXCJcIixcclxuXHRcdGhpc3Rvcnk6IHN0cmluZ1tdID0gW10sXHJcblx0XHRoaXN0aWR4OiBudW1iZXIgPSAwLFxyXG5cdFx0YWNpZHg6IG51bWJlciA9IDA7XHJcblx0XHJcblx0cGF0Y2goKTtcclxuXHRtb3ZlQnkoKTtcclxuXHRcclxuXHRSZ2wub24oXCJyYXdrZXlcIiwgYXN5bmMgKGs6IEJ1ZmZlcikgPT4ge1xyXG5cdFx0aWYgKCFtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuY3RybEMuY29tcGFyZShrKSkgcXVpdCgpO1xyXG5cdFx0ZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5lbnRlci5jb21wYXJlKGspKSB7XHJcblx0XHRcdGlmICghYWNjKSByZXR1cm47XHJcblx0XHRcdFxyXG5cdFx0XHRhd2FpdCBSZ2wuY2xlYXIoLTEpO1xyXG5cdFx0XHRhd2FpdCBSZ2wubW92ZSgwKTtcclxuXHRcdFx0XHJcblx0XHRcdGF3YWl0IGNvbW1hbmQoYWNjKTtcclxuXHRcdFx0XHJcblx0XHRcdGhpc3RvcnkucHVzaChhY2MpO1xyXG5cdFx0XHR3aGlsZSAoaGlzdG9yeS5sZW5ndGggPiAxMDApIGhpc3Rvcnkuc2hpZnQoKTtcclxuXHRcdFx0XHJcblx0XHRcdGFjYyA9IFwiXCI7XHJcblx0XHRcdGFjaWR4ID0gaGlzdGlkeCA9IDA7XHJcblx0XHR9IGVsc2UgaWYgKCFtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuYWx0RW50ZXIuY29tcGFyZShrKSkge1xyXG5cdFx0XHRpZiAoIWFjYykgcmV0dXJuO1xyXG5cdFx0XHRcclxuXHRcdFx0YXdhaXQgUmdsLm1vdmUoMCk7XHJcblx0XHRcdFxyXG5cdFx0XHRhd2FpdCBjb21tYW5kKGFjYyk7XHJcblx0XHRcdFxyXG5cdFx0XHRoaXN0b3J5LnB1c2goYWNjKTtcclxuXHRcdFx0d2hpbGUgKGhpc3RvcnkubGVuZ3RoID4gMTAwKSBoaXN0b3J5LnNoaWZ0KCk7XHJcblx0XHRcdFxyXG5cdFx0XHRoaXN0aWR4ID0gMDtcclxuXHRcdFx0XHJcblx0XHRcdGF3YWl0IGlucChhY2MsIGFjaWR4KTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy50YWIuY29tcGFyZShrKSkge1xyXG5cdFx0XHRjb25zdCBzdWc6IHN0cmluZ1tdID0gaGlzdG9yeS5maWx0ZXIoKHM6IHN0cmluZyk6IGJvb2xlYW4gPT4gcy50b0xvd2VyQ2FzZSgpLnN0YXJ0c1dpdGgoYWNjLnRvTG93ZXJDYXNlKCkpKS5zb3J0KCk7XHJcblx0XHRcdFxyXG5cdFx0XHRpZiAoc3VnLmxlbmd0aCA+IDEpIHtcclxuXHRcdFx0XHRhd2FpdCBSZ2wuY2xlYXIoLTEpO1xyXG5cdFx0XHRcdFJnbC5tb3ZlKDApO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdFJnbC53cml0ZUUoc3VnLmpvaW4oJ1xcdCcpKTtcclxuXHRcdFx0fSBlbHNlIGlmIChzdWcubGVuZ3RoID09IDEpIHtcclxuXHRcdFx0XHRhY2MgPSBzdWdbMF07XHJcblx0XHRcdFx0YWNpZHggPSBhY2MubGVuZ3RoO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRhd2FpdCBpbnAoYWNjLCBhY2lkeCk7XHJcblx0XHR9IGVsc2UgaWYgKCFtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuYmFjay5jb21wYXJlKGspKSB7XHJcblx0XHRcdGFjYyA9IGFjYy5zbGljZSgwLCBNYXRoLm1heChhY2lkeCAtIDEsIDApKSArIGFjYy5zbGljZShhY2lkeCk7XHJcblx0XHRcdFxyXG5cdFx0XHRhd2FpdCBpbnAoYWNjLCBhY2lkeCA9IE1hdGgubWF4KGFjaWR4IC0gMSwgMCkpO1xyXG5cdFx0fSBlbHNlIGlmICghbW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLmRlbC5jb21wYXJlKGspKSB7XHJcblx0XHRcdGFjYyA9IGFjYy5zbGljZSgwLCBhY2lkeCkgKyBhY2Muc2xpY2UoYWNpZHggKyAxKTtcclxuXHRcdFx0XHJcblx0XHRcdGF3YWl0IGlucChhY2MsIGFjaWR4KTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy51cC5jb21wYXJlKGspKSB7XHJcblx0XHRcdG1vdmVCeSgwLCAtMSk7XHJcblx0XHRcdGF3YWl0IGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0XHRcclxuXHRcdFx0YXdhaXQgaW5wKGFjYywgYWNpZHgpO1xyXG5cdFx0fSBlbHNlIGlmICghbW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLmRvd24uY29tcGFyZShrKSkge1xyXG5cdFx0XHRtb3ZlQnkoMCwgMSk7XHJcblx0XHRcdGF3YWl0IGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0XHRcclxuXHRcdFx0YXdhaXQgaW5wKGFjYywgYWNpZHgpO1xyXG5cdFx0fSBlbHNlIGlmICghbW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLnJpZ2h0LmNvbXBhcmUoaykpIHtcclxuXHRcdFx0bW92ZUJ5KDEsIDApO1xyXG5cdFx0XHRhd2FpdCBjb21tYW5kKFwiZFwiKTtcclxuXHRcdFx0XHJcblx0XHRcdGF3YWl0IGlucChhY2MsIGFjaWR4KTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5sZWZ0LmNvbXBhcmUoaykpIHtcclxuXHRcdFx0bW92ZUJ5KC0xLCAwKTtcclxuXHRcdFx0YXdhaXQgY29tbWFuZChcImRcIik7XHJcblx0XHRcdFxyXG5cdFx0XHRhd2FpdCBpbnAoYWNjLCBhY2lkeCk7XHJcblx0XHR9IGVsc2UgaWYgKCEobW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLmZuVXAuY29tcGFyZShrKSAmJiBtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuZm5MZWZ0LmNvbXBhcmUoaykpKSB7XHJcblx0XHRcdGF3YWl0IGlucChhY2MsIGFjaWR4ID0gMCk7XHJcblx0XHR9IGVsc2UgaWYgKCEobW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLmZuRG93bi5jb21wYXJlKGspICYmIG1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5mblJpZ2h0LmNvbXBhcmUoaykpKSB7XHJcblx0XHRcdGF3YWl0IGlucChhY2MsIGFjaWR4ID0gYWNjLmxlbmd0aCk7XHJcblx0XHR9IGVsc2UgaWYgKCFtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuc2hpZnRVcC5jb21wYXJlKGspKSB7XHJcblx0XHRcdGhpc3RpZHggPSBoaXN0aWR4IDw9IGhpc3RvcnkubGVuZ3RoID8gKGhpc3RpZHggKyAxKSA6IGhpc3RpZHg7XHJcblx0XHRcdFxyXG5cdFx0XHRhY2MgPSBoaXN0b3J5W2hpc3RvcnkubGVuZ3RoIC0gaGlzdGlkeF0gPz8gYWNjO1xyXG5cdFx0XHRcclxuXHRcdFx0YXdhaXQgaW5wKGFjYywgYWNpZHggPSBhY2MubGVuZ3RoKTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5zaGlmdERvd24uY29tcGFyZShrKSkge1xyXG5cdFx0XHRoaXN0aWR4ID0gaGlzdGlkeCA+IDAgPyAoaGlzdGlkeCAtIDEpIDogaGlzdGlkeDtcclxuXHRcdFx0XHJcblx0XHRcdGFjYyA9IGhpc3RvcnlbaGlzdG9yeS5sZW5ndGggLSBoaXN0aWR4XSA/PyBhY2M7XHJcblx0XHRcdFxyXG5cdFx0XHRhd2FpdCBpbnAoYWNjLCBhY2lkeCA9IGFjYy5sZW5ndGgpO1xyXG5cdFx0fSBlbHNlIGlmICghbW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLnNoaWZ0UmlnaHQuY29tcGFyZShrKSkge1xyXG5cdFx0XHRhd2FpdCBpbnAoYWNjLCBhY2lkeCA9IE1hdGgubWluKGFjaWR4ICsgMSwgYWNjLmxlbmd0aCkpO1xyXG5cdFx0fSBlbHNlIGlmICghbW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLnNoaWZ0TGVmdC5jb21wYXJlKGspKSB7XHJcblx0XHRcdGF3YWl0IGlucChhY2MsIGFjaWR4ID0gTWF0aC5tYXgoYWNpZHggLSAxLCAwKSk7XHJcblx0XHR9IGVsc2UgaWYgKCFtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuY3RybEZuVXAuY29tcGFyZShrKSkge1xyXG5cdFx0XHRtb3ZlKGN1clswXSwgMCk7XHJcblx0XHRcdGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0fSBlbHNlIGlmICghbW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLmN0cmxGbkRvd24uY29tcGFyZShrKSkge1xyXG5cdFx0XHRtb3ZlKGN1clswXSwgbWFwLmRpbWVuc1sxXSAtIDEpO1xyXG5cdFx0XHRjb21tYW5kKFwiZFwiKTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5jdHJsRm5SaWdodC5jb21wYXJlKGspKSB7XHJcblx0XHRcdG1vdmUobWFwLmRpbWVuc1swXSAtIDEsIGN1clsxXSk7XHJcblx0XHRcdGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0fSBlbHNlIGlmICghbW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLmN0cmxGbkxlZnQuY29tcGFyZShrKSkge1xyXG5cdFx0XHRtb3ZlKDAsIGN1clsxXSk7XHJcblx0XHRcdGNvbW1hbmQoXCJkXCIpO1xyXG5cdFx0fSBlbHNlIGlmICghbW9kLnJnbC5SR0wuc3BlY2lhbF9rZXlzLmN0cmxVcC5jb21wYXJlKGspKSB7XHJcblx0XHRcdGNvbW1hbmQoXCJtdVwiKTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5jdHJsRG93bi5jb21wYXJlKGspKSB7XHJcblx0XHRcdGNvbW1hbmQoXCJtZFwiKTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5jdHJsUmlnaHQuY29tcGFyZShrKSkge1xyXG5cdFx0XHRjb21tYW5kKFwibXJcIik7XHJcblx0XHR9IGVsc2UgaWYgKCFtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuY3RybExlZnQuY29tcGFyZShrKSkge1xyXG5cdFx0XHRjb21tYW5kKFwibWxcIik7XHJcblx0XHR9IGVsc2UgaWYgKCFtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuY3RybFNoaWZ0VXAuY29tcGFyZShrKSkge1xyXG5cdFx0XHRjb21tYW5kKFwic2NbLTFcIik7XHJcblx0XHR9IGVsc2UgaWYgKCFtb2QucmdsLlJHTC5zcGVjaWFsX2tleXMuY3RybFNoaWZ0RG93bi5jb21wYXJlKGspKSB7XHJcblx0XHRcdGNvbW1hbmQoXCJzY1wiKTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5jdHJsU2hpZnRSaWdodC5jb21wYXJlKGspKSB7XHJcblx0XHRcdGNvbW1hbmQoXCJzclwiKTtcclxuXHRcdH0gZWxzZSBpZiAoIW1vZC5yZ2wuUkdMLnNwZWNpYWxfa2V5cy5jdHJsU2hpZnRMZWZ0LmNvbXBhcmUoaykpIHtcclxuXHRcdFx0Y29tbWFuZChcInNyWy0xXCIpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0bGV0IHM6IHN0cmluZyA9IGsudG9TdHJpbmcoXCJ1dGY4XCIpO1xyXG5cdFx0XHRhY2MgPSBhY2Muc2xpY2UoMCwgYWNpZHgpICsgcyArIGFjYy5zbGljZShhY2lkeCk7XHJcblx0XHRcdFxyXG5cdFx0XHRhd2FpdCBpbnAoYWNjLCArK2FjaWR4KTtcclxuXHRcdH1cclxuXHR9KTtcclxufTsgLy9tYXBcclxuIl19