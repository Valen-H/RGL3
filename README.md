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
* main: path=main.js - Entry of package
* mappings: path=mappings.json - map of fg/bg/stl

### RGLM format

```ts
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

## RGL binary

```ts
rgl[play path<string=.>] - play package at path - if directory, search rglcfg.json/package.json, else play
rgl map[ path<string>] - Display/Edit map interactively
rgl make[ name<string>] - make new package - Give directory name if not provided
```

## Usage

```bash
rgl c myNewGame
```

After that edit the `./main.js` (and other files), run the outcome with `npm start`.
The Engine instance and module is passed as parameters to main's default export function.

> *More documentation soon...*
