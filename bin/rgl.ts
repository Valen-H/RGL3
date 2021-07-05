#!/usr/bin/env node

"use strict";

import RGL from "../lib/rgl";
import * as os from "os";

const BINAME: "rgl" = "rgl";

if (process.argv.length <= 2) {
	console.info(`Usage:${os.EOL}\t${BINAME}[ path] - play a package${os.EOL}\t${BINAME} make[ name<string>=cwd-base]${os.EOL}`);
}
