/// <reference types="node" />
export declare module RGLM {
    type ChunkBuf = Buffer & {
        length: 8;
    };
    const MAGIC: Buffer & {
        length: 4;
    };
    class RGLMChunk {
        #private;
        chr: string;
        fg: number;
        bg: number;
        st: number;
        cust: number;
        static mappings: {
            fg: ((s: string) => string)[];
            bg: ((s: string) => string)[];
            st: ((s: string) => string)[];
            cust: ((s: string) => string)[];
        };
        _id: number;
        constructor(chr: string, fg: number, bg: number, st: number, cust: number);
        get pack(): ChunkBuf;
        static blank(): RGLMChunk;
        static parse(buf: Readonly<ChunkBuf>): RGLMChunk;
        print(): string;
    }
    class RGLMap {
        #private;
        protected dimens: [number, number];
        static RGLMChunk: typeof RGLMChunk;
        protected chunks: RGLMChunk[];
        constructor(dimens?: [number, number]);
        static parse(from: string): Promise<RGLMap>;
        store(to?: string): Promise<void>;
        get pack(): Buffer;
    }
}
export default RGLM;
//# sourceMappingURL=RGLM.d.ts.map