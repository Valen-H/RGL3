"use strict";

import * as assert from "assert";
import * as fs from "fs-extra";
import * as path from "path";
import rgl from "./rgl";

export module RGLM {
	
	export type Buf8 = Buffer & { length: 8 };
	export type Buf4 = Buffer & { length: 4 };
	export type Buf2 = Buffer & { length: 2 };
	
	/**
	 * RGLM Magic
	 */
	export const MAGIC: Readonly<Buf4> = Buffer.from("RGL\0", "ascii") as Buf4;
	/**
	 * Blank/Invalid ender Chunk
	 */
	export let blank: Readonly<RGLMChunk>;
	
	export class RGLMChunk {
		
		static #idcntr: number = 0;
		
		/**
		 * Formatting mappings, set by parent module
		 */
		static mappings: {
			fg:		((s: string) => string)[];
			bg:		((s: string) => string)[];
			st:		((s: string) => string)[];
			cust:	((s: string) => string)[];
		} = {
			fg: [],
			bg: [],
			st: [],
			cust: [],
		};
		
		/**
		 * Chunk unique id
		 */
		_id: number = RGLMChunk.#idcntr++;
		
		constructor(public chr: string, public fg: number, public bg: number, public st: number, public cust: number) {
			assert.ok(typeof chr == "string", "Bad Chunk");
			
			this.chr = chr.replaceAll('\x00', '');
			
			assert.ok(
				this.chr.length <= 1 &&
				Buffer.from(this.chr, "ascii").length <= 4 &&
				fg >= 0 && fg <= 0xff &&
				bg >= 0 && bg <= 0xff &&
				st >= 0 && st <= 0xff &&
				cust >= 0 && cust <= 0xff,
			"Bad Chunk");
		} //ctor
		
		/**
		 * Repack into Buf8
		 */
		get pack(): Buf8 {
			const chr: Buf4 = Buffer.alloc(4) as Buf4;
			
			chr.write(this.chr);
			
			return Buffer.concat([chr, Buffer.from([this.fg, this.bg, this.st, this.cust])], 8) as Buf8;
		} //g-pack
		
		/**
		 * Craft invalid/blank ender Chunk
		 */
		static blank(): RGLMChunk {
			return new RGLMChunk('', 0xff, 0xff, 0xff, 0xff);
		} //blank
		
		/**
		 * Buf8 -> Chunk
		 */
		static parse(buf: Readonly<Buf8>): RGLMChunk {
			return new RGLMChunk(buf.slice(0, 4).toString(), buf[4], buf[5], buf[6], buf[7]);
		} //parse
		
		/**
		 * Chunk string representation
		 */
		get print(): string {
			const fg:		(s: string) => string = RGLMChunk.mappings.fg[this.fg]		?? ((s: string): string => s),
				bg:		(s: string) => string = RGLMChunk.mappings.bg[this.bg]		?? ((s: string): string => s),
				st:		(s: string) => string = RGLMChunk.mappings.st[this.st]		?? ((s: string): string => s),
				cust:	(s: string) => string = RGLMChunk.mappings.cust[this.cust]	?? ((s: string): string => s);
			
			return cust(st(fg(bg(this.chr.replaceAll('\x00', '')))));
		} //g-print
		
	} //RGLMChunk
	
	blank = RGLMChunk.blank();

	export class RGLMap {
		static RGLMChunk: typeof RGLMChunk = RGLMChunk;
		
		/**
		 * Map Chunks
		 */
		chunks: RGLMChunk[] = [ ];
		_loadedFrom: string = "";
		
		constructor(public dimens: [number, number] = [ 0, 0 ], public parent: rgl.RGL, public scroll: [number, number] = [ 0, 0 ]) {
			assert.ok(dimens instanceof Array && dimens.length == 2 && dimens.every(d => d >= 0) &&
				scroll instanceof Array && scroll.length == 2 && parent, "Bad Map");
			
			this.dimens = dimens.map(d => Number(d)) as [number, number];
			this.scroll = scroll.map(d => Number(d)) as [number, number];
		} //ctor
		
		/**
		 * Create empty/blank Map
		 */
		static blank(par: rgl.RGL) {
			return new RGLM.RGLMap([ 0, 0 ], par);
		} //blank
		
