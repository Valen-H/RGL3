#!/usr/bin/env node

"use strict";

import * as mod from "../lib/rgl";
import * as path from "path";
import * as util from "util";
import * as os from "os";
import chalk from "chalk";

let qtcn: boolean = false,
	Rgl: mod.rgl.RGL,
	map: mod.rglm.RGLM.RGLMap,
	gout: string,
	cur: [number, number] = [ 0, 0 ];

function help(): string {
	return `Commands:
	h			-	Display this help screen
	d			-	Display Map
	c			-	Clear Screen
	s			-	Save Map
	l			-	Load Map
	r			-	Resize Map (Very Important to do first!!)
	t			-	Trim leftovers after resize
	ev[cd		-	Evaluate code
	m			-	Set/Get Metadata
	mv		   -	Move Cursor (can also use keyboard arrows)
	mov[udrl]	-	Move Line
	d[cr]		-	Delete Column/Row and resize
	[ch,1,2,3	-	Place Chunk
	ctrl-C/qt	-	Quit

Separate Commands with '.' (dot)
Pass parameters with X[arg,...
Hit ENTER to execute (or alt-enter to persist)
Access command history with shift+up/down`;
} //help

function move(x: number = cur[0], y: number = cur[1]) {
	let t: mod.rglm.RGLM.RGLMChunk;
	if (t = map.get(...cur)) t.onrender = (_idx: number, c: mod.rglm.RGLM.RGLMChunk) => c.chr ? c.print : ' ';
	
	cur[0] = x % (map.dimens[0] || 1);
	cur[1] = y % (map.dimens[1] || 1);
	
	while (cur[0] < 0) cur[0] += map.dimens[0];
	while (cur[1] < 0) cur[1] += map.dimens[1];
	
	if (t = map.get(...cur)) t.onrender = (_idx: number, _c: mod.rglm.RGLM.RGLMChunk) => chalk.inverse.italic.bold.italic('@');
	
	return cur;
} //move
function moveBy(dx: number = 0, dy: number = 0) {
	return move(cur[0] + dx, cur[1] + dy);
} //moveBy

async function render() {
	await command('c');
	await map.stamp();
} //render

function pad(n: number = map.dimens[0] * map.dimens[1], wild: boolean = false) {
	while (map.chunks.length < n) {
		const p: mod.rglm.RGLM.RGLMChunk = mod.rglm.RGLM.RGLMChunk.blank();
		
		map.chunks.push(p);
		p.onrender = (_idx: number, c: mod.rglm.RGLM.RGLMChunk): string => c.chr ? c.print : ' ';
	}
	
	while (n < map.chunks.length) {
		if (wild || !map.chunks[map.chunks.length - 1].chr)
			map.chunks.pop();
		else break;
	}
	
	return command("d");
} //pad
function patch() {
	return map.chunks.forEach((c: mod.rglm.RGLM.RGLMChunk) => c.onrender = (_idx: number, c: mod.rglm.RGLM.RGLMChunk): string => c.chr ? c.print : ' ');
} //patch

function quit(): void {
	if (!qtcn) {
		Rgl.writeE("Press Quit again.");
		qtcn = true;
		setTimeout(() => (qtcn = false), 2000);
	} else {
		Rgl.writeE("Quit.");
		process.exit(1);
	}
} //quit

