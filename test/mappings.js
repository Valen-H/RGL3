#!/usr/bin/env rgl

"use strict";

const c = require("chalk"),
	assert = require("assert");

console.info("Test Mappings Loaded.");

module.exports = {
	fg: [
		s => c.black(s),			//0
		s => c.red(s),				//1
		s => c.green(s),			//2
		s => c.yellow(s),			//3
		s => c.blue(s),				//4
		s => c.magenta(s),			//5
		s => c.cyan(s),				//6
		s => c.white(s),			//7
		s => c.blackBright(s),		//8
		s => c.redBright(s),		//9
		s => c.greenBright(s),		//10
		s => c.yellowBright(s),		//11
		s => c.blueBright(s),		//12
		s => c.magentaBright(s),	//13
		s => c.cyanBright(s),		//14
		s => c.whiteBright(s),		//15
	],
	bg: [
		s => c.bgBlack(s),			//0
		s => c.bgRed(s),			//1
		s => c.bgGreen(s),			//2
		s => c.bgYellow(s),			//3
		s => c.bgBlue(s),			//4
		s => c.bgMagenta(s),		//5
		s => c.bgCyan(s),			//6
		s => c.bgWhite(s),			//7
		s => c.bgBlackBright(s),	//8
		s => c.bgRedBright(s),		//9
		s => c.bgGreenBright(s),	//10
		s => c.bgYellowBright(s),	//11
		s => c.bgBlueBright(s),		//12
		s => c.bgMagentaBright(s),	//13
		s => c.bgCyanBright(s),		//14
		s => c.bgWhiteBright(s),	//15
	],
	st: [
		s => c.reset(s),			//0
		s => c.bold(s),				//1
		s => c.dim(s),				//2
		s => c.italic(s),			//3
		s => c.underline(s),		//4
		s => c.inverse(s),			//5
		s => c.hidden(s),			//6
		s => c.strikethrough(s),	//7
		s => c.visible(s),			//8
	],
	cust: []
};

assert.ok(Object.values(module.exports).every(m => m.length < 0xff), "Cannot have more than 254 category mappings");
