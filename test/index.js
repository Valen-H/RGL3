"use strict";

const mod = require("../");

//console.log("..");

mod.rgl.RGL.load().then(rgl => {
	rgl.capture();
	rgl.writeE("Loaded");
	
	let map = mod.rglm.RGLM.RGLMap.parse("./test/map.rglm");
	
	rgl.clear().then(async () => {
		rgl.writeE(`Color Depth: ${rgl.cDpt}`);
		rgl.exec();
		rgl.writeE(`cur ${rgl.cursor}`);
		
		map = await map;
		
		await map.store();
		rgl.writeE("Map stored.");
	});
	
	//console.log(mod.rgl.save);
	//console.debug(rgl);
	//console.log(mod.rgl.restore);
	
	rgl.on("rawctrlkey", (k, c, a, b) => {
		if (a) rgl.writeE("ALT");
		if (!k.compare(mod.rgl.RGL.special_keys.ctrlC))			process.exit(0);
		else if (!k.compare(mod.rgl.RGL.special_keys.ctrlV))	rgl.writeE("PASTE");
		else if (!k.compare(mod.rgl.RGL.special_keys.up))		rgl.writeE("UP");
		else if (!k.compare(mod.rgl.RGL.special_keys.down))		rgl.writeE("DOWN");
		else if (!k.compare(mod.rgl.RGL.special_keys.left))		rgl.writeE("LEFT");
		else if (!k.compare(mod.rgl.RGL.special_keys.right))	rgl.writeE("RIGHT");
		else if (!k.compare(mod.rgl.RGL.special_keys.enter))	rgl.writeE("ENTER");
		else	rgl.writeE(k, k.toString("utf8"), c.toString("utf8"), b.toString());
	});
	rgl.on("clear", (...o) => rgl.writeE("CLEAR", ...o));
	
	//setInterval(() => rgl.clear([1, 2, 3, 4, 5, 6]), 2000);
});
