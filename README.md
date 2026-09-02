# EXMOB

**You can leave the family. The family doesn't leave you.**

EXMOB is a stylish browser-based 3D action-survival game. You play Ray Moretti, a former
organized-crime fixer who walked away from the Vescari Family knowing far too much. A contract has
been placed on him. He is being hunted. The game is about surviving each attack on the place he
calls home, getting paid, improving his defenses, and eventually being forced to move on to
something bigger.

**Current version: v0.1.0** (Chapter 1 vertical slice - THE CABIN)

> This is an early vertical slice. The only playable content is Chapter 1: The Cabin
> (five waves). See [docs/STATUS.md](docs/STATUS.md) for an honest breakdown of what works,
> what is placeholder, and what is not started.

## Play it

The game must be served over HTTP. Browsers block ES modules and GLB assets over `file://`, so
double-clicking `index.html` will show a blank page with an explanation. Use the dev server:

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default `http://localhost:5173/`).

Production build (outputs a static site in `dist/` that can be hosted anywhere):

```bash
npm run build
npm run preview
```

Tests:

```bash
npm test
```

Regenerate the Blender asset library (requires Blender 4.2+ on PATH or `BLENDER_PATH` set):

```bash
npm run blender:build
```

## Controls

### Desktop

| Key | Action |
| --- | --- |
| WASD | Move |
| Mouse | Aim |
| Left mouse | Fire |
| Right mouse (hold) | Precision aim: tighter spread, slower movement |
| R | Reload |
| E | Interact (doors, repair, board window) |
| Space | Dodge roll |
| 1-4 | Weapon slots |
| Tab | Shop (between waves only) |
| Enter | READY (start next wave early) |
| ESC | Pause |
| F3 | Debug overlay (dev mode only) |

### Mobile / touch

Left thumb: virtual move stick. Right thumb: virtual aim stick (pushing it past the
dead zone fires automatically). On-screen buttons: INTERACT, RELOAD, WEAPON, DODGE,
SHOP/READY, PAUSE. Touch controls are built as a first-class input path, not an overlay.

Dev mode: add `?dev=1` to the URL to enable the DEBUG menu button and the debug overlay.
Smoke test harness: `?dev=1&smoke=1` runs the automated smoke sequence and prints results.

## Repository map

```
index.html            Entry point
src/                  Game source (ES modules)
src/data/             Data registries (enemies, weapons, waves, economy, ...)
assets/               Runtime assets (exported GLB, textures, audio)
blender/              Blender source library + generator/export scripts
docs/                 Design bible and technical documentation
tests/                Vitest unit tests
tools/                Build and validation scripts
```

## Documentation

Start with [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) and
[docs/CABIN_VERTICAL_SLICE.md](docs/CABIN_VERTICAL_SLICE.md). Rules for anyone (human or AI)
working on the codebase are in [AGENTS.md](AGENTS.md). Architectural decisions are recorded in
[docs/DECISIONS.md](docs/DECISIONS.md). Current state of every system: [docs/STATUS.md](docs/STATUS.md).

## License

Proprietary. See [LICENSE](LICENSE).
