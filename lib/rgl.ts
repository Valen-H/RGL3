/// <reference path="./RGLM.ts">

"use strict";

export type OptionalsOnly<T extends object> = Pick<T, Exclude<{
	[K in keyof T]?: T extends Record<K, T[K]> ? never : K
}[keyof T], undefined>>;
export type NonOptionals<T extends object> = {
	[k in keyof T]-?: undefined extends T[k] ? never : k
}[keyof T];
export type Nullable<T> = T | null | undefined;
export type NullableArray<T> = [ ] | T;

import * as assert from "assert";
import * as event from "events";
import * as readline from "readline";
import * as tty from "tty";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as rglm from "./RGLM";
import * as util from "util";

export module rgl {
	
	const dbg = util.debuglog("RGL");
	
	dbg(`ins ${__dirname}`);
	
	export const scrollUp = (by: number | string = 1) => `\x1b[${by}S`,
		scrollDown = (by: number | string = 1) => `\x1b[${by}T`,
		save = `\x1b7\x1b[s`,
		restore = `\x1b8\x1b[u`;
	
	/**
	 * Package Config
	 */
	export interface RGLCfg {
		name: string;
		description?: string;
		main: string;
		version?: string;
		mappings?: string;
		keywords?: string[];
		"$schema"?: string;
	} //RGLCfg
	
	/**
	 * Main packaging Class
	 */
	export class RGL extends event.EventEmitter {
		
		/**
		 * TTY streams bound to app
		 */
		private _bound: {
			sin?: tty.ReadStream,
			sout?: tty.WriteStream,
			serr?: tty.WriteStream,
			sinbind?: Nullable<(key: Buffer) => any>,
		} = {
			sin: process.stdin,
			sout: process.stdout,
			serr: process.stderr,
			sinbind: null,
		};
		/**
		 * SOUT cursor state
		 */
		cursor: [number, number] = [ 0, 0 ];
		/**
		 * Source of package Config in case of fs load
		 */
		#_loadedFrom: string = "";
		
		static readonly defaults: Partial<RGLCfg> = {
			description: "",
			main: "./main.js",
			version: "0.1",
			mappings: "./mappings.js",
			name: process.title,
			keywords: [ ],
			"$schema": path.join(__dirname, "../../rglcfg.schema.json")
		};
		/**
		 * Special keys for convenience
		 */
		static readonly special_keys: {
			ctrlC:		Readonly<NonNullable<Buffer>>;
			ctrlV:		Readonly<NonNullable<Buffer>>;
			up:			Readonly<NonNullable<Buffer>>;
			down:		Readonly<NonNullable<Buffer>>;
			right:		Readonly<NonNullable<Buffer>>;
			left:		Readonly<NonNullable<Buffer>>;
			enter:		Readonly<NonNullable<Buffer>>;
			back:		Readonly<NonNullable<Buffer>>;
			del:		Readonly<NonNullable<Buffer>>;
			shiftUp:	Readonly<NonNullable<Buffer>>;
			shiftDown:	Readonly<NonNullable<Buffer>>;
			shiftRight:	Readonly<NonNullable<Buffer>>;
			shiftLeft:	Readonly<NonNullable<Buffer>>;
		} = {
			ctrlC:		Buffer.from("03",			"hex"),
			ctrlV:		Buffer.from("16",			"hex"),
			up:			Buffer.from("1b5b41",		"hex"),
			down:		Buffer.from("1b5b42",		"hex"),
			right:		Buffer.from("1b5b43",		"hex"),
			left:		Buffer.from("1b5b44",		"hex"),
			enter:		Buffer.from("0d",			"hex"), //0a
			back:		Buffer.from("08",			"hex"), //+ctrlH
			del:		Buffer.from("1b5b337e",		"hex"),
			shiftUp:	Buffer.from("1b5b313b3241",	"hex"),
			shiftDown:	Buffer.from("1b5b313b3242",	"hex"),
			shiftRight:	Buffer.from("1b5b313b3243",	"hex"),
			shiftLeft:	Buffer.from("1b5b313b3244",	"hex"),
			/**
			 * @todo add ctrl/shift arrows(?)
			*/
		};
		
		constructor(protected cfg: RGLCfg) {
			super();
			
			this.cfg = Object.assign(Object.assign(Object.create(null), RGL.defaults), cfg);
			
			assert.ok(this.cfg.name, "RGL 'name' must be provided in the config");
			
			this.cfg.main		= "./" + path.win32.normalize(this.cfg.main ?? "./main.js");
			this.cfg.mappings	= "./" + path.win32.normalize(this.cfg.mappings ?? "./mappings.js");
			
			//process.stdout.write(`\x1b]0;${this.cfg.name}\a`);
			process.title = this.cfg.name ?? process.title ?? "RGL";
			
			this.parseMappings();
		} //ctor
		
		get dimens(): [number, number] | [0, 0] {
			return this.sout?.getWindowSize() ?? [0, 0];
		} //g-dimens
		get cDpt(): number {
			return this.colorDepth();
		} //g-cDpt
		get serr(): tty.WriteStream {
			return this._bound.serr ?? this._bound.sout ?? process.stderr;
		} //g-serr
		get sout(): tty.WriteStream {
			return this._bound.sout ?? process.stdout;
		} //g-sout
		get sin(): tty.ReadStream {
			return this._bound.sin ?? process.stdin;
		} //g-sin
		
		/**
		 * Parse Mappings from File
		 */
		parseMappings(from: Nullable<string> = this.cfg.mappings): Object {
			assert.ok(from, "'mappings' must be a valid path");
			
			from = path.win32.join(process.cwd(), from);
			
			delete require.cache[from];
			
			try {
				return rglm.RGLM.RGLMChunk.mappings = require(from);
			} catch(e) {
				return rglm.RGLM.RGLMChunk.mappings = require(path.join(__dirname, "../../mappings.js"));
			}
		} //parseMappings
		
		/**
		 * Capture keys from SIN
		 */
		capture(which: tty.ReadStream = this.sin, bind = true, out: tty.WriteStream = this.sout, err: tty.WriteStream = this.serr): boolean {
			assert.ok(which.isTTY && out.isTTY && err.isTTY, "Stream must be TTY");
			
			if ((which.isRaw && !bind) || (!which.isRaw && bind)) which.setRawMode(bind);
			
			if (this._bound.sinbind && this._bound.sin) {
				this._bound.sin!.removeListener("data", this._bound.sinbind!);
				this._bound.sinbind = null;
			}
			
			if (which.isRaw) {
				which.on("data", this._bound.sinbind = (key: Buffer) => {
					this.emit("rawkey", key, key.length > 1 && key[0] == 0x1b, key.length > 1 ? key.slice(1) : key.slice(0));
					this.emit("rawctrlkey", key, Buffer.from([(Array.from(key.values()).pop() ?? 0) + 0x61 - 1]), key.length > 1 && key[0] == 0x1b, key.length > 1 ? key.slice(1) : key.slice(0));
					this.emit("key", key.toString("utf8"), key.length > 1 && key[0] == 0x1b, (key.length > 1 ? key.slice(1) : key.slice(0)).toString("utf8"));
				});
			}
			
			this._bound.sin = which;
			this._bound.sout = out;
			this._bound.serr = err;
			
			this.emit("debug", `TTY set to ${bind}`);
			
			return which.isRaw;
		} //capture
		
		/**
		 * Load package Config from File
		 */
		static async load(from: string | RGLCfg = "./package.json"): Promise<RGL> {
			if (typeof from == "string") {
				from = path.win32.resolve(from);
				
				let out: RGL = new RGL(await fs.readJSON(from, {
					encoding: "ascii",
					flag: "r"
				}));
				
				out.#_loadedFrom = from;
				
				return out;
			} else return new RGL(from);
		} //load
		/**
		 * Store package Config to File
		 */
		async store(to: string = this.#_loadedFrom ?? "./package.json", repl?: ((this: any, key: string, value: number) => any), pad: number = 2): Promise<any> {
			assert.ok(to && typeof to == "string", "'config' must be a valid path");
			
			return await fs.writeJSON(to, this.cfg, {
				EOL: os.EOL,
				encoding: "ascii",
				mode: 0o775,
				spaces: pad,
				replacer: repl,
				flag: "w"
			});
		} //store
		
		/**
		 * Launch package entry
		 */
		exec(from: Nullable<string> = this.cfg.main ?? "./main.js"): any{
			assert.ok(from, "'main' must be a valid path");
			
			from = path.win32.join(process.cwd(), from);
			
			delete require.cache[from];
			
			try {
				return require(from)(this, module);
			} catch(e) {
				return require(path.win32.join(process.cwd(), "./main.js"))(this, module);
			}
		} //exec
		
		/**
		 * Write-and-count to SOUT
		 */
		write(d: string | Uint8Array | Buffer, ...data: (string | Uint8Array)[]): boolean {
			if (d instanceof Buffer) d = d.toString("ascii");
			else if (d instanceof Uint8Array) d = d.join('');
			
			d = d.replaceAll('\t', ' '.repeat(4)).replaceAll(/((?<!\r)\n(?!\r)|(?<!\n)\r(?!\n)|\r\n|\n\r)/gmis, '\n');
			
			const chs: string[] = d.toString().split('\n'),
				len: number = chs.length - 1;
			
			if (len >= 1) this.cursor[0] = chs[len].length;
			else this.cursor[0] += chs[len].length;
			
			this.cursor[0] %= this.sout.columns;
			this.cursor[1] = Math.min(this.cursor[1] + len, this.sout.rows);
			
			const out: boolean = this.sout.write(d);
			
			this.emit("write", d);
			
			if (!out) process.nextTick(() => this.sout.uncork());
			
			data.forEach(dt => this.write(dt));
			
			return out;
		} //write
		/**
		 * Write-and-count-newline to SOUT
		 */
		writeE(...data: (string | Uint8Array | Buffer)[]): boolean {
			return this.write(data.shift()!, ...data, os.EOL);
		} //writeE
		
		/**
		 * Get TTY color depth
		 */
		colorDepth(env: NodeJS.ProcessEnv = process.env): number {
			return this.sout.getColorDepth(env);
		} //colorDepth
		