async function command(acc: string) {
	let comm: string[] = acc.split(/(?<!\\)\./gmi).map(c => c.replaceAll(/(?<!\\)\\/gmi, '').replaceAll("\\\\", "\\"));
	
	for (const com of comm) {
		const args: string = (com.match(/\[(.+)$/mis) || [ ])[1],
			noarg: string = com.replace(/\[.*$/mis, "");
		
		if (/^h(?:elp)?/is.test(com)) Rgl.writeE(help());
		else if (/^d(?:is(?:p(?:l(?:ay)?)?)?)?(?:\[|$)/is.test(com)) await render();
		else if (/^c(?:l(?:(?:ea)?[rn])?)?(?:\[|$)/is.test(com)) await Rgl.clear();
		else if (/^e(?:v(?:a?l(?:uate)?)?)?(?:\[|$)/is.test(com)) {
			Rgl.writeE(util.inspect(await eval(args ?? "")));
		} else if (/^(?:q(?:(?:ui)?t)?|e(?:(?:xi)?t)?)(?:\[|$)/is.test(com)) quit();
		else if (/^s(?:ave?|to?re?)?(?:\[|$)/is.test(com)) {
			await map.store(args);
			Rgl.writeE("Map saved.");
		} else if (/^(?:re?)?l(?:(?:oa)?d)?(?:\[|$)/is.test(com)) {
			map = await mod.rglm.RGLM.RGLMap.parse(args || gout, Rgl);
			patch();
			Rgl.writeE("Map loaded.");
		} else if (/^re?(?:s(?:i?ze?)?)?(?:\[|$)/is.test(com)) {
			if (args) {
				const s: number[] = args.split(',').map(Number);
				
				map.dimens[0] = Math.max(typeof s[0] == "number" ? s[0] : map.dimens[0], 0);
				map.dimens[1] = Math.max(typeof s[1] == "number" ? s[1] : map.dimens[1], 0);
				
				await pad();
			}
			
			Rgl.writeE(`Size: ${map.dimens.join(", ")}\tCursor: ${cur.join(", ")}`);
		} else if (/^t(?:ri?m)?/is.test(com)) {
			const s: number = args ? Number(args) : (map.dimens[0] * map.dimens[1]);
			
			await pad(s, true);
		} else if (/^m(?:eta?(?:da?ta?)?)?(?:\[|$)/is.test(com)) {
			const s: [string, string] = (args ?? "").split('=') as [string, string];
			
			if (s.length >= 2) {
				map.meta[s[0]] = s[1] ?? "";
				command(`meta[${s[0]}`);
			} else if (s.length && s[0]) Rgl.writeE(s[0], " = ", map.meta[s[0]] ?? "");
			else Rgl.writeE(Array.from(Object.entries(map.meta || {}).map(e => "- " + e.join(" = "))).join(os.EOL));
		} else if (/^m(?:ove?|v)?(?:\[|$)/is.test(com)) {
			move(...(args ?? "0,0").split(',').map(Number));
			command("d.r");
		} else if (/^m(?:ove?|v)?up?(?:\[|$)/is.test(com)) {
			let by: number = -1;
			
			if (args) by = -Number(args);
			
			let t = by + cur[1];
			
			while (t < 0) t += map.dimens[1];
			t = t % map.dimens[1];
			
			if (t != cur[1])
				for (let x: number = 0; x < map.dimens[0]; x++)
					map.swap(map.get(x, cur[1]), map.get(x, t));
			
			moveBy(0, by);
			command("d");
		} else if (/^m(?:ove?|v)?d(?:o?wn)?(?:\[|$)/is.test(com)) {
			let by: number = 1;
			
			if (args) by = Number(args);
			
			let t = by + cur[1];
			
			while (t < 0) t += map.dimens[1];
			t = t % map.dimens[1];
			
			if (t != cur[1])
				for (let x: number = 0; x < map.dimens[0]; x++)
					map.swap(map.get(x, cur[1]), map.get(x, t));
			
			moveBy(0, by);
			command("d");
		} else if (/^m(?:ove?|v)?r(?:i?gh?t)?(?:\[|$)/is.test(com)) {
			let by: number = 1;
			
			if (args) by = Number(args);
			
			let t = by + cur[0];
			
			while (t < 0) t += map.dimens[0];
			t = t % map.dimens[0];
			
			if (t != cur[0])
				for (let y: number = 0; y < map.dimens[1]; y++)
					map.swap(map.get(cur[0], y), map.get(t, y));
			
			moveBy(by);
			command("d");
		} else if (/^m(?:ove?|v)?l(?:e?ft)?(?:\[|$)/is.test(com)) {
			let by: number = -1;
			
			if (args) by = -Number(args);
			
			let t = by + cur[0];
			
			while (t < 0) t += map.dimens[0];
			t = t % map.dimens[0];
			
			if (t != cur[0])
				for (let y: number = 0; y < map.dimens[1]; y++)
					map.swap(map.get(cur[0], y), map.get(t, y));
			
			moveBy(by);
			command("d");
		} else if (/^d(?:e?l(?:e?te?))?r(?:o?w)?(?:\[|$)/is.test(com)) {
			map.place([], 0, cur[1], map.dimens[0]);
			moveBy();
			await command(`d.r[${map.dimens[0]},${Math.max(map.dimens[1] - 1, 0)}`);
			if (Number(args ?? 0) > 1) await command("dr.".repeat(Number(args) - 1));
		} else if (/^d(?:e?l(?:e?te?))?c(?:o?l(?:u?mn)?)?(?:\[|$)/is.test(com)) {
			let dellist: mod.rglm.RGLM.RGLMChunk[] = [ ];
			
			for (let i: number = 0; i < map.dimens[1]; i++) {
				const t: mod.rglm.RGLM.RGLMChunk = map.get(cur[0], i);
				
				if (!t) continue;
				
				t.onrender = (_idx: number, c: mod.rglm.RGLM.RGLMChunk): string => c.print;
				dellist.push(t);
			}
			
			moveBy();
			dellist.forEach(d => map.place([], ...map.calcChkCrd(d)));
			
			await command(`d.r[${Math.max(map.dimens[0] - 1, 0)},${map.dimens[1]}`);
			if (Number(args ?? 0) > 1) await command("dc.".repeat(Number(args) - 1));
		} else if (/^del(?:ete)?(?:\[|$)/is.test(com)) {
			Rgl.writeE("Unimplemented");
		} else if (/^b(?:l(?:an)?k)?r(?:o?w)?(?:\[|$)/is.test(com)) {
			Rgl.writeE("Unimplemented");
		} else if (/^b(?:l(?:an)?k)?c(?:o?l(?:u?mn)?)?(?:\[|$)/is.test(com)) {
			Rgl.writeE("Unimplemented");
		} else if (/^b(?:l(?:an)?k)?(?:\[|$)/is.test(com)) {
			Rgl.writeE("Unimplemented");
		} else if (/^sw(?:a?p)?(?:\[|$)/is.test(com)) {
			Rgl.writeE("Unimplemented");
		} else if (/^s(?:hi?ft?)?r(?:o?w)?(?:\[|$)/is.test(com)) {
			Rgl.writeE("Unimplemented");
		} else if (/^s(?:hi?ft?)?c(?:o?l(?:u?mn)?)?(?:\[|$)/is.test(com)) {
			Rgl.writeE("Unimplemented");
		} else if (!noarg) {
			let c: mod.rglm.RGLM.RGLMChunk = mod.rglm.RGLM.RGLMChunk.blank();
			
			if (args) {
				const s: [string, number, number, number, number] = args.split(',') as [string, number, number, number, number];
				
				c.chr	= s[0].toString().charAt(0) ?? '';
				c.fg	= Math.max(Math.min(Number(s[1] ?? 0xff), 0xff), 0);
				c.bg	= Math.max(Math.min(Number(s[2] ?? 0xff), 0xff), 0);
				c.st	= Math.max(Math.min(Number(s[3] ?? 0xff), 0xff), 0);
				c.cust	= Math.max(Math.min(Number(s[4] ?? 0xff), 0xff), 0);
			}
			
			map.place([c], ...cur);
			moveBy(1);
			command("d.r");
		}
	}
} //command

module.exports = async function Map(out: string, ...args: string[]) {
	console.info(`Writing: ${out || "map.rglm"}`);
	
	const mpg: mod.Nullable<string> = /-{0,2}m(?:ap(?:pings?)?)?/.test(args[0]) ? args[1] : null;
	
	try {
		Rgl = await mod.rgl.RGL.load();
		
		if (mpg) Rgl.parseMappings(mpg);
	} catch (e) {
		Rgl = await mod.rgl.RGL.load({
			name: path.win32.basename(out || "map.rglm"),
			main: "main.js",
			description: "rgl map",
			version: "0.1.0",
			keywords: [ "map", "make", "rgl" ],
			mappings: mpg || "mappings.js"
		});
	}
	
	Rgl.capture();
	await Rgl.clear();
	
	try {
		map = await mod.rglm.RGLM.RGLMap.parse(gout = out || `map${Math.round(Math.random() * 0xffffffff)}.rglm`, Rgl);
	} catch(e) {
		map = mod.rglm.RGLM.RGLMap.blank(Rgl);
		map.parent = Rgl;
		map._loadedFrom = gout = `map${Math.round(Math.random() * 0xffffffff)}.rglm`;
	}
	
	Rgl.writeE(`Writing: ${gout}`);
	Rgl.writeE(help());
	
	let acc: string = "",
		history: string[] = [],
		histidx: number = 0,
		acidx: number = 0;
	
	patch();
	moveBy(0, 0);
	
	Rgl.on("rawctrlkey", async (k, c, a, b) => {
		if (!mod.rgl.RGL.special_keys.ctrlC.compare(k)) quit();
		else if (!mod.rgl.RGL.special_keys.enter.compare(k)) {
			if (!acc) return;
			
			await Rgl.clear(-1);
			await Rgl.move(0);
			
			await command(acc);
			
			history.push(acc);
			while (history.length > 100) history.shift();
			
			acc = "";
			acidx = histidx = 0;
		} else if (!mod.rgl.RGL.special_keys.altEnter.compare(k)) {
			if (!acc) return;
			
			await Rgl.move(0);
			
			await command(acc);
			
			history.push(acc);
			while (history.length > 100) history.shift();
			
			histidx = 0;
		} else if (!mod.rgl.RGL.special_keys.back.compare(k)) {
			acc = acc.slice(0, acc.length - 1);
			await Rgl.move(-1, 0, true);
			Rgl.write(' ');
			await Rgl.move(-1, 0, true);
		} else if (!mod.rgl.RGL.special_keys.up.compare(k)) {
			moveBy(0, -1);
			command("d");
		} else if (!mod.rgl.RGL.special_keys.down.compare(k)) {
			moveBy(0, 1);
			command("d");
		} else if (!mod.rgl.RGL.special_keys.right.compare(k)) {
			moveBy(1, 0);
			command("d");
		} else if (!mod.rgl.RGL.special_keys.left.compare(k)) {
			moveBy(-1, 0);
			command("d");
		} else if (!mod.rgl.RGL.special_keys.shiftUp.compare(k)) {
			histidx = histidx <= history.length ? (histidx + 1) : histidx;
			
			acc = history[history.length - histidx] ?? acc;
			
			await Rgl.clear(-1);
			await Rgl.move(0);
			Rgl.write(acc);
		} else if (!mod.rgl.RGL.special_keys.shiftDown.compare(k)) {
			histidx = histidx > 0 ? (histidx - 1) : histidx;
			
			acc = history[history.length - histidx] ?? acc;
			
			await Rgl.clear(-1);
			await Rgl.move(0);
			Rgl.write(acc);
		} else {
			let s: string = b.toString();
			acc += s;
			Rgl.write(s);
			acidx++;
		}
	});
}; //map
