/// <reference types="node" />
import * as rgl from "./rgl";
import * as events from "events";
export declare const CSI: "\x1b[";
/**
 * Merge polluted ANSI
 */
export declare function csimerger(str: string): string;
export declare module RGLM {
    type Buf8 = Buffer & {
        length: 8;
    };
    type Buf4 = Buffer & {
        length: 4;
    };
    type Buf2 = Buffer & {
        length: 2;
    };
    function stubmap(text: string, ...data: number[]): RGLMChunk[];
    /**
     * RGLM Magic
     */
    const MAGIC: Readonly<Buf4>;
    class RGLMChunk extends events.EventEmitter {
        #private;
        chr: string;
        fg: number;
        bg: number;
        st: number;
        cust: number;
        /**
         * Formatting mappings, set by parent module
         */
        static mappings: {
            fg: ((s: string) => string)[];
            bg: ((s: string) => string)[];
            st: ((s: string) => string)[];
            cust: ((s: string) => string)[];
        };
        /**
         * Chunk unique id
         */
        _id: number;
        onrender: (...data: any[]) => string;
        constructor(chr: string, fg: number, bg: number, st: number, cust: number);
        /**
         * Repack into Buf8
         */
        get pack(): Buf8;
        /**
         * Craft invalid/blank ender Chunk
         */
        static blank(): RGLMChunk;
        /**
         * Buf8 -> Chunk
         */
        static parse(buf: Readonly<Buf8>): RGLMChunk;
        /**
         * Chunk string representation
         */
        get print(): string;
    }
    class RGLMap extends events.EventEmitter {
        dimens: [number, number];
        parent: rgl.rgl.RGL;
        scroll: [number, number];
        static RGLMChunk: typeof RGLMChunk;
        /**
         * Map Chunks
         */
        chunks: RGLMChunk[];
        _loadedFrom: string;
        meta: {
            [key: string]: string;
        };
        constructor(dimens: [number, number], parent: rgl.rgl.RGL, scroll?: [number, number]);
        /**
         * Create empty/blank Map
         */
        static blank(par: rgl.rgl.RGL): RGLMap;
        /**
         * Craft Map from fs
         */
        static parse(from: string, par: rgl.rgl.RGL): Promise<RGLMap>;
        /**
         * (Re)store Map to fs
         */
        store(to?: string): Promise<void>;
        /**
         * Map -> Buff
         */
        get pack(): Buffer;
        /**
         * String representation of Map's Chunks
         */
        get print(): string;
        /**
         * Calculate Viewport coordinates from chunklist index
         */
        calcChkIdx(x: number | RGLMChunk, y?: number): number;
        /**
         * Calculate chunklist index from Viewport coordinates
         */
        calcChkCrd(idx: number | RGLMChunk): [number, number];
        /**
         * Get a Chunk
         */
        get(n: number | RGLMChunk, x?: number): RGLMChunk;
        /**
         * Place a Chunk
         */
        place(c: RGLMChunk[], n?: number | RGLMChunk, x?: number, repl?: number): RGLMChunk[];
        /**
         * Swap Chunks locations
         */
        swap(c1: RGLMChunk, c2: RGLMChunk): this;
        /**
         * Check if Chunk is inside bounds
         *
         * t* - chunk target
         * d* - viewport size
         * s* - viewport scroll
         * * - viewport
         */
        isIn(tx: number, ty?: number, x?: number, y?: number, sx?: number, sy?: number, dx?: number, dy?: number): boolean;
        /**
         * Imprint Map on RGL
         */
        stamp(dx?: number, dy?: number, x?: number, y?: number, sx?: number, sy?: number, par?: rgl.rgl.RGL): Promise<this>;
        [Symbol.iterator](): Generator<RGLMChunk, void, RGLMChunk>;
        get [Symbol.isConcatSpreadable](): boolean;
        get [Symbol.toStringTag](): string;
        toString(): string;
    }
}
export default RGLM;
//# sourceMappingURL=RGLM.d.ts.map