"use strict";

import * as assert from "assert";
import * as fs from "fs-extra";
import * as path from "path";

export module RGLM {
	
	export type ChunkBuf = Buffer & { length: 8 };
	
	export const MAGIC: Buffer & { length: 4 } = Buffer.from("RGL\0", "ascii") as Buffer & { length: 4 };
	
	export class RGLMChunk {
		
		static #idcntr: number = 0;
		
		static mappings: {
			fg:		((s: string) => string)[];
			bg:		((s: string) => string)[];
			st:		((s: string) => string)[];
			cust:	((s: string) => string)[];
		};
		
		_id: number = RGLMChunk.#idcntr++;
		
		constructor(public chr: string, public fg: number, public bg: number, public st: number, public cust: number) {
			assert.ok(
				Buffer.from(chr, "ascii").length <= 4 &&
				fg >= 0 && fg < 0xff &&
				bg >= 0 && bg < 0xff &&
				st >= 0 && st < 0xff &&
				cust >= 0 && cust < 0xff,
			"Bad Chunk");
		} //ctor
		
		get pack(): ChunkBuf {
			return Buffer.concat([Buffer.from(this.chr, "ascii"), Buffer.from([this.fg, this.bg, this.st, this.cust])], 8) as ChunkBuf;
		} //g-pack
		
		static blank(): RGLMChunk {
			return new RGLMChunk('', 0xff, 0xff, 0xff, 0xff);
		} //blank
		
		static parse(buf: Readonly<ChunkBuf>): RGLMChunk {
			return new RGLMChunk(buf.slice(0, 4).toString(), buf[4], buf[5], buf[6], buf[7]);
		} //parse
		
		print(): string {
			const fg:		(s: string) => string = RGLMChunk.mappings.fg[this.fg]		?? ((s: string): string => s),
				bg:		(s: string) => string = RGLMChunk.mappings.bg[this.bg]		?? ((s: string): string => s),
				st:		(s: string) => string = RGLMChunk.mappings.st[this.st]		?? ((s: string): string => s),
				cust:	(s: string) => string = RGLMChunk.mappings.cust[this.cust]	?? ((s: string): string => s);
			
			return cust(st(fg(bg(this.chr))));
		} //print
		
	} //RGLMChunk

	export class RGLMap {
		static RGLMChunk: typeof RGLMChunk = RGLMChunk;
		
		protected chunks: RGLMChunk[] = [ ];
		#_loadedFrom: string = "";
		
		constructor(protected dimens: [number, number] = [ 0, 0 ]) {
			assert.ok(dimens instanceof Array && dimens.length == 2);
			
			this.dimens = dimens.map(d => Number(d)) as [number, number];
		} //ctor
		
		static async parse(from: string): Promise<RGLMap> {
			assert.ok(from, "'from' must be provided");
			
			from = path.resolve(from);
			const dat: Buffer = await fs.promises.readFile(from, {
				flag: "r"
			}),
			end: Buffer = Buffer.from("0000000000000000", "hex");
			
			assert.ok(dat.length >= 8 && !dat.slice(0, 4).compare(Buffer.from("RGL\0", "ascii")), "Broken RGLM");
			
			let map = new RGLMap([dat.slice(4, 6).readUInt16LE(), dat.slice(6, 8).readUInt16LE()]),
				chk: ChunkBuf,
				i: number = 8,
				passing: boolean = true;
			
			map.#_loadedFrom = from;
			
			if (dat.length > 8) {
				do {
					if (i + 8 > dat.length) throw "Broken RGLM";
					
					chk = dat.slice(i, i + 8) as ChunkBuf;
					
					if (!chk.compare(end)) {
						map.chunks.push(RGLMap.RGLMChunk.parse(chk));
					} else passing = false;
				} while(passing);
			}
			
			return map;
		} //parse
		
		async store(to: string = this.#_loadedFrom) {
			assert.ok(to && typeof to == "string", "'destination' must be a valid path");
			
			return await fs.promises.writeFile(to, this.pack, {
				encoding: "binary",
				flag: "w",
				mode: 0o775
			});
		} //store
		
		get pack(): Buffer {
			return Buffer.concat([RGLM.MAGIC, Buffer.from(this.dimens), ...this.chunks.map(c => c.pack)], (this.chunks.length + 1) * 8);
		} //g-pack
		
	} //RGLMap
} //RGLM

export default RGLM;
