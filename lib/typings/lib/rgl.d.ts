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
    const scrollUp: (by?: number | string) => string, scrollDown: (by?: number | string) => string, save = "\u001B7\u001B[s", restore = "\u001B8\u001B[u", mouseOn = "\u001B[?1000h\u001B[?1005h\u001B[?1003h\u001B[?1015h\u001B[?1006h", mouseOff = "\u001B[?1000l\u001B[?1005l\u001B[?1003l\u001B[?1015l\u001B[?1006l";
    /**
     * Package Config
     */
    interface RGLCfg {
        name: string;
        description?: string;
        main: string;
        version?: string;
        mappings?: string;
        keywords?: string[];
        "$schema"?: string;
    }
    /**
     * Main packaging Class
     */
    class RGL extends event.EventEmitter {
        #private;
        protected cfg: RGLCfg;
        /**
         * TTY streams bound to app
         */
        private _bound;
        /**
         * SOUT cursor state
         */
        cursor: [number, number];
        static readonly defaults: Partial<RGLCfg>;
        /**
         * Special keys for convenience
         */
        static readonly special_keys: {
            ctrlC: Readonly<NonNullable<Buffer>>;
            ctrlV: Readonly<NonNullable<Buffer>>;
            ctrlZ: Readonly<NonNullable<Buffer>>;
            ctrlY: Readonly<NonNullable<Buffer>>;
            up: Readonly<NonNullable<Buffer>>;
            down: Readonly<NonNullable<Buffer>>;
            right: Readonly<NonNullable<Buffer>>;
            left: Readonly<NonNullable<Buffer>>;
            shiftUp: Readonly<NonNullable<Buffer>>;
            shiftDown: Readonly<NonNullable<Buffer>>;
            shiftRight: Readonly<NonNullable<Buffer>>;
            shiftLeft: Readonly<NonNullable<Buffer>>;
            ctrlUp: Readonly<NonNullable<Buffer>>;
            ctrlDown: Readonly<NonNullable<Buffer>>;
            ctrlRight: Readonly<NonNullable<Buffer>>;
            ctrlLeft: Readonly<NonNullable<Buffer>>;
            ctrlShiftUp: Readonly<NonNullable<Buffer>>;
            ctrlShiftDown: Readonly<NonNullable<Buffer>>;
            ctrlShiftRight: Readonly<NonNullable<Buffer>>;
            ctrlShiftLeft: Readonly<NonNullable<Buffer>>;
            enter: Readonly<NonNullable<Buffer>>;
            altEnter: Readonly<NonNullable<Buffer>>;
            back: Readonly<NonNullable<Buffer>>;
            del: Readonly<NonNullable<Buffer>>;
            tab: Readonly<NonNullable<Buffer>>;
        };
        constructor(cfg: RGLCfg);
        get dimens(): [number, number] | [0, 0];
        get cDpt(): number;
        get serr(): tty.WriteStream;
        get sout(): tty.WriteStream;
        get sin(): tty.ReadStream;
        /**
         * Parse Mappings from File
         */
        parseMappings(from?: Nullable<string>): Object;
        /**
         * Capture keys from SIN
         */
        capture(which?: tty.ReadStream, bind?: boolean, out?: tty.WriteStream, err?: tty.WriteStream): boolean;
        /**
         * Load package Config from File
         */
        static load(from?: string | RGLCfg): Promise<RGL>;
        /**
         * Store package Config to File
         */
        store(to?: string, repl?: ((this: any, key: string, value: number) => any), pad?: number): Promise<any>;
        /**
         * Launch package entry
         */
        exec(from?: Nullable<string>): any;
        /**
         * Write-and-count to SOUT
         */
        write(d?: string | Uint8Array | Buffer, ...data: (string | Uint8Array)[]): boolean;
        /**
         * Write-and-count-newline to SOUT
         */
        writeE(...data: (string | Uint8Array | Buffer)[]): boolean;
        /**
         * Get TTY color depth
         */
        colorDepth(env?: NodeJS.ProcessEnv): number;
        /**
         * Move-and-count SOUT cursor
         */
        move(x: number, y?: number, rel?: boolean): Promise<boolean>;
        /**
         * Clear-and-restore SOUT
         */
        clear(lines?: number[] | number, dir?: tty.Direction, rel?: boolean): Promise<boolean>;
        once(eventname: "log", listener: (...args: any[]) => void): this;
        once(eventname: "debug", listener: (...args: any[]) => void): this;
        once(eventname: "clear", listener: (lines: number, dir: tty.Direction, rel: boolean, out: boolean) => void): this;
        once(eventname: "write", listener: (d: string | Uint8Array) => void): this;
        once(eventname: "move", listener: (x: number, y: number, rel: boolean) => void): this;
        once(eventname: "key", listener: (key: string, isalt: boolean, s: string) => void): this;
        once(eventname: "rawkey", listener: (key: Buffer, isalt: boolean, s: Buffer) => void): this;
        once(eventname: "rawctrlkey", listener: (key: Buffer, ctrlkey: Buffer, isalt: boolean, s: Buffer) => void): this;
        once(eventname: string | symbol, listener: (...args: any[]) => void): this;
        on(eventname: "log", listener: (...args: any[]) => void): this;
        on(eventname: "debug", listener: (...args: any[]) => void): this;
        on(eventname: "clear", listener: (lines: number, dir: tty.Direction, rel: boolean, out: boolean) => void): this;
        on(eventname: "write", listener: (d: string | Uint8Array) => void): this;
        on(eventname: "move", listener: (x: number, y: number, rel: boolean) => void): this;
        on(eventname: "key", listener: (key: string, isalt: boolean, s: string) => void): this;
        on(eventname: "rawkey", listener: (key: Buffer, isalt: boolean, s: Buffer) => void): this;
        on(eventname: "rawctrlkey", listener: (key: Buffer, ctrlkey: Buffer, isalt: boolean, s: Buffer) => void): this;
        on(eventname: string | symbol, listener: (...args: any[]) => void): this;
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