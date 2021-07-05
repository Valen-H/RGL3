#!/usr/bin/env rgl

"use strict";

const c = require("chalk");

console.info("Mappings loaded.");

module.exports = {
	fg: [
		s => black(s),
		s => red(s),
		s => green(s),
		s => yellow(s),
		s => blue(s),
		s => magenta(s),
		s => cyan(s),
		s => white(s),
		s => blackBright(s),
		s => redBright(s),
		s => greenBright(s),
		s => yellowBright(s),
		s => blueBright(s),
		s => magentaBright(s),
		s => cyanBright(s),
		s => whiteBright(s),
	],
	bg: [
		s => bgBlack(s),
		s => bgRed(s),
		s => bgGreen(s),
		s => bgYellow(s),
		s => bgBlue(s),
		s => bgMagenta(s),
		s => bgCyan(s),
		s => bgWhite(s),
		s => bgBlackBright(s),
		s => bgRedBright(s),
		s => bgGreenBright(s),
		s => bgYellowBright(s),
		s => bgBlueBright(s),
		s => bgMagentaBright(s),
		s => bgCyanBright(s),
		s => bgWhiteBright(s),
	],
	st: [
		s => c.reset(s),
		s => bold(s),
		s => dim(s),
		s => italic(s),
		s => underline(s),
		s => inverse(s),
		s => hidden(s),
		s => strikethrough(s),
		s => visible(s),
	],
	cust: []
};
