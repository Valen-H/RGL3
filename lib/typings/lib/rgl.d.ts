/// <reference types="node" />
export declare type OptionalsOnly<T extends object> = Pick<T, Exclude<{
    [K in keyof T]?: T extends Record<K, T[K]> ? never : K;
}[keyof T], undefined>>;
export declare type NonOptionals<T extends object> = {
    [k in keyof T]-?: undefined extends T[k] ? never : k;
}[keyof T];
export declare type Nullable<T> = T | null | undefined;
export declare type NullableArray<T> = [] | T;
import * as event from "events";
import * as tty from "tty";
import * as rglm from "./RGLM";
export declare module rgl {
    const scrollUp: (by?: number | string) => string, scrollDown: (by?: number | string) => string, save = "\u001B7\u001B[s", restore = "\u001B8\u001B[u";
    interface RGLCfg {
        name: string;
        description?: string;
        entry?: string;
        version?: string;
        mappings?: string;
        "$schema"?: string;
    }
    class RGL extends event.EventEmitter {
        #private;
        protected cfg: RGLCfg;
        private _bound;
        cursor: [number, number];
        static readonly defaults: Partial<RGLCfg>;
        static readonly special_keys: {
            ctrlC: Readonly<NonNullable<Buffer>>;
            ctrlV: Readonly<NonNullable<Buffer>>;
            up: Readonly<NonNullable<Buffer>>;
            down: Readonly<NonNullable<Buffer>>;
            right: Readonly<NonNullable<Buffer>>;
            left: Readonly<NonNullable<Buffer>>;
            enter: Readonly<NonNullable<Buffer>>;
        };
        constructor(cfg: RGLCfg);
        get dimens(): [number, number] | [0, 0];
        get cDpt(): number;
        get serr(): tty.WriteStream;
        get sout(): tty.WriteStream;
        get sin(): tty.ReadStream;
        parseMappings(from?: Nullable<string>): any;
        capture(which?: tty.ReadStream, bind?: boolean, out?: tty.WriteStream, err?: tty.WriteStream): boolean;
        static load(from?: string | RGLCfg): Promise<RGL>;
        store(to?: string, repl?: ((this: any, key: string, value: number) => any), pad?: number): Promise<void>;
        exec(from?: Nullable<string>): void;
        write(d: string | Uint8Array, ...data: (string | Uint8Array)[]): boolean;
        writeE(...data: (string | Uint8Array)[]): boolean;
        colorDepth(env?: NodeJS.ProcessEnv): number;
        move(x: number, y: number | undefined, rel?: boolean): Promise<unknown>;
        clear(lines?: number[] | number, dir?: tty.Direction, rel?: boolean): Promise<boolean>;
        emit(eventname: "log", ...args: any[]): any;
        emit(eventname: "debug", ...args: any[]): any;
        emit(eventname: "clear", lines: number, dir: tty.Direction, rel: boolean, out: boolean): any;
        emit(eventname: "write", d: string | Uint8Array): string;
        emit(eventname: "move", x: number, y: number, rel: boolean): boolean;
        emit(eventname: "key", key: string, isalt: boolean, s: string): string;
        emit(eventname: "rawkey", key: Buffer, isalt: boolean, s: Buffer): Buffer;
        emit(eventname: "rawctrlkey", key: Buffer, ctrlkey: Buffer, isalt: boolean, s: Buffer): Buffer;
        emit(eventname: string | symbol, ...args: any[]): boolean;
    }
}
export { rglm };
export default rgl;
//# sourceMappingURL=rgl.d.ts.map