#!/usr/bin/env node

"use strict";

import * as mod from "../lib/rgl";
import * as path from "path";
import * as util from "util";

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
	ctrl-C/qt	-	Quit

Separate Commands with '.' (dot)`;
} //help

function move(x: number = cur[0], y: number = cur[1]) {
	cur[0] = Math.max(x, 0) % map.dimens[0];
	cur[1] = Math.max(y, 0) % map.dimens[1];
	
	return cur;
} //move
function moveBy(dx: number = 0, dy: number = 0) {
	return move(cur[0] + dx, cur[1] + dy);
} //moveBy

async function render() {
	await command('c');
	await map.stamp();
} //render

function pad(prev: number, n: number = map.dimens[0] * map.dimens[1], wild: boolean = false) {
	for (let i: number = prev; i < n; i++)
		if (!map.chunks[i]) map.chunks.push(mod.rglm.RGLM.RGLMChunk.blank());
	
	prev = Math.min(map.chunks.length, prev);
	
	while (n < prev) {
		if (wild || !map.chunks[map.chunks.length - 1].chr) {
			map.chunks.pop();
			prev--;
		} else break;
	}
	
	command("d");
} //pad

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
		else if (/^d(?:is(?:p(?:l(?:ay)?)?)?)?/is.test(com)) await render();
		else if (/^c(?:l(?:(?:ea)?[rn])?)?/is.test(com)) await Rgl.clear();
		else if (/^e(?:v(?:a?l(?:uate)?)?)?/is.test(com)) {
			Rgl.writeE(util.inspect(await eval(args ?? "")));
		} else if (/^(?:q(?:(?:ui)?t)?|e(?:(?:xi)?t)?)/is.test(com)) quit();
		else if (/^s(?:ave?|to?re?)?/is.test(com)) {
			await map.store(args);
			Rgl.writeE("Map saved.");
		} else if (/^(?:re?)?l(?:(?:oa)?d)?/is.test(com)) {
			map = await mod.rglm.RGLM.RGLMap.parse(args ?? gout, Rgl);
			Rgl.writeE("Map loaded.");
		} else if (/re?(?:s(?:i?ze?)?)?/is.test(com)) {
			if (args) {
				const s: number[] = args.split(',').map(n => Number(n)),
					prev: number = map.dimens[0] * map.dimens[1];
				
				map.dimens[0] = Math.max(typeof s[0] == "number" ? s[0] : map.dimens[0], 0);
				map.dimens[1] = Math.max(typeof s[1] == "number" ? s[1] : map.dimens[1], 0);
				
				pad(prev);
			}
			
			Rgl.writeE(`Size: ${map.dimens.join(", ")}\tCursor: ${cur.join(", ")}`);
		} else if (/^t(?:ri?m)?/is.test(com)) {
			const s: number[] = args ? args.split(',').map(n => Number(n)) : [ ];
			
			pad(typeof s[0] == "number" ? s[0] : map.chunks.length, typeof s[1] == "number" ? s[1] : (map.dimens[0] * map.dimens[1]), true);
		} else if (!noarg) {
			let c: mod.rglm.RGLM.RGLMChunk = mod.rglm.RGLM.RGLMChunk.blank();
			
			if (args) {
				const s: [string, number, number, number, number] = args.split(',') as [string, number, number, number, number];
				
				c.chr	= s[0].toString().slice(0, 4) ?? '';
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
	console.info(`Writing: ${out ?? "map.rglm"}`);
	
	const mpg: mod.Nullable<string> = /-{0,2}m(?:ap(?:pings?)?)?/.test(args[0]) ? args[1] : null;
	
	try {
		Rgl = await mod.rgl.RGL.load();
		
		if (mpg) Rgl.parseMappings(mpg);
	} catch (e) {
		Rgl = await mod.rgl.RGL.load({
			name: path.win32.basename(out ?? "map.rglm"),
			main: "main.js",
			description: "rgl map",
			version: "0.1.0",
			keywords: [ "map", "make", "rgl" ],
			mappings: mpg ?? "mappings.js"
		});
	}
	
	Rgl.capture();
	await Rgl.clear();
	
	try {
		map = await mod.rglm.RGLM.RGLMap.parse(gout = out ?? `map${Math.round(Math.random() * 0xffffffff)}.rglm`, Rgl);
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
		} else if (!mod.rgl.RGL.special_keys.back.compare(k)) {
			acc = acc.slice(0, acc.length - 1);
			await Rgl.move(-1, 0, true);
			Rgl.write(' ');
			await Rgl.move(-1, 0, true);
		} else if (!mod.rgl.RGL.special_keys.up.compare(k)) {
			moveBy(0, -1);
		} else if (!mod.rgl.RGL.special_keys.down.compare(k)) {
			moveBy(0, 1);
		} else if (!mod.rgl.RGL.special_keys.right.compare(k)) {
			moveBy(1, 0);
		} else if (!mod.rgl.RGL.special_keys.left.compare(k)) {
			moveBy(-1, 0);
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
