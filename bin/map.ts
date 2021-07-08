#!/usr/bin/env node
/// <reference path="@types/command-line-args">

"use strict";

import * as mod from "../lib/rgl";
import * as path from "path";
import * as util from "util";
import * as os from "os";
import chalk from "chalk";
import { CommandLineOptions } from "command-line-args";

let qtcn: boolean = false,
	Rgl: mod.rgl.RGL,
	map: mod.rglm.RGLM.RGLMap,
	gout: string,
	cur: [number, number] = [ 0, 0 ],
	prev: [number, number] = [ 0, 0 ];

function help(): string {
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

function move(x: number = cur[0], y: number = cur[1]) {
	let t: mod.rglm.RGLM.RGLMChunk;
	if (t = map.get(...prev)) t.onrender = (_idx: number, c: mod.rglm.RGLM.RGLMChunk) => c.chr ? c.print : ' ';
	if (t = map.get(...cur)) t.onrender = (_idx: number, c: mod.rglm.RGLM.RGLMChunk) => c.chr ? c.print : ' ';
	
	[prev[0], prev[1]] = cur;
	
	cur[0] = x % (map.dimens[0] || 1);
	while (cur[0] < 0) cur[0] += map.dimens[0];
	
	cur[1] = y % (map.dimens[1] || 1);
	while (cur[1] < 0) cur[1] += map.dimens[1];
	
	if (cur[0] + map.scroll[0] < 0) map.scroll[0] -= cur[0] + map.scroll[0];
	else if (cur[0] + map.scroll[0] >= map.parent.sout.columns) map.scroll[0] -= cur[0] + map.scroll[0] - map.parent.sout.columns + 1;
	if (cur[1] + map.scroll[1] < 0) map.scroll[1] -= cur[1] + map.scroll[1];
	else if (cur[1] + map.scroll[1] >= map.parent.sout.rows) map.scroll[1] -= cur[1] + map.scroll[1] - map.parent.sout.rows + 1;
	
	if (t = map.get(...cur)) t.onrender = (_idx: number, _c: mod.rglm.RGLM.RGLMChunk) => chalk.inverse.italic.bold.italic('@');
	
	return cur;
} //move
function moveBy(dx: number = 0, dy: number = 0) {
	return move(cur[0] + dx, cur[1] + dy);
} //moveBy

async function render(after: string = "") {
	await command(`c${after ? ('.' + after) : ''}`);
	await map.stamp();
} //render

function pad(n: number = map.dimens[0] * map.dimens[1], wild: boolean = false) {
	let t: number = 0, pd: number = 0;
	
	while (map.chunks.length < n) {
		const p: mod.rglm.RGLM.RGLMChunk = mod.rglm.RGLM.RGLMChunk.blank();
		
		map.chunks.push(p);
		pd++;
		p.onrender = (_idx: number, c: mod.rglm.RGLM.RGLMChunk): string => c.chr ? c.print : ' ';
	}
	
	while (n < map.chunks.length) {
		if (wild || !map.chunks[map.chunks.length - 1].chr) {
			map.chunks.pop();
			t++;
		} else break;
	}
	
	return command("d").then(() => Rgl.writeE(chalk.dim`Padded ${pd}, Trimmed ${t}`));
} //pad
function patch() {
	map.chunks.forEach((c: mod.rglm.RGLM.RGLMChunk) => c.onrender = (_idx: number, c: mod.rglm.RGLM.RGLMChunk): string => c.chr ? c.print : ' ');
	
	return moveBy();
} //patch

function quit(): void {
	if (!qtcn) {
		Rgl.clear(-1);
		Rgl.move(0).then(() => Rgl.writeE("Press Quit again."));
		qtcn = true;
		setTimeout(() => (qtcn = false), 2000);
	} else {
		Rgl.writeE("Quit.");
		process.exit(1);
	}
} //quit

async function command(acc: string) {
	let comm: string[] = acc.replaceAll(/(?<=(?:(?:(?<!\\)\.)|^))(.+?)(?<!\\)\|(\d+)/gmis, (m: string, p1: string, p2: string, off: number, str: string): string => (p1 + '.').repeat(Number(p2 || 1))).replaceAll(/(?<!\\)\$/gmis, '.').split(/(?<!\\)\./gmis).map(c => c.replaceAll(/(?<!\\)\\/gmi, '').replaceAll("\\\\", "\\"));
	
	for (const com of comm) {
		const args: string = (com.match(/\[(.*)$/mis) || [ ])[1],
		noarg: string = com.replace(/\[.*$/mis, "");
		
		if (/^h(?:elp)?/is.test(com)) Rgl.writeE(help());
		else if (/^d(?:is(?:p(?:l(?:ay)?)?)?)?(?:\[|$)/is.test(com)) await render(args);
		else if (/^c(?:l(?:(?:ea)?[rn])?)?(?:\[|$)/is.test(com)) await Rgl.clear();
		else if (/^e(?:v(?:a?l(?:uate)?)?)?(?:\[|$)/is.test(com)) {
			Rgl.writeE(util.inspect(await eval(args ?? "")));
		} else if (/^(?:q(?:(?:ui)?t)?|e(?:(?:xi)?t)?)(?:\[|$)/is.test(com)) quit();
		else if (/^s(?:ave?|to?re?)?(?:\[|$)/is.test(com)) {
			await map.store(args);
			Rgl.writeE(`Map saved: ${path.resolve(args || map._loadedFrom)}`);
		} else if (/^(?:re?)?l(?:(?:oa)?d)?(?:\[|$)/is.test(com)) {
			map = await mod.rglm.RGLM.RGLMap.parse(args || gout, Rgl);
			patch();
			await command("d.r.m");
			Rgl.writeE(`Map loaded: ${path.resolve(args || gout)}`);
		} else if (/^re?(?:s(?:i?ze?)?)?(?:\[|$)/is.test(com)) {
			if (args) {
				const s: number[] = args.split(',').map(Number);
				
				map.dimens[0] = Math.max(typeof s[0] == "number" ? s[0] : map.dimens[0], 0);
				map.dimens[1] = Math.max(typeof s[1] == "number" ? s[1] : map.dimens[1], 0);
				
				await pad();
			}
			
			moveBy();
			
			Rgl.writeE(`Size: ${map.dimens.join(", ")}\tCursor: ${cur.join(", ")}`);
		} else if (/^t(?:ri?m)?(?:\[|$)/is.test(com)) {
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
			moveBy();
			map.place([], 0, cur[1], map.dimens[0]);
			moveBy();
			await command("d");
			await command(`r[${map.dimens[0]},${Math.max(map.dimens[1] - 1, 0)}`);
			if (Number(args ?? 0) > 1) await command("dr[" + (Number(args) - 1));
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
			moveBy();
			
			await command("d");
			await command(`r[${Math.max(map.dimens[0] - 1, 0)},${map.dimens[1]}`);
			if (Number(args ?? 0) > 1) await command("dc[" + (Number(args) - 1));
		} else if (/^de?l(?:ete)?(?:\[|$)/is.test(com)) {
			const cr: [number, number] = (args ? args.split(',').map(Number) : cur) as [number, number];
			
			moveBy();
			map.place([], ...cr);
			pad();
			moveBy();
		} else if (/^b(?:l(?:an)?k)?r(?:o?w)?(?:\[|$)/is.test(com)) {
			let c: mod.rglm.RGLM.RGLMChunk[] = [ ];
			
			for (let i: number = 0; i < map.dimens[0]; i++) c.push(mod.rglm.RGLM.RGLMChunk.blank());
			
			map.place(c, 0, cur[1], 0);
			await command(`r[${map.dimens[0]},${map.dimens[1] + 1}`);
			patch();
			await command("d");
			if (Number(args ?? 0) > 1) await command("br[" + (Number(args) - 1));
		} else if (/^b(?:l(?:an)?k)?c(?:o?l(?:u?mn)?)?(?:\[|$)/is.test(com)) {
			await command(`r[${map.dimens[0] + 1},${map.dimens[1]}`);
			
			for (let i: number = 0; i < map.dimens[1]; i++)
				map.place([mod.rglm.RGLM.RGLMChunk.blank()], cur[0], i, 0);
			
			patch();
			await command("d");
			if (Number(args ?? 0) > 1) await command("bc[" + (Number(args) - 1));
		} else if (/^b(?:l(?:an)?k)?(?:\[|$)/is.test(com)) {
			const cr: [number, number] = (args ? args.split(',').map(Number) : cur) as [number, number];
			
			map.place([mod.rglm.RGLM.RGLMChunk.blank()], ...cr, 0);
			
			patch();
			await command("d");
		} else if (/^sw(?:a?p)?(?:\[|$)/is.test(com)) {
			if (args) {
				const cr: [number, number] = (args ? args.split(',').map(Number) : cur) as [number, number];
				
				map.swap(map.get(...cur), map.get(...cr));
				patch();
				moveBy();
			}
			
			command("d");
		} else if (/^s(?:hi?ft?)?r(?:o?w)?(?:\[|$)/is.test(com)) {
			let arg: number = Number(args ?? 1), a: number = 0;
			
			while (arg < 0) arg += map.dimens[0];
			
			while (arg > 0) {
				const t: mod.rglm.RGLM.RGLMChunk = map.chunks.splice(map.calcChkIdx(map.dimens[0] - 1, cur[1]), 1)[0];
				map.chunks.splice(map.calcChkIdx(0, cur[1]), 0, t);
				arg--;
				a++;
			}
			
			patch();
			moveBy(a);
			await command("d");
		} else if (/^s(?:hi?ft?)?c(?:o?l(?:u?mn)?)?(?:\[|$)/is.test(com)) {
			let arg: number = Number(args ?? 1), a: number = 0;
			
			while (arg < 0) arg += map.dimens[1];
			
			while (arg > 0) {
				let t: mod.Nullable<mod.rglm.RGLM.RGLMChunk> = null;
				
				for (let i: number = 0; i < map.dimens[1]; i++) {
					if (t) t = map.place([t], cur[0], i, 1)[0];
					else {
						const b: mod.rglm.RGLM.RGLMChunk = mod.rglm.RGLM.RGLMChunk.blank();
						b.onrender = (_idx: number, c: mod.rglm.RGLM.RGLMChunk): string => c.print || ' ';
						
						t = map.place([b], cur[0], i, 1)[0];
					}
				}
				
				if (t) map.place([t], cur[0], 0, 1);
				
				arg--;
				a++;
			}
			
			patch();
			moveBy(0, a);
			await command("d");
		} else if (!noarg && args) {
			let c: mod.rglm.RGLM.RGLMChunk = mod.rglm.RGLM.RGLMChunk.blank();
			
			const s: [string, number, number, number, number] = args.split(',') as [string, number, number, number, number];
			
			c.chr	= s[0].toString().charAt(0) ?? '';
			c.fg	= Math.max(Math.min(Number(s[1] ?? 0xff), 0xff), 0);
			c.bg	= Math.max(Math.min(Number(s[2] ?? 0xff), 0xff), 0);
			c.st	= Math.max(Math.min(Number(s[3] ?? 0xff), 0xff), 0);
			c.cust	= Math.max(Math.min(Number(s[4] ?? 0xff), 0xff), 0);
			
			map.place([c], ...cur);
			moveBy(1);
			await command("d.r");
		}
	}
} //command

async function inp(acc: string, acidx: number) {
	await Rgl.clear(-1);
	await Rgl.move(0);
	Rgl.write(acc);
	await Rgl.move(acidx);
} //inp

module.exports = async function Map(out: string, args: CommandLineOptions) {
	const mpg: string = args.map.mappings || args.map.map;
	
	try {
		Rgl = await mod.rgl.RGL.load();
		
		if (mpg) Rgl.parseMappings(mpg);
	} catch (e) {
		Rgl = await mod.rgl.RGL.load({
			name: path.basename(out || "map.rglm"),
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
		map._loadedFrom = gout = out || `map${Math.round(Math.random() * 0xffffffff)}.rglm`;
	}
	
	Rgl.writeE(`Loaded mappings: ${path.resolve(Rgl.cfg.mappings!)}`);
	Rgl.writeE(`Writing: ${gout = path.resolve(gout)}`);
	Rgl.writeE(help());
	
	let acc: string = "",
		history: string[] = [],
		histidx: number = 0,
		acidx: number = 0;
	
	patch();
	moveBy();
	
	Rgl.on("rawkey", async (k: Buffer) => {
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
			
			await inp(acc, acidx);
		} else if (!mod.rgl.RGL.special_keys.tab.compare(k)) {
			const sug: string[] = history.filter((s: string): boolean => s.toLowerCase().startsWith(acc.toLowerCase())).sort();
			
			if (sug.length > 1) {
				await Rgl.clear(-1);
				Rgl.move(0);
				
				Rgl.writeE(sug.join('\t'));
			} else if (sug.length == 1) {
				acc = sug[0];
				acidx = acc.length;
			}
			
			await inp(acc, acidx);
		} else if (!mod.rgl.RGL.special_keys.back.compare(k)) {
			acc = acc.slice(0, Math.max(acidx - 1, 0)) + acc.slice(acidx);
			
			await inp(acc, acidx = Math.max(acidx - 1, 0));
		} else if (!mod.rgl.RGL.special_keys.del.compare(k)) {
			acc = acc.slice(0, acidx) + acc.slice(acidx + 1);
			
			await inp(acc, acidx);
		} else if (!mod.rgl.RGL.special_keys.up.compare(k)) {
			moveBy(0, -1);
			await command("d");
			
			await inp(acc, acidx);
		} else if (!mod.rgl.RGL.special_keys.down.compare(k)) {
			moveBy(0, 1);
			await command("d");
			
			await inp(acc, acidx);
		} else if (!mod.rgl.RGL.special_keys.right.compare(k)) {
			moveBy(1, 0);
			await command("d");
			
			await inp(acc, acidx);
		} else if (!mod.rgl.RGL.special_keys.left.compare(k)) {
			moveBy(-1, 0);
			await command("d");
			
			await inp(acc, acidx);
		} else if (!(mod.rgl.RGL.special_keys.fnUp.compare(k) && mod.rgl.RGL.special_keys.fnLeft.compare(k))) {
			await inp(acc, acidx = 0);
		} else if (!(mod.rgl.RGL.special_keys.fnDown.compare(k) && mod.rgl.RGL.special_keys.fnRight.compare(k))) {
			await inp(acc, acidx = acc.length);
		} else if (!mod.rgl.RGL.special_keys.shiftUp.compare(k)) {
			histidx = histidx <= history.length ? (histidx + 1) : histidx;
			
			acc = history[history.length - histidx] ?? acc;
			
			await inp(acc, acidx = acc.length);
		} else if (!mod.rgl.RGL.special_keys.shiftDown.compare(k)) {
			histidx = histidx > 0 ? (histidx - 1) : histidx;
			
			acc = history[history.length - histidx] ?? acc;
			
			await inp(acc, acidx = acc.length);
		} else if (!mod.rgl.RGL.special_keys.shiftRight.compare(k)) {
			await inp(acc, acidx = Math.min(acidx + 1, acc.length));
		} else if (!mod.rgl.RGL.special_keys.shiftLeft.compare(k)) {
			await inp(acc, acidx = Math.max(acidx - 1, 0));
		} else if (!mod.rgl.RGL.special_keys.ctrlFnUp.compare(k)) {
			move(cur[0], 0);
			command("d");
		} else if (!mod.rgl.RGL.special_keys.ctrlFnDown.compare(k)) {
			move(cur[0], map.dimens[1] - 1);
			command("d");
		} else if (!mod.rgl.RGL.special_keys.ctrlFnRight.compare(k)) {
			move(map.dimens[0] - 1, cur[1]);
			command("d");
		} else if (!mod.rgl.RGL.special_keys.ctrlFnLeft.compare(k)) {
			move(0, cur[1]);
			command("d");
		} else if (!mod.rgl.RGL.special_keys.ctrlUp.compare(k)) {
			command("mu");
		} else if (!mod.rgl.RGL.special_keys.ctrlDown.compare(k)) {
			command("md");
		} else if (!mod.rgl.RGL.special_keys.ctrlRight.compare(k)) {
			command("mr");
		} else if (!mod.rgl.RGL.special_keys.ctrlLeft.compare(k)) {
			command("ml");
		} else if (!mod.rgl.RGL.special_keys.ctrlShiftUp.compare(k)) {
			command("sc[-1");
		} else if (!mod.rgl.RGL.special_keys.ctrlShiftDown.compare(k)) {
			command("sc");
		} else if (!mod.rgl.RGL.special_keys.ctrlShiftRight.compare(k)) {
			command("sr");
		} else if (!mod.rgl.RGL.special_keys.ctrlShiftLeft.compare(k)) {
			command("sr[-1");
		} else {
			let s: string = k.toString("utf8");
			acc = acc.slice(0, acidx) + s + acc.slice(acidx);
			
			await inp(acc, ++acidx);
		}
	});
}; //map
