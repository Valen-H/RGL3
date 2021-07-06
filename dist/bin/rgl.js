#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const os = tslib_1.__importStar(require("os"));
const BINAME = "rgl";
function help() {
    return `Usage:${os.EOL}\t${BINAME}[ path<string=.>]						-	play a package${os.EOL}\t${BINAME} make[ name<string>=cwd-base]${os.EOL}` +
        `${os.EOL}\t${BINAME} map[ name<string=map.rglm>[ -map path<string=mappings.js>]]	-	Make/Edit/View a Map`;
} //help
if (process.argv.length <= 2) {
    console.info(help());
}
else if (/-{0,2}ma?p$/i.test(process.argv[2])) {
    require("./map")(...process.argv.slice(3));
}
else if (/-{0,2}m(?:ake)?$/i.test(process.argv[2])) {
    console.warn("Unimplemented");
}
else {
    console.warn("Bad", help());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmdsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYmluL3JnbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBRUEsWUFBWSxDQUFDOzs7QUFFYiwrQ0FBeUI7QUFFekIsTUFBTSxNQUFNLEdBQVUsS0FBSyxDQUFDO0FBRTVCLFNBQVMsSUFBSTtJQUNaLE9BQU8sU0FBUyxFQUFFLENBQUMsR0FBRyxLQUFLLE1BQU0sMENBQTBDLEVBQUUsQ0FBQyxHQUFHLEtBQUssTUFBTSxnQ0FBZ0MsRUFBRSxDQUFDLEdBQUcsRUFBRTtRQUNwSSxHQUFHLEVBQUUsQ0FBQyxHQUFHLEtBQUssTUFBTSxxRkFBcUYsQ0FBQztBQUMzRyxDQUFDLENBQUMsTUFBTTtBQUVSLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFO0lBQzdCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztDQUNyQjtLQUFNLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7SUFDaEQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUMzQztLQUFNLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtJQUNyRCxPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0NBQzlCO0tBQU07SUFDTixPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0NBQzVCIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxyXG5cclxuXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5pbXBvcnQgKiBhcyBvcyBmcm9tIFwib3NcIjtcclxuXHJcbmNvbnN0IEJJTkFNRTogXCJyZ2xcIiA9IFwicmdsXCI7XHJcblxyXG5mdW5jdGlvbiBoZWxwKCkge1xyXG5cdHJldHVybiBgVXNhZ2U6JHtvcy5FT0x9XFx0JHtCSU5BTUV9WyBwYXRoPHN0cmluZz0uPl1cdFx0XHRcdFx0XHQtXHRwbGF5IGEgcGFja2FnZSR7b3MuRU9MfVxcdCR7QklOQU1FfSBtYWtlWyBuYW1lPHN0cmluZz49Y3dkLWJhc2VdJHtvcy5FT0x9YCArIFxyXG5cdGAke29zLkVPTH1cXHQke0JJTkFNRX0gbWFwWyBuYW1lPHN0cmluZz1tYXAucmdsbT5bIC1tYXAgcGF0aDxzdHJpbmc9bWFwcGluZ3MuanM+XV1cdC1cdE1ha2UvRWRpdC9WaWV3IGEgTWFwYDtcclxufSAvL2hlbHBcclxuXHJcbmlmIChwcm9jZXNzLmFyZ3YubGVuZ3RoIDw9IDIpIHtcclxuXHRjb25zb2xlLmluZm8oaGVscCgpKTtcclxufSBlbHNlIGlmICgvLXswLDJ9bWE/cCQvaS50ZXN0KHByb2Nlc3MuYXJndlsyXSkpIHtcclxuXHRyZXF1aXJlKFwiLi9tYXBcIikoLi4ucHJvY2Vzcy5hcmd2LnNsaWNlKDMpKTtcclxufSBlbHNlIGlmICgvLXswLDJ9bSg/OmFrZSk/JC9pLnRlc3QocHJvY2Vzcy5hcmd2WzJdKSkge1xyXG5cdGNvbnNvbGUud2FybihcIlVuaW1wbGVtZW50ZWRcIik7XHJcbn0gZWxzZSB7XHJcblx0Y29uc29sZS53YXJuKFwiQmFkXCIsIGhlbHAoKSk7XHJcbn1cclxuIl19