# EXMOB - AGENTS AND DEVELOPMENT RULES

This file defines the roles used when developing EXMOB with AI assistance, and the rules every
contributor (human or AI) must follow. Roles are organizational lenses, not separate
implementations. All roles obey the same design bible in `docs/`.

A longer description of each role's responsibilities lives in `docs/AGENTS.md`.

## Roles

| Role | Owns | Primary docs |
| --- | --- | --- |
| **DIRECTOR** | Game direction, scope, fun, milestone sign-off | GAME_DESIGN, CABIN_VERTICAL_SLICE, STATUS |
| **FORGE** | Engineering: core loop, modules, data flow, build, tests | TECHNICAL_ARCHITECTURE, DECISIONS |
| **WRAITH** | Visual systems: rendering, lighting, VFX, quality tiers | GRAPHICS_TECHNOLOGY, ART_DIRECTION, PERFORMANCE_BUDGET |
| **ARCHITECT** | Levels and properties: layouts, entry points, nav, damage | PROPERTY_SYSTEM, CAMPAIGN_ROADMAP |
| **SPECTER** | Cinematics: intro, arrivals, camera events | GAME_DESIGN (cinematics), TECHNICAL_ARCHITECTURE |
| **ECHO** | Music and audio: buses, SFX, dynamic music | TECHNICAL_ARCHITECTURE (audio), ART_DIRECTION |
| **SCRIBE** | Story, dialogue, environmental storytelling | STORY_BIBLE |
| **TACTICIAN** | Enemy AI and combat feel | AI_SYSTEM, ENEMY_DESIGN, WAVE_SYSTEM |
| **QUARTERMASTER** | Weapons, economy, upgrades, balance | WEAPONS, ECONOMY, PROGRESSION |
| **WARDEN** | QA, performance, mobile, saves, stability | MOBILE_REQUIREMENTS, PERFORMANCE_BUDGET, SAVE_SYSTEM, STATUS |

## Rules

1. **Never rebuild a working system unnecessarily.** Extend it.
2. **Never rewrite the entire game for a small feature.**
3. **Preserve backwards compatibility when reasonable.** Especially save data and registry keys.
4. **Keep systems modular.** One module, one owner. No `game.js` monolith. Files over ~600 lines
   need a documented reason.
5. **Update documentation when behavior changes.** The docs are the design bible, not decoration.
6. **Update `CHANGELOG.md`** for every user-visible change, and bump the version in
   `package.json` and `src/core/Config.js` for meaningful builds.
7. **Test mobile controls when input changes.** At minimum run the touch path in a mobile
   viewport and note what was tested in `docs/STATUS.md`.
8. **Test save migration when the save schema changes.** Add a migration and a unit test.
9. **Do not silently change game design.** If you disagree with the bible, write it down first.
10. **New ideas that contradict the design bible must be documented before implementation.**
    Put them in `docs/FUTURE_FEATURES.md` or a new ADR in `docs/DECISIONS.md`.
11. **Never build future chapters just because their systems appear in documentation.**
12. **CABIN remains the only initial production content** until the DIRECTOR signs off that it is
    fun (see `docs/CABIN_VERTICAL_SLICE.md`, success criteria).
13. **Optimize before increasing enemy caps.** Measure first. Budgets live in
    `docs/PERFORMANCE_BUDGET.md`.
14. **Never commit generated junk.** No `node_modules/`, `dist/`, caches, or Blender backup files.
15. **Keep Blender source and exported runtime assets clearly separated.** Source lives in
    `blender/`, runtime GLB in `assets/models/`. Never edit exported GLB by hand.
16. **Data-driven first.** Enemies, weapons, waves, prices, and defenses are defined in
    `src/data/` registries, not hard-coded in gameplay classes.
17. **Do not fake completion.** Stubs, placeholders, untested paths, and unmeasured performance
    must be labeled as such in `docs/STATUS.md`.
18. **Originality.** No copyrighted characters, dialogue, layouts, or scenes. Inspired by the
    genre, never copied from a specific work.

## Definition of done for a change

- Code is modular and follows the existing structure.
- Registries validate (`npm run validate:data`).
- Unit tests pass (`npm test`).
- Manual smoke test performed or the in-browser harness (`?dev=1&smoke=1`) passes.
- Docs, CHANGELOG, and STATUS updated.