		/**
		 * Craft Map from fs
		 */
		static async parse(from: string, par: rgl.RGL): Promise<RGLMap> {
			assert.ok(from, "'from' must be provided");
			
			from = path.resolve(from);
			const dat: Buffer = await fs.promises.readFile(from, {
				flag: "r"
			}),
			end: Buffer = Buffer.from("FFFFFFFF", "hex");
			
			assert.ok(dat.length >= 8 && !dat.slice(0, 4).compare(Buffer.from("RGL\0", "ascii")), "Broken RGLM");
			
			let map = new RGLMap([dat.slice(4, 6).readUInt16LE(), dat.slice(6, 8).readUInt16LE()], par),
				chk: Buf8,
				i: number = 8,
				passing: boolean = true;
			
			map._loadedFrom = from;
			
			if (dat.length > 8) {
				do {
					if (i + 8 > dat.length) throw "Broken RGLM";
					
					chk = dat.slice(i, i += 8) as Buf8;
					
					if (chk.slice(0, 4).compare(end)) {
						map.chunks.push(RGLMap.RGLMChunk.parse(chk));
						
						if (i == dat.length) break;
					} else passing = false;
				} while(passing);
			}
			
			return map;
		} //parse
		
		/**
		 * (Re)store Map to fs
		 */
		async store(to: string = this._loadedFrom) {
			assert.ok(to && typeof to == "string", "'destination' must be a valid path");
			
			return await fs.promises.writeFile(to, this.pack, {
				encoding: "binary",
				flag: "w",
				mode: 0o775
			});
		} //store
		
		/**
		 * Map -> Buff
		 */
		get pack(): Buffer {
			const dimens: [Buf2, Buf2] = [
				Buffer.allocUnsafe(2) as Buf2,
				Buffer.allocUnsafe(2) as Buf2,
			];
			
			dimens[0].writeUInt16LE(this.dimens[0]);
			dimens[1].writeUInt16LE(this.dimens[1]);
			
			return Buffer.concat([RGLM.MAGIC, ...dimens, ...this.chunks.map(c => c.pack)], (this.chunks.length + 1) * 8);
		} //g-pack
		
		/**
		 * String representation of Map's Chunks
		 */
		get print(): string {
			return this.chunks.map(c => c.print).join('');
		} //g-print
		
		/**
		 * Calculate Viewport coordinates from chunklist index
		 */
		calcChkIdx(x: number | RGLMChunk, y: number = 0): number {
			if (x instanceof RGLMChunk) return this.chunks.findIndex(c => c == x);
			
			return this.dimens[0] * y! + x;
		} //calcChkIdx
		/**
		 * Calculate chunklist index from Viewport coordinates
		 */
		calcChkCrd(idx: number | RGLMChunk): [number, number] {
			if (idx instanceof RGLMChunk) idx = this.chunks.findIndex(c => c == idx);
			
			return [
				idx % this.dimens[0],
				idx / this.dimens[0]
			];
		} //calcChkCrd
		/**
		 * Get a Chunk
		 */
		get(n: number | RGLMChunk, x?: number): RGLMChunk {
			if (n instanceof RGLMChunk) return this.chunks[this.calcChkIdx(n)];
			else if (typeof x == "undefined") return this.chunks[n];
			else return this.chunks[this.calcChkIdx(n, x)];
		} //get
		/**
		 * Place a Chunk
		 */
		place(c: RGLMChunk[], n: number | RGLMChunk = this.chunks.length, x?: number, repl: number = 1) {
			const idx: number = typeof x == "undefined" ? (n instanceof RGLMChunk ? this.calcChkIdx(n) : n) : this.calcChkIdx(n, x);
			
			return this.chunks.splice(idx, repl, ...c);
		} //place
		
		/**
		 * Check if Chunk is inside bounds
		 * 
		 * t* - chunk target
		 * d* - viewport size
		 * s* - viewport scroll
		 * * - viewport
		 */
		isIn(tx: number, ty?: number, x: number = 0, y: number = 0, sx: number = this.scroll[0], sy: number = this.scroll[1], dx: number = this.dimens[0], dy: number = this.dimens[1]): boolean {
			if (typeof ty == "undefined") ([tx, ty] = this.calcChkCrd(tx));
			
			const rx: number = tx - sx,
				ry: number = ty - sy;
			
			return rx >= x && rx < dx && ry >= y && ry < dy;
		} //isIn
		
		/**
		 * Imprint Map on RGL
		 */
		async stamp(dx: number = this.dimens[0], dy: number = this.dimens[1], x: number = 0, y: number = 0, sx: number = this.scroll[0], sy: number = this.scroll[1], par: rgl.RGL = this.parent): Promise<this> {
			assert.ok(par, "Bad parent");
			
			const sav: [number, number] = [...par.cursor];
			
			for (let idx: number = 0; idx < this.chunks.length; idx++) {
				const c: RGLM.RGLMChunk = this.chunks[idx];
				
				if (!c.chr) continue;
				
				if (this.isIn(idx, undefined, x, y, sx, sy, dx, dy)) {
					await par.move(...this.calcChkCrd(idx));
					par.write(c.print);
				}
			}
			
			await par.move(...sav);
			
			return this;
		} //stamp
		
	} //RGLMap
	
} //RGLM

export default RGLM;
