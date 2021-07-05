# RGL

These are the specifications of the RGL engine.

## Features

* Exported static RGL maps (.rglm - RGLM format)
* Map scrolling
* Terminal ANSI support (foreground, background, styling, cursor, misc/etc...)
* Map builder binary
* RGL player binary
* RGL tools (message popups, Events, ...)
* Keyboard capturing
* RGL config/packages

## RGL package

Each RGL package contains a config.

### Config

* name: string - Name of the Package
* description: string - Description of the Package
* version: number? - Revision number
* entry: path=main.js - Entry of package
* mappings: path=mappings.json - map of fg/bg/stl

### RGLM format

```js
magic = 4B
width = 2B
height = 2B
chunks... = ? % 8B
end = 8B
meta = ?
```

`chunk = chr4B fg bg stl cust` = 8B (each entry from 0-254)
`end = 255 x4` (optional)
`meta = key=value&...` (urlstring - optional)

## RGL Class (extends Event)

```js
load(json/path/file="./rglcfg.json") -> RGL
execEntry(path/file=this.entry) -> eval_out
captureKeys(on/off/toggle) -> keys_state
store(path/file="./rglcfg.json") -> json
```

## RGLMap Class

```js
.viewbox[number, number, number, number ] = [-1, -1, width, height] // x,y,dx,dy - -1 means auto-for-centering - automatic width/height based on tty
.chunks: Chunk[] = [ ]
.fromfile: string //source of map
._id

load(buffer) -> RGLMap
loadFile(path/file) -> RGLMap
store() -> Buffer
storeFile(path/file) -> bool

calcChkIdx(x, y) -> number
calcChkCrd(n) -> [ number, number ]
getChunk(x[, y]) -> Chunk //get indexed or coordinated
moveChunk(from, to, swap=false) -> Chunk //return to, inputs are idx or crd
moveLine(from, to, swap=false)

print(width=auto) -> string
stamp(tty) -> this
```

## RGLChunk Class

```js
.fg
.bg
.st
.owner_map
._id

getBlank() -> RGLChunk // make blank Chunk
parse(buffer) -> RGLChunk
zip() -> buffer
putIfVisible(x, y, tty)
print() -> string
```

## RGL binary

```js
rgl - play local package (search for rglcfg.json)
rgl <path> - play package at path
rgl rglm_file<path> - Display map interactively
rgl make name<string> - make new package
```
