#!/usr/bin/env node
/// <reference path="../lib/rgl">
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs = tslib_1.__importStar(require("fs-extra"));
const path = tslib_1.__importStar(require("path"));
const readline = tslib_1.__importStar(require("readline"));
const os = tslib_1.__importStar(require("os"));
const command_line_args_1 = tslib_1.__importDefault(require("command-line-args"));
const rgl = tslib_1.__importStar(require("../lib/rgl"));
const BINAME = "rgl", comm = command_line_args_1.default([
    {
        name: "command",
        type: String,
        defaultOption: true,
        defaultValue: '',
        multiple: true,
    },
    {
        name: "help",
        alias: 'h',
        type: Boolean,
    }
], {
    partial: true,
    camelCase: true,
});
function help() {
    return `Usage:
	${BINAME}[ play path<string=.>]                                           -    Play a package
	${BINAME} create[ name<string=cwd-base>]                                  -    Create a package
	${BINAME} map[ name<string=mapX.rglm>[ -map path<string=mappings.js>]]    -    Make/Edit/View a Map`;
} //help
if (comm.help || /^h(?:e?lp)?$/is.test(comm.command[0])) {
    console.info(help());
}
else if (/-{0,2}ma?p$/i.test(comm.command[0])) {
    require("./map")(comm.command[1], command_line_args_1.default([
        {
            name: "mappings",
            alias: 'm',
            type: String,
            group: "map",
        },
        {
            name: "map",
            type: String,
            group: "map",
        },
    ], {
        partial: true,
        camelCase: true,
    }));
}
else if (/-{0,2}(?:m(?:ake)?|c(?:r(?:eate)?)?)$/i.test(comm.command[0])) {
    const comm = command_line_args_1.default([
        { name: "command", type: String, defaultOption: true },
        { name: "name", alias: 'n', type: String },
        { name: "version", alias: 'v', type: String },
        { name: "main", type: String },
        { name: "entry", alias: 'e', type: String },
        { name: "mappings", alias: 'm', type: String },
        { name: "description", alias: 'd', type: String },
        { name: "keywords", alias: 'k', type: (d) => d.split(',') },
    ], {
        partial: true,
        camelCase: true,
    }), rd = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        tabSize: 4,
    });
    let from = "";
    rd.pause();
    try {
        if (comm.command[1] && fs.statSync(comm.command[1]).isDirectory()) { //if dir
            fs.ensureDirSync(comm.command[1], { mode: 0o775 });
            process.chdir(comm.command[1]);
        }
        else if (comm.command[1]) { //if json
            from = path.resolve(comm.command[1]);
            let dir = path.dirname(from);
            fs.ensureDirSync(dir, { mode: 0o775 });
            process.chdir(dir);
        }
    }
    catch (e) {
        fs.ensureDirSync(comm.command[1], { mode: 0o775 });
        process.chdir(comm.command[1]);
    }
    async function caller() {
        let data = {};
        if (from) {
            try {
                data = await fs.readJson(from, {
                    encoding: "ascii",
                    flag: "r",
                    throws: true,
                });
            }
            catch (e) { }
        }
        else {
            try {
                data = await fs.readJson(from = "rglcfg.json", {
                    encoding: "ascii",
                    flag: "r",
                    throws: true,
                });
            }
            catch (e) {
                try {
                    data = await fs.readJson(from = "package.json", {
                        encoding: "ascii",
                        flag: "r",
                        throws: true,
                    });
                }
                catch (ign) {
                    from = "";
                }
            }
        }
        let name = comm.name || data.name || path.basename(process.cwd()), version = comm.version || data.version || "0.1.0", main = comm.main || comm.entry || data.main || "./main.js", mappings = comm.mappings || data.mappings || "./mappings.js", description = comm.description || data.description || "", keywords = comm.keywords || data.keywords || [], config = from || "rglcfg.json";
        async function question(what) {
            return new Promise((res, rej) => rd.question(what, res));
        }
        ; //question
        name = await question(`name [${name}]: `) || name;
        version = await question(`version [${version}]: `) || version;
        description = await question(`description [${description}]: `) || description;
        main = await question(`entry [${main}]: `) || main;
        mappings = await question(`mappings [${mappings}]: `) || mappings;
        keywords = (await question(`keywords [separate with comma]: `)).split(',') || keywords;
        config = await question(`config [${config}]: `) || config;
        fs.outputJson(config, {
            name, version, main,
            mappings, keywords, description,
            "$schema": path.relative("", path.join(__dirname, "/../../rglcfg.schema.json"))
        }, {
            EOL: os.EOL,
            encoding: "ascii",
            flag: "w",
            mode: 0o775,
            spaces: 4,
        });
        fs.outputJson("package.json", {
            name, version, main,
            keywords, description,
            "dependencies": { rgl: "^0.1" },
            "scripts": { start: "rgl" },
            "private": true,
            "liscence": "ISC",
            "homepage": "",
            "bugs": {},
            "license": "ISC",
            "author": "",
            "contributors": [],
            "files": [
                "*"
            ],
            "browser": false,
            "man": [
                "doc"
            ],
            "directories": {
                "lib": "./lib",
                "bin": "./bin",
                "man": "./man",
                "doc": "./doc",
                "example": "./test",
                "test": "./test"
            },
            "typings": "./lib/typings/",
            "typesVersions": {
                ">=3.0": {
                    "*": [
                        "./lib/*"
                    ]
                }
            },
            "repository": {},
            "config": {
                "port": 8081
            },
            "engines": {
                "node": ">=13.0",
                "npm": ">=4.0"
            },
            "engineStrict": true,
            "os": [],
            "cpu": [],
            "prepack": "rm rgl-*.tgz",
        }, {
            EOL: os.EOL,
            encoding: "ascii",
            flag: "wx",
            mode: 0o775,
            spaces: 4,
        }, err => { });
        fs.writeFile(main, `#!/usr/bin/env rgl

"use strict";

const rgl = require("rgl").rgl;

module.exports = async function main(rgl, mod) {
	console.info("Launched.");
	
	//
}; //main
`, {
            flag: "wx", mode: 0o775,
            encoding: "utf8",
        }, err => { });
        fs.copy(path.join(__dirname, "/../../mappings.js"), mappings, {
            dereference: false,
            overwrite: false,
            preserveTimestamps: true,
            recursive: false,
        });
        fs.ensureDir("data/maps");
        rd.close();
    } //caller
    caller();
}
else if (/^(?:p(?:l(?:ay)?)?)?$/is.test(comm.command[0])) {
    let from = "";
    try {
        if (comm.command[1] && fs.statSync(comm.command[1]).isDirectory()) { //if dir
            process.chdir(comm.command[1]);
        }
        else if (comm.command[1]) { //if json
            from = path.resolve(comm.command[1]);
            let dir = path.dirname(from);
            process.chdir(dir);
        }
    }
    catch (e) {
        console.error("Bad path");
    }
    async function caller() {
        let data = {};
        const opts = command_line_args_1.default([
            { name: "name", alias: 'n', type: String },
            { name: "version", alias: 'v', type: String },
            { name: "main", type: String },
            { name: "entry", alias: 'e', type: String },
            { name: "mappings", alias: 'm', type: String },
            { name: "keywords", alias: 'k', type: (d) => d.split(',') },
        ], {
            partial: true,
            camelCase: true,
        });
        if (from) {
            try {
                data = await fs.readJson(from, {
                    encoding: "ascii",
                    flag: "r",
                    throws: true,
                });
            }
            catch (e) {
                console.error("Failure: " + e.message);
            }
        }
        else {
            try {
                data = await fs.readJson(from = "rglcfg.json", {
                    encoding: "ascii",
                    flag: "r",
                    throws: true,
                });
            }
            catch (e) {
                try {
                    data = await fs.readJson(from = "package.json", {
                        encoding: "ascii",
                        flag: "r",
                        throws: true,
                    });
                }
                catch (ign) {
                    from = "";
                    console.error("No package");
                }
            }
        }
        data.name = opts.name || data.name;
        data.main = opts.main || opts.entry || data.main;
        data.mappings = opts.mappings || data.mappings;
        data.description = opts.description || data.description;
        data.version = opts.version || data.version;
        data.keywords = opts.keywords || data.keywords;
        return (await rgl.rgl.RGL.load(data)).exec();
    } //caller
    caller().catch((e) => console.error("Failure: " + e.message));
}
else
    console.warn("Bad", help());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmdsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vYmluL3JnbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0EsaUNBQWlDO0FBRWpDLFlBQVksQ0FBQzs7O0FBRWIscURBQStCO0FBQy9CLG1EQUE2QjtBQUM3QiwyREFBcUM7QUFDckMsK0NBQXlCO0FBQ3pCLGtGQUFrRDtBQUNsRCx3REFBa0M7QUFFbEMsTUFBTSxNQUFNLEdBQVUsS0FBSyxFQUMxQixJQUFJLEdBQTBCLDJCQUFFLENBQUM7SUFDaEM7UUFDQyxJQUFJLEVBQUUsU0FBUztRQUNmLElBQUksRUFBRSxNQUFNO1FBQ1osYUFBYSxFQUFFLElBQUk7UUFDbkIsWUFBWSxFQUFFLEVBQUU7UUFDaEIsUUFBUSxFQUFFLElBQUk7S0FDZDtJQUNEO1FBQ0MsSUFBSSxFQUFFLE1BQU07UUFDWixLQUFLLEVBQUUsR0FBRztRQUNWLElBQUksRUFBRSxPQUFPO0tBQ2I7Q0FDRCxFQUFFO0lBQ0YsT0FBTyxFQUFFLElBQUk7SUFDYixTQUFTLEVBQUUsSUFBSTtDQUNmLENBQUMsQ0FBQztBQUVKLFNBQVMsSUFBSTtJQUNaLE9BQU87R0FDTCxNQUFNO0dBQ04sTUFBTTtHQUNOLE1BQU0sNEZBQTRGLENBQUM7QUFDdEcsQ0FBQyxDQUFDLE1BQU07QUFFUixJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtJQUN4RCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7Q0FDckI7S0FBTSxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0lBQ2hELE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLDJCQUFFLENBQUM7UUFDcEM7WUFDQyxJ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QUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztDQUNyRTs7SUFDQSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vbGliL3JnbFwiPlxyXG5cclxuXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnMtZXh0cmFcIjtcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgKiBhcyByZWFkbGluZSBmcm9tIFwicmVhZGxpbmVcIjtcclxuaW1wb3J0ICogYXMgb3MgZnJvbSBcIm9zXCI7XHJcbmltcG9ydCB7IGRlZmF1bHQgYXMgYWEgfSBmcm9tIFwiY29tbWFuZC1saW5lLWFyZ3NcIjtcclxuaW1wb3J0ICogYXMgcmdsIGZyb20gXCIuLi9saWIvcmdsXCI7XHJcblxyXG5jb25zdCBCSU5BTUU6IFwicmdsXCIgPSBcInJnbFwiLFxyXG5cdGNvbW06IGFhLkNvbW1hbmRMaW5lT3B0aW9ucyA9IGFhKFtcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogXCJjb21tYW5kXCIsXHJcblx0XHRcdHR5cGU6IFN0cmluZyxcclxuXHRcdFx0ZGVmYXVsdE9wdGlvbjogdHJ1ZSxcclxuXHRcdFx0ZGVmYXVsdFZhbHVlOiAnJyxcclxuXHRcdFx0bXVsdGlwbGU6IHRydWUsXHJcblx0XHR9LFxyXG5cdFx0e1xyXG5cdFx0XHRuYW1lOiBcImhlbHBcIixcclxuXHRcdFx0YWxpYXM6ICdoJyxcclxuXHRcdFx0dHlwZTogQm9vbGVhbixcclxuXHRcdH1cclxuXHRdLCB7XHJcblx0XHRwYXJ0aWFsOiB0cnVlLFxyXG5cdFx0Y2FtZWxDYXNlOiB0cnVlLFxyXG5cdH0pO1xyXG5cclxuZnVuY3Rpb24gaGVscCgpIHtcclxuXHRyZXR1cm4gYFVzYWdlOlxyXG5cdCR7QklOQU1FfVsgcGxheSBwYXRoPHN0cmluZz0uPl0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLSAgICBQbGF5IGEgcGFja2FnZVxyXG5cdCR7QklOQU1FfSBjcmVhdGVbIG5hbWU8c3RyaW5nPWN3ZC1iYXNlPl0gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLSAgICBDcmVhdGUgYSBwYWNrYWdlXHJcblx0JHtCSU5BTUV9IG1hcFsgbmFtZTxzdHJpbmc9bWFwWC5yZ2xtPlsgLW1hcCBwYXRoPHN0cmluZz1tYXBwaW5ncy5qcz5dXSAgICAtICAgIE1ha2UvRWRpdC9WaWV3IGEgTWFwYDtcclxufSAvL2hlbHBcclxuXHJcbmlmIChjb21tLmhlbHAgfHwgL15oKD86ZT9scCk/JC9pcy50ZXN0KGNvbW0uY29tbWFuZFswXSkpIHtcclxuXHRjb25zb2xlLmluZm8oaGVscCgpKTtcclxufSBlbHNlIGlmICgvLXswLDJ9bWE/cCQvaS50ZXN0KGNvbW0uY29tbWFuZFswXSkpIHtcclxuXHRyZXF1aXJlKFwiLi9tYXBcIikoY29tbS5jb21tYW5kWzFdLCBhYShbXHJcblx0XHR7XHJcblx0XHRcdG5hbWU6IFwibWFwcGluZ3NcIixcclxuXHRcdFx0YWxpYXM6ICdtJyxcclxuXHRcdFx0dHlwZTogU3RyaW5nLFxyXG5cdFx0XHRncm91cDogXCJtYXBcIixcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdG5hbWU6IFwibWFwXCIsXHJcblx0XHRcdHR5cGU6IFN0cmluZyxcclxuXHRcdFx0Z3JvdXA6IFwibWFwXCIsXHJcblx0XHR9LFxyXG5cdF0sIHtcclxuXHRcdHBhcnRpYWw6IHRydWUsXHJcblx0XHRjYW1lbENhc2U6IHRydWUsXHJcblx0fSkpO1xyXG59IGVsc2UgaWYgKC8tezAsMn0oPzptKD86YWtlKT98Yyg/OnIoPzplYXRlKT8pPykkL2kudGVzdChjb21tLmNvbW1hbmRbMF0pKSB7XHJcblx0Y29uc3QgY29tbTogYWEuQ29tbWFuZExpbmVPcHRpb25zID0gYWEoW1xyXG5cdFx0eyBuYW1lOiBcImNvbW1hbmRcIiwgdHlwZTogU3RyaW5nLCBkZWZhdWx0T3B0aW9uOiB0cnVlIH0sXHJcblx0XHR7IG5hbWU6IFwibmFtZVwiLCBhbGlhczogJ24nLCB0eXBlOiBTdHJpbmcgfSxcclxuXHRcdHsgbmFtZTogXCJ2ZXJzaW9uXCIsIGFsaWFzOiAndicsIHR5cGU6IFN0cmluZyB9LFxyXG5cdFx0eyBuYW1lOiBcIm1haW5cIiwgdHlwZTogU3RyaW5nIH0sXHJcblx0XHR7IG5hbWU6IFwiZW50cnlcIiwgYWxpYXM6ICdlJywgdHlwZTogU3RyaW5nIH0sXHJcblx0XHR7IG5hbWU6IFwibWFwcGluZ3NcIiwgYWxpYXM6ICdtJywgdHlwZTogU3RyaW5nIH0sXHJcblx0XHR7IG5hbWU6IFwiZGVzY3JpcHRpb25cIiwgYWxpYXM6ICdkJywgdHlwZTogU3RyaW5nIH0sXHJcblx0XHR7IG5hbWU6IFwia2V5d29yZHNcIiwgYWxpYXM6ICdrJywgdHlwZTogKGQ6IHN0cmluZyk6IHN0cmluZ1tdID0+IGQuc3BsaXQoJywnKSB9LFxyXG5cdF0sIHtcclxuXHRcdHBhcnRpYWw6IHRydWUsXHJcblx0XHRjYW1lbENhc2U6IHRydWUsXHJcblx0fSksIHJkID0gcmVhZGxpbmUuY3JlYXRlSW50ZXJmYWNlKHtcclxuXHRcdGlucHV0OiBwcm9jZXNzLnN0ZGluLFxyXG5cdFx0b3V0cHV0OiBwcm9jZXNzLnN0ZG91dCxcclxuXHRcdHRhYlNpemU6IDQsXHJcblx0fSk7XHJcblx0bGV0IGZyb206IHN0cmluZyA9IFwiXCI7XHJcblx0XHJcblx0cmQucGF1c2UoKTtcclxuXHRcclxuXHR0cnkge1xyXG5cdFx0aWYgKGNvbW0uY29tbWFuZFsxXSAmJiBmcy5zdGF0U3luYyhjb21tLmNvbW1hbmRbMV0pLmlzRGlyZWN0b3J5KCkpIHsgLy9pZiBkaXJcclxuXHRcdFx0ZnMuZW5zdXJlRGlyU3luYyhjb21tLmNvbW1hbmRbMV0sIHsgbW9kZTogMG83NzUgfSk7XHJcblx0XHRcdHByb2Nlc3MuY2hkaXIoY29tbS5jb21tYW5kWzFdKTtcclxuXHRcdH0gZWxzZSBpZiAoY29tbS5jb21tYW5kWzFdKSB7IC8vaWYganNvblxyXG5cdFx0XHRmcm9tID0gcGF0aC5yZXNvbHZlKGNvbW0uY29tbWFuZFsxXSk7XHJcblx0XHRcdGxldCBkaXI6IHN0cmluZyA9IHBhdGguZGlybmFtZShmcm9tKTtcclxuXHRcdFx0XHJcblx0XHRcdGZzLmVuc3VyZURpclN5bmMoZGlyLCB7IG1vZGU6IDBvNzc1IH0pO1xyXG5cdFx0XHRwcm9jZXNzLmNoZGlyKGRpcik7XHJcblx0XHR9XHJcblx0fSBjYXRjaChlKSB7XHJcblx0XHRmcy5lbnN1cmVEaXJTeW5jKGNvbW0uY29tbWFuZFsxXSwgeyBtb2RlOiAwbzc3NSB9KTtcclxuXHRcdHByb2Nlc3MuY2hkaXIoY29tbS5jb21tYW5kWzFdKTtcclxuXHR9XHJcblx0XHJcblx0YXN5bmMgZnVuY3Rpb24gY2FsbGVyKCkge1xyXG5cdFx0bGV0IGRhdGE6IFBhcnRpYWw8cmdsLnJnbC5SR0xDZmc+ID0geyB9O1xyXG5cdFx0XHJcblx0XHRpZiAoZnJvbSkge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGRhdGEgPSBhd2FpdCBmcy5yZWFkSnNvbihmcm9tLCB7XHJcblx0XHRcdFx0XHRlbmNvZGluZzogXCJhc2NpaVwiLFxyXG5cdFx0XHRcdFx0ZmxhZzogXCJyXCIsXHJcblx0XHRcdFx0XHR0aHJvd3M6IHRydWUsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0gY2F0Y2goZSkgeyB9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGRhdGEgPSBhd2FpdCBmcy5yZWFkSnNvbihmcm9tID0gXCJyZ2xjZmcuanNvblwiLCB7XHJcblx0XHRcdFx0XHRlbmNvZGluZzogXCJhc2NpaVwiLFxyXG5cdFx0XHRcdFx0ZmxhZzogXCJyXCIsXHJcblx0XHRcdFx0XHR0aHJvd3M6IHRydWUsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0gY2F0Y2goZSkge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRkYXRhID0gYXdhaXQgZnMucmVhZEpzb24oZnJvbSA9IFwicGFja2FnZS5qc29uXCIsIHtcclxuXHRcdFx0XHRcdFx0ZW5jb2Rpbmc6IFwiYXNjaWlcIixcclxuXHRcdFx0XHRcdFx0ZmxhZzogXCJyXCIsXHJcblx0XHRcdFx0XHRcdHRocm93czogdHJ1ZSxcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0gY2F0Y2goaWduKSB7IGZyb20gPSBcIlwiOyB9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0bGV0IG5hbWU6XHRcdFx0c3RyaW5nXHRcdD0gY29tbS5uYW1lXHRcdFx0fHwgZGF0YS5uYW1lXHRcdHx8IHBhdGguYmFzZW5hbWUocHJvY2Vzcy5jd2QoKSlcdCxcclxuXHRcdFx0dmVyc2lvbjpcdFx0c3RyaW5nXHRcdD0gY29tbS52ZXJzaW9uXHRcdHx8IGRhdGEudmVyc2lvblx0XHR8fCBcIjAuMS4wXCJcdFx0XHRcdFx0XHQsXHJcblx0XHRcdG1haW46XHRcdFx0c3RyaW5nXHRcdD0gY29tbS5tYWluXHRcdFx0fHwgY29tbS5lbnRyeVx0XHR8fCBkYXRhLm1haW4gfHwgXCIuL21haW4uanNcIlx0XHQsXHJcblx0XHRcdG1hcHBpbmdzOlx0XHRzdHJpbmdcdFx0PSBjb21tLm1hcHBpbmdzXHRcdHx8IGRhdGEubWFwcGluZ3NcdHx8IFwiLi9tYXBwaW5ncy5qc1wiXHRcdFx0XHQsXHJcblx0XHRcdGRlc2NyaXB0aW9uOlx0c3RyaW5nXHRcdD0gY29tbS5kZXNjcmlwdGlvblx0fHwgZGF0YS5kZXNjcmlwdGlvblx0fHwgXCJcIlx0XHRcdFx0XHRcdFx0LFxyXG5cdFx0XHRrZXl3b3JkczpcdFx0c3RyaW5nW11cdD0gY29tbS5rZXl3b3Jkc1x0XHR8fCBkYXRhLmtleXdvcmRzXHR8fCBbXVx0XHRcdFx0XHRcdFx0LFxyXG5cdFx0XHRjb25maWc6XHRcdFx0c3RyaW5nXHRcdD0gZnJvbVx0XHRcdFx0fHwgXCJyZ2xjZmcuanNvblwiXHRcdFx0XHRcdFx0XHRcdFx0O1xyXG5cdFx0XHJcblx0XHRhc3luYyBmdW5jdGlvbiBxdWVzdGlvbih3aGF0OiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlcywgcmVqKSA9PiByZC5xdWVzdGlvbih3aGF0LCByZXMpKTtcclxuXHRcdH07IC8vcXVlc3Rpb25cclxuXHRcdFxyXG5cdFx0bmFtZVx0XHQ9ICBhd2FpdCBxdWVzdGlvbihgbmFtZSBbJHtuYW1lfV06IGApXHRcdFx0XHRcdFx0XHRcdHx8IG5hbWVcdFx0XHQ7XHJcblx0XHR2ZXJzaW9uXHRcdD0gIGF3YWl0IHF1ZXN0aW9uKGB2ZXJzaW9uIFske3ZlcnNpb259XTogYClcdFx0XHRcdFx0XHRcdHx8IHZlcnNpb25cdFx0O1xyXG5cdFx0ZGVzY3JpcHRpb25cdD0gIGF3YWl0IHF1ZXN0aW9uKGBkZXNjcmlwdGlvbiBbJHtkZXNjcmlwdGlvbn1dOiBgKVx0XHRcdFx0XHR8fCBkZXNjcmlwdGlvblx0O1xyXG5cdFx0bWFpblx0XHQ9ICBhd2FpdCBxdWVzdGlvbihgZW50cnkgWyR7bWFpbn1dOiBgKVx0XHRcdFx0XHRcdFx0XHR8fCBtYWluXHRcdFx0O1xyXG5cdFx0bWFwcGluZ3NcdD0gIGF3YWl0IHF1ZXN0aW9uKGBtYXBwaW5ncyBbJHttYXBwaW5nc31dOiBgKVx0XHRcdFx0XHRcdHx8IG1hcHBpbmdzXHRcdDtcclxuXHRcdGtleXdvcmRzXHQ9IChhd2FpdCBxdWVzdGlvbihga2V5d29yZHMgW3NlcGFyYXRlIHdpdGggY29tbWFdOiBgKSkuc3BsaXQoJywnKVx0fHwga2V5d29yZHNcdFx0O1xyXG5cdFx0Y29uZmlnXHRcdD0gIGF3YWl0IHF1ZXN0aW9uKGBjb25maWcgWyR7Y29uZmlnfV06IGApIFx0XHRcdFx0XHRcdFx0fHwgY29uZmlnXHRcdDtcclxuXHRcdFxyXG5cdFx0ZnMub3V0cHV0SnNvbihjb25maWcsIHtcclxuXHRcdFx0bmFtZSwgdmVyc2lvbiwgbWFpbixcclxuXHRcdFx0bWFwcGluZ3MsIGtleXdvcmRzLCBkZXNjcmlwdGlvbixcclxuXHRcdFx0XCIkc2NoZW1hXCI6IHBhdGgucmVsYXRpdmUoXCJcIiwgcGF0aC5qb2luKF9fZGlybmFtZSwgXCIvLi4vLi4vcmdsY2ZnLnNjaGVtYS5qc29uXCIpKVxyXG5cdFx0fSwge1xyXG5cdFx0XHRFT0w6IG9zLkVPTCxcclxuXHRcdFx0ZW5jb2Rpbmc6IFwiYXNjaWlcIixcclxuXHRcdFx0ZmxhZzogXCJ3XCIsXHJcblx0XHRcdG1vZGU6IDBvNzc1LFxyXG5cdFx0XHRzcGFjZXM6IDQsXHJcblx0XHR9KTtcclxuXHRcdGZzLm91dHB1dEpzb24oXCJwYWNrYWdlLmpzb25cIiwge1xyXG5cdFx0XHRuYW1lLCB2ZXJzaW9uLCBtYWluLFxyXG5cdFx0XHRrZXl3b3JkcywgZGVzY3JpcHRpb24sXHJcblx0XHRcdFwiZGVwZW5kZW5jaWVzXCI6IHsgcmdsOiBcIl4wLjFcIiB9LFxyXG5cdFx0XHRcInNjcmlwdHNcIjogeyBzdGFydDogXCJyZ2xcIiB9LFxyXG5cdFx0XHRcInByaXZhdGVcIjogdHJ1ZSxcclxuXHRcdFx0XCJsaXNjZW5jZVwiOiBcIklTQ1wiLFxyXG5cdFx0XHRcImhvbWVwYWdlXCI6IFwiXCIsXHJcblx0XHRcdFwiYnVnc1wiOiB7fSxcclxuXHRcdFx0XCJsaWNlbnNlXCI6IFwiSVNDXCIsXHJcblx0XHRcdFwiYXV0aG9yXCI6IFwiXCIsXHJcblx0XHRcdFwiY29udHJpYnV0b3JzXCI6IFtdLFxyXG5cdFx0XHRcImZpbGVzXCI6IFtcclxuXHRcdFx0XHRcIipcIlxyXG5cdFx0XHRdLFxyXG5cdFx0XHRcImJyb3dzZXJcIjogZmFsc2UsXHJcblx0XHRcdFwibWFuXCI6IFtcclxuXHRcdFx0XHRcImRvY1wiXHJcblx0XHRcdF0sXHJcblx0XHRcdFwiZGlyZWN0b3JpZXNcIjoge1xyXG5cdFx0XHRcdFwibGliXCI6IFwiLi9saWJcIixcclxuXHRcdFx0XHRcImJpblwiOiBcIi4vYmluXCIsXHJcblx0XHRcdFx0XCJtYW5cIjogXCIuL21hblwiLFxyXG5cdFx0XHRcdFwiZG9jXCI6IFwiLi9kb2NcIixcclxuXHRcdFx0XHRcImV4YW1wbGVcIjogXCIuL3Rlc3RcIixcclxuXHRcdFx0XHRcInRlc3RcIjogXCIuL3Rlc3RcIlxyXG5cdFx0XHR9LFxyXG5cdFx0XHRcInR5cGluZ3NcIjogXCIuL2xpYi90eXBpbmdzL1wiLFxyXG5cdFx0XHRcInR5cGVzVmVyc2lvbnNcIjoge1xyXG5cdFx0XHRcdFwiPj0zLjBcIjoge1xyXG5cdFx0XHRcdFx0XCIqXCI6IFtcclxuXHRcdFx0XHRcdFx0XCIuL2xpYi8qXCJcclxuXHRcdFx0XHRcdF1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0sXHJcblx0XHRcdFwicmVwb3NpdG9yeVwiOiB7IH0sXHJcblx0XHRcdFwiY29uZmlnXCI6IHtcclxuXHRcdFx0XHRcInBvcnRcIjogODA4MVxyXG5cdFx0XHR9LFxyXG5cdFx0XHRcImVuZ2luZXNcIjoge1xyXG5cdFx0XHRcdFwibm9kZVwiOiBcIj49MTMuMFwiLFxyXG5cdFx0XHRcdFwibnBtXCI6IFwiPj00LjBcIlxyXG5cdFx0XHR9LFxyXG5cdFx0XHRcImVuZ2luZVN0cmljdFwiOiB0cnVlLFxyXG5cdFx0XHRcIm9zXCI6IFtdLFxyXG5cdFx0XHRcImNwdVwiOiBbXSxcclxuXHRcdFx0XCJwcmVwYWNrXCI6IFwicm0gcmdsLSoudGd6XCIsXHJcblx0XHR9LCB7XHJcblx0XHRcdEVPTDogb3MuRU9MLFxyXG5cdFx0XHRlbmNvZGluZzogXCJhc2NpaVwiLFxyXG5cdFx0XHRmbGFnOiBcInd4XCIsXHJcblx0XHRcdG1vZGU6IDBvNzc1LFxyXG5cdFx0XHRzcGFjZXM6IDQsXHJcblx0XHR9LCBlcnIgPT4ge30pO1xyXG5cdFx0ZnMud3JpdGVGaWxlKG1haW4sIGAjIS91c3IvYmluL2VudiByZ2xcclxuXHJcblwidXNlIHN0cmljdFwiO1xyXG5cclxuY29uc3QgcmdsID0gcmVxdWlyZShcInJnbFwiKS5yZ2w7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGFzeW5jIGZ1bmN0aW9uIG1haW4ocmdsLCBtb2QpIHtcclxuXHRjb25zb2xlLmluZm8oXCJMYXVuY2hlZC5cIik7XHJcblx0XHJcblx0Ly9cclxufTsgLy9tYWluXHJcbmAsIHtcclxuXHRcdFx0ZmxhZzogXCJ3eFwiLFx0bW9kZTogMG83NzUsXHJcblx0XHRcdGVuY29kaW5nOiBcInV0ZjhcIixcclxuXHRcdH0sIGVyciA9PiB7fSk7XHJcblx0XHRmcy5jb3B5KHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLy4uLy4uL21hcHBpbmdzLmpzXCIpLCBtYXBwaW5ncywge1xyXG5cdFx0XHRkZXJlZmVyZW5jZTogZmFsc2UsXHJcblx0XHRcdG92ZXJ3cml0ZTogZmFsc2UsXHJcblx0XHRcdHByZXNlcnZlVGltZXN0YW1wczogdHJ1ZSxcclxuXHRcdFx0cmVjdXJzaXZlOiBmYWxzZSxcclxuXHRcdH0pO1xyXG5cdFx0ZnMuZW5zdXJlRGlyKFwiZGF0YS9tYXBzXCIpO1xyXG5cdFx0XHJcblx0XHRyZC5jbG9zZSgpO1xyXG5cdH0gLy9jYWxsZXJcclxuXHRcclxuXHRjYWxsZXIoKTtcclxufSBlbHNlIGlmICgvXig/OnAoPzpsKD86YXkpPyk/KT8kL2lzLnRlc3QoY29tbS5jb21tYW5kWzBdKSkge1xyXG5cdGxldCBmcm9tOiBzdHJpbmcgPSBcIlwiO1xyXG5cdFxyXG5cdHRyeSB7XHJcblx0XHRpZiAoY29tbS5jb21tYW5kWzFdICYmIGZzLnN0YXRTeW5jKGNvbW0uY29tbWFuZFsxXSkuaXNEaXJlY3RvcnkoKSkgeyAvL2lmIGRpclxyXG5cdFx0XHRwcm9jZXNzLmNoZGlyKGNvbW0uY29tbWFuZFsxXSk7XHJcblx0XHR9IGVsc2UgaWYgKGNvbW0uY29tbWFuZFsxXSkgeyAvL2lmIGpzb25cclxuXHRcdFx0ZnJvbSA9IHBhdGgucmVzb2x2ZShjb21tLmNvbW1hbmRbMV0pO1xyXG5cdFx0XHRsZXQgZGlyOiBzdHJpbmcgPSBwYXRoLmRpcm5hbWUoZnJvbSk7XHJcblx0XHRcdFxyXG5cdFx0XHRwcm9jZXNzLmNoZGlyKGRpcik7XHJcblx0XHR9XHJcblx0fSBjYXRjaChlKSB7XHJcblx0XHRjb25zb2xlLmVycm9yKFwiQmFkIHBhdGhcIik7XHJcblx0fVxyXG5cdFxyXG5cdGFzeW5jIGZ1bmN0aW9uIGNhbGxlcigpIHtcclxuXHRcdGxldCBkYXRhOiBQYXJ0aWFsPHJnbC5yZ2wuUkdMQ2ZnPiA9IHsgfTtcclxuXHRcdFxyXG5cdFx0Y29uc3Qgb3B0czogYWEuQ29tbWFuZExpbmVPcHRpb25zID0gYWEoW1xyXG5cdFx0XHR7IG5hbWU6IFwibmFtZVwiLCBhbGlhczogJ24nLCB0eXBlOiBTdHJpbmcgfSxcclxuXHRcdFx0eyBuYW1lOiBcInZlcnNpb25cIiwgYWxpYXM6ICd2JywgdHlwZTogU3RyaW5nIH0sXHJcblx0XHRcdHsgbmFtZTogXCJtYWluXCIsIHR5cGU6IFN0cmluZyB9LFxyXG5cdFx0XHR7IG5hbWU6IFwiZW50cnlcIiwgYWxpYXM6ICdlJywgdHlwZTogU3RyaW5nIH0sXHJcblx0XHRcdHsgbmFtZTogXCJtYXBwaW5nc1wiLCBhbGlhczogJ20nLCB0eXBlOiBTdHJpbmcgfSxcclxuXHRcdFx0eyBuYW1lOiBcImtleXdvcmRzXCIsIGFsaWFzOiAnaycsIHR5cGU6IChkOiBzdHJpbmcpOiBzdHJpbmdbXSA9PiBkLnNwbGl0KCcsJykgfSxcclxuXHRcdF0sIHtcclxuXHRcdFx0cGFydGlhbDogdHJ1ZSxcclxuXHRcdFx0Y2FtZWxDYXNlOiB0cnVlLFxyXG5cdFx0fSlcclxuXHRcdFxyXG5cdFx0aWYgKGZyb20pIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRkYXRhID0gYXdhaXQgZnMucmVhZEpzb24oZnJvbSwge1xyXG5cdFx0XHRcdFx0ZW5jb2Rpbmc6IFwiYXNjaWlcIixcclxuXHRcdFx0XHRcdGZsYWc6IFwiclwiLFxyXG5cdFx0XHRcdFx0dGhyb3dzOiB0cnVlLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9IGNhdGNoKGUpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRmFpbHVyZTogXCIgKyBlLm1lc3NhZ2UpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGRhdGEgPSBhd2FpdCBmcy5yZWFkSnNvbihmcm9tID0gXCJyZ2xjZmcuanNvblwiLCB7XHJcblx0XHRcdFx0XHRlbmNvZGluZzogXCJhc2NpaVwiLFxyXG5cdFx0XHRcdFx0ZmxhZzogXCJyXCIsXHJcblx0XHRcdFx0XHR0aHJvd3M6IHRydWUsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0gY2F0Y2goZSkge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRkYXRhID0gYXdhaXQgZnMucmVhZEpzb24oZnJvbSA9IFwicGFja2FnZS5qc29uXCIsIHtcclxuXHRcdFx0XHRcdFx0ZW5jb2Rpbmc6IFwiYXNjaWlcIixcclxuXHRcdFx0XHRcdFx0ZmxhZzogXCJyXCIsXHJcblx0XHRcdFx0XHRcdHRocm93czogdHJ1ZSxcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0gY2F0Y2goaWduKSB7XHJcblx0XHRcdFx0XHRmcm9tID0gXCJcIjtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJObyBwYWNrYWdlXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRkYXRhLm5hbWVcdFx0XHQ9IG9wdHMubmFtZVx0XHRcdHx8IGRhdGEubmFtZVx0XHRcdFx0O1xyXG5cdFx0ZGF0YS5tYWluXHRcdFx0PSBvcHRzLm1haW5cdFx0XHR8fCBvcHRzLmVudHJ5XHR8fCBkYXRhLm1haW47XHJcblx0XHRkYXRhLm1hcHBpbmdzXHRcdD0gb3B0cy5tYXBwaW5nc1x0XHR8fCBkYXRhLm1hcHBpbmdzXHRcdFx0O1xyXG5cdFx0ZGF0YS5kZXNjcmlwdGlvblx0PSBvcHRzLmRlc2NyaXB0aW9uXHR8fCBkYXRhLmRlc2NyaXB0aW9uXHRcdFx0O1xyXG5cdFx0ZGF0YS52ZXJzaW9uXHRcdD0gb3B0cy52ZXJzaW9uXHRcdHx8IGRhdGEudmVyc2lvblx0XHRcdFx0O1xyXG5cdFx0ZGF0YS5rZXl3b3Jkc1x0XHQ9IG9wdHMua2V5d29yZHNcdFx0fHwgZGF0YS5rZXl3b3Jkc1x0XHRcdDtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIChhd2FpdCByZ2wucmdsLlJHTC5sb2FkKGRhdGEpKS5leGVjKCk7XHJcblx0fSAvL2NhbGxlclxyXG5cdFxyXG5cdGNhbGxlcigpLmNhdGNoKChlOiBFcnJvcikgPT4gY29uc29sZS5lcnJvcihcIkZhaWx1cmU6IFwiICsgZS5tZXNzYWdlKSk7XHJcbn0gZWxzZVxyXG5cdGNvbnNvbGUud2FybihcIkJhZFwiLCBoZWxwKCkpO1xyXG4iXX0=