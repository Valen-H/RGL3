#!/usr/bin/env node
/// <reference path="../lib/rgl">

"use strict";

import * as fs from "fs-extra";
import * as path from "path";
import * as readline from "readline";
import * as os from "os";
import { default as aa } from "command-line-args";
import * as rgl from "../lib/rgl";

const BINAME: "rgl" = "rgl",
	comm: aa.CommandLineOptions = aa([
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
} else if (/-{0,2}ma?p$/i.test(comm.command[0])) {
	require("./map")(comm.command[1], aa([
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
} else if (/-{0,2}(?:m(?:ake)?|c(?:r(?:eate)?)?)$/i.test(comm.command[0])) {
	const comm: aa.CommandLineOptions = aa([
		{ name: "command", type: String, defaultOption: true },
		{ name: "name", alias: 'n', type: String },
		{ name: "version", alias: 'v', type: String },
		{ name: "main", type: String },
		{ name: "entry", alias: 'e', type: String },
		{ name: "mappings", alias: 'm', type: String },
		{ name: "description", alias: 'd', type: String },
		{ name: "keywords", alias: 'k', type: (d: string): string[] => d.split(',') },
	], {
		partial: true,
		camelCase: true,
	}), rd = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		tabSize: 4,
	});
	let from: string = "";
	
	rd.pause();
	
	try {
		if (comm.command[1] && fs.statSync(comm.command[1]).isDirectory()) { //if dir
			fs.ensureDirSync(comm.command[1], { mode: 0o775 });
			process.chdir(comm.command[1]);
		} else if (comm.command[1]) { //if json
			from = path.resolve(comm.command[1]);
			let dir: string = path.dirname(from);
			
			fs.ensureDirSync(dir, { mode: 0o775 });
			process.chdir(dir);
		}
	} catch(e) {
		fs.ensureDirSync(comm.command[1], { mode: 0o775 });
		process.chdir(comm.command[1]);
	}
	
	async function caller() {
		let data: Partial<rgl.rgl.RGLCfg> = { };
		
		if (from) {
			try {
				data = await fs.readJson(from, {
					encoding: "ascii",
					flag: "r",
					throws: true,
				});
			} catch(e) { }
		} else {
			try {
				data = await fs.readJson(from = "rglcfg.json", {
					encoding: "ascii",
					flag: "r",
					throws: true,
				});
			} catch(e) {
				try {
					data = await fs.readJson(from = "package.json", {
						encoding: "ascii",
						flag: "r",
						throws: true,
					});
				} catch(ign) { from = ""; }
			}
		}
		
		let name:			string		= comm.name			|| data.name		|| path.basename(process.cwd())	,
			version:		string		= comm.version		|| data.version		|| "0.1.0"						,
			main:			string		= comm.main			|| comm.entry		|| data.main || "./main.js"		,
			mappings:		string		= comm.mappings		|| data.mappings	|| "./mappings.js"				,
			description:	string		= comm.description	|| data.description	|| ""							,
			keywords:		string[]	= comm.keywords		|| data.keywords	|| []							,
			config:			string		= from				|| "rglcfg.json"									;
		
		async function question(what: string): Promise<string> {
			return new Promise((res, rej) => rd.question(what, res));
		}; //question
		
		name		=  await question(`name [${name}]: `)								|| name			;
		version		=  await question(`version [${version}]: `)							|| version		;
		description	=  await question(`description [${description}]: `)					|| description	;
		main		=  await question(`entry [${main}]: `)								|| main			;
		mappings	=  await question(`mappings [${mappings}]: `)						|| mappings		;
		keywords	= (await question(`keywords [separate with comma]: `)).split(',')	|| keywords		;
		config		=  await question(`config [${config}]: `) 							|| config		;
		
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
			"repository": { },
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
		}, err => {});
		fs.writeFile(main, `#!/usr/bin/env rgl

"use strict";

const rgl = require("rgl").rgl;

module.exports = async function main(rgl, mod) {
	console.info("Launched.");
	
	//
}; //main
`, {
			flag: "wx",	mode: 0o775,
			encoding: "utf8",
		}, err => {});
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
} else if (/^(?:p(?:l(?:ay)?)?)?$/is.test(comm.command[0])) {
	let from: string = "";
	
	try {
		if (comm.command[1] && fs.statSync(comm.command[1]).isDirectory()) { //if dir
			process.chdir(comm.command[1]);
		} else if (comm.command[1]) { //if json
			from = path.resolve(comm.command[1]);
			let dir: string = path.dirname(from);
			
			process.chdir(dir);
		}
	} catch(e) {
		console.error("Bad path");
	}
	
	async function caller() {
		let data: Partial<rgl.rgl.RGLCfg> = { };
		
		const opts: aa.CommandLineOptions = aa([
			{ name: "name", alias: 'n', type: String },
			{ name: "version", alias: 'v', type: String },
			{ name: "main", type: String },
			{ name: "entry", alias: 'e', type: String },
			{ name: "mappings", alias: 'm', type: String },
			{ name: "keywords", alias: 'k', type: (d: string): string[] => d.split(',') },
		], {
			partial: true,
			camelCase: true,
		})
		
		if (from) {
			try {
				data = await fs.readJson(from, {
					encoding: "ascii",
					flag: "r",
					throws: true,
				});
			} catch(e) {
				console.error("Failure: " + e.message);
			}
		} else {
			try {
				data = await fs.readJson(from = "rglcfg.json", {
					encoding: "ascii",
					flag: "r",
					throws: true,
				});
			} catch(e) {
				try {
					data = await fs.readJson(from = "package.json", {
						encoding: "ascii",
						flag: "r",
						throws: true,
					});
				} catch(ign) {
					from = "";
					console.error("No package");
				}
			}
		}
		
		data.name			= opts.name			|| data.name				;
		data.main			= opts.main			|| opts.entry	|| data.main;
		data.mappings		= opts.mappings		|| data.mappings			;
		data.description	= opts.description	|| data.description			;
		data.version		= opts.version		|| data.version				;
		data.keywords		= opts.keywords		|| data.keywords			;
		
		return (await rgl.rgl.RGL.load(data)).exec();
	} //caller
	
	caller().catch((e: Error) => console.error("Failure: " + e.message));
} else
	console.warn("Bad", help());
