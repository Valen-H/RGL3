"use strict";

const mod = require("../"),
	util = require("util");

mod.rgl.RGL.load("./test/rglcfg.json").then(rgl => {
	rgl.capture();
	rgl.writeE("Loaded");
	
	let map = mod.rglm.RGLM.RGLMap.parse("./test/map.rglm", rgl);
	
	rgl.clear().then(async () => {
		rgl.writeE(`Color Depth: ${rgl.cDpt}`);
		rgl.exec();
		rgl.writeE(`cur ${rgl.cursor}`);
		
		map = await map;
		
		await map.store();
		rgl.writeE(`Map stored. (${map.print})`);
		await map.stamp();
	});
	
	rgl.on("rawkey", (k) => {
		if (!k.compare(mod.rgl.RGL.special_keys.ctrlC))			process.exit(0);
		else if (!k.compare(mod.rgl.RGL.special_keys.ctrlV))	rgl.writeE("PASTE");
		else if (!k.compare(mod.rgl.RGL.special_keys.up))		rgl.writeE("UP");
		else if (!k.compare(mod.rgl.RGL.special_keys.down))		rgl.writeE("DOWN");
		else if (!k.compare(mod.rgl.RGL.special_keys.left))		rgl.writeE("LEFT");
		else if (!k.compare(mod.rgl.RGL.special_keys.right))	rgl.writeE("RIGHT");
		else if (!k.compare(mod.rgl.RGL.special_keys.enter))	rgl.writeE("ENTER");
		else	rgl.writeE(util.inspect(k), '\t');
	});
	rgl.on("clear", (...o) => rgl.writeE("CLEAR", ...o));
});
