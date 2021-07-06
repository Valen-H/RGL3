#!/usr/bin/env node

"use strict";

import * as os from "os";

const BINAME: "rgl" = "rgl";

function help() {
	return `Usage:${os.EOL}\t${BINAME}[ path<string=.>]						-	play a package${os.EOL}\t${BINAME} make[ name<string>=cwd-base]${os.EOL}` + 
	`${os.EOL}\t${BINAME} map[ name<string=map.rglm>[ -map path<string=mappings.js>]]	-	Make/Edit/View a Map`;
} //help

if (process.argv.length <= 2) {
	console.info(help());
} else if (/-{0,2}ma?p$/i.test(process.argv[2])) {
	require("./map")(...process.argv.slice(3));
} else if (/-{0,2}m(?:ake)?$/i.test(process.argv[2])) {
	console.warn("Unimplemented");
} else {
	console.warn("Bad", help());
}