		/**
		 * Move-and-count SOUT cursor
		 */
		async move(x: number, y?: number, rel: boolean = false): Promise<boolean> {
			if (!rel) x = Math.min(Math.max(x, 0), this.dimens[0]);
			else x = Math.min(Math.max(x, -this.dimens[0]), this.dimens[0]);
			if (!rel && y) y = Math.min(Math.max(y, 0), this.dimens[1]);
			else if (rel && y) y = Math.min(Math.max(y, -this.dimens[1]), this.dimens[1]);
			
			return new Promise((res, rej) => {
				let data: boolean;
				
				this.emit("move", x, y, rel);
				
				if (!rel) {
					this.cursor[0] = x;
					this.cursor[1] = y ?? this.cursor[1];
					data = readline.cursorTo(this.sout, x, y, () => res(data));
				} else {
					if (x) this.cursor[0] += x;
					if (y) this.cursor[1] += y;
					data = readline.moveCursor(this.sout, x, y ?? 0, () => res(data));
				}
			});
		} //move
		/**
		 * Clear-and-restore SOUT
		 */
		async clear(lines?: number[] | number, dir: tty.Direction = 0, rel?: boolean): Promise<boolean> {
			return new Promise(async (res, rej) => {
				const sav: [number, number] = [...this.cursor];
				let out: boolean = true;
				
				if (!lines) {
					this.move(0, 0, rel).then(() => {
						out = readline.clearScreenDown(this.sout, () => {
							this.move(...sav, false).then(() => res(out));
						});
					});
				} else if (typeof lines == "number" && lines < 0)
					out = readline.clearLine(this.sout, dir, () => {
						this.move(...sav, false).then(() => res(out));
					});
				else if (typeof lines == "number") {
					this.move(0, lines, rel).then(() => {
						out = readline.clearLine(this.sout, dir, () => {
							this.move(...sav, false).then(() => res(out));
						});
					});
				} else
					return Promise.all(lines.map(l => this.clear(l, dir, rel))).then(bs => res(bs.every(b => b)), rej);
				
				this.emit("clear", lines, dir, rel, out);
			});
		} //clear
		
		once(eventname: "log", listener: (...args: any[]) => void): this;
		once(eventname: "debug", listener: (...args: any[]) => void): this;
		once(eventname: "clear", listener: (lines: number, dir: tty.Direction, rel: boolean, out: boolean) => void): this;
		once(eventname: "write", listener: (d: string | Uint8Array) => void): this;
		once(eventname: "move", listener: (x: number, y: number, rel: boolean) => void): this;
		once(eventname: "key", listener: (key: string, isalt: boolean, s: string) => void): this;
		once(eventname: "rawkey", listener: (key: Buffer, isalt: boolean, s: Buffer) => void): this;
		once(eventname: "rawctrlkey", listener: (key: Buffer, ctrlkey: Buffer, isalt: boolean, s: Buffer) => void): this;
		once(eventname: string | symbol, listener: (...args: any[]) => void): this;
		once(eventname: string | symbol, listener: (...args: any[]) => void): this {
			return super.on(eventname, listener);
		} //once
		on(eventname: "log", listener: (...args: any[]) => void): this;
		on(eventname: "debug", listener: (...args: any[]) => void): this;
		on(eventname: "clear", listener: (lines: number, dir: tty.Direction, rel: boolean, out: boolean) => void): this;
		on(eventname: "write", listener: (d: string | Uint8Array) => void): this;
		on(eventname: "move", listener: (x: number, y: number, rel: boolean) => void): this;
		on(eventname: "key", listener: (key: string, isalt: boolean, s: string) => void): this;
		on(eventname: "rawkey", listener: (key: Buffer, isalt: boolean, s: Buffer) => void): this;
		on(eventname: "rawctrlkey", listener: (key: Buffer, ctrlkey: Buffer, isalt: boolean, s: Buffer) => void): this;
		on(eventname: string | symbol, listener: (...args: any[]) => void): this;
		on(eventname: string | symbol, listener: (...args: any[]) => void): this {
			return super.on(eventname, listener);
		} //on
		emit(eventname: "log", ...args: any[]): any;
		emit(eventname: "debug", ...args: any[]): any;
		emit(eventname: "clear", lines: number, dir: tty.Direction, rel: boolean, out: boolean): any;
		emit(eventname: "write", d: string | Uint8Array): string;
		emit(eventname: "move", x: number, y: number, rel: boolean): boolean;
		emit(eventname: "key", key: string, isalt: boolean, s: string): string;
		emit(eventname: "rawkey", key: Buffer, isalt: boolean, s: Buffer): Buffer;
		emit(eventname: "rawctrlkey", key: Buffer, ctrlkey: Buffer, isalt: boolean, s: Buffer): Buffer;
		emit(eventname: string | symbol, ...args: any[]): boolean;
		emit(eventname: string | symbol, ...args: any[]): any {
			return super.emit(eventname, ...args);
		} //emit
		
	} //RGL
	
} //rgl

export { rglm };

export default rgl;
