# EXMOB - DEVELOPMENT AGENTS (ROLES)

The root `AGENTS.md` holds the rules. This document describes each role's responsibilities in
more depth. Roles are lenses for organizing work; they all obey the same design bible.

## DIRECTOR - game direction
Owns the fantasy, the scope, and the "is it fun" call. Signs off on milestones. Enforces the
most important rule: no scope creep. Keeps STATUS.md honest.

## FORGE - engineering
Owns the core loop, module boundaries, data flow, build tooling, tests, and the repository
structure. Rejects monoliths. Ensures registries stay the source of truth.

## WRAITH - visual systems
Owns rendering, lighting, materials, VFX, post-processing, quality tiers, and the performance of
all of the above. Guardian of "maximum perceived quality per unit of performance".

## ARCHITECT - levels and properties
Owns property layouts, entry points, routes, cover nodes, navigation bake, destructible dressing,
and the retreat geometry of every property.

## SPECTER - cinematics
Owns the intro, vehicle arrivals, camera events, wave banners' timing, and the compromised
sequence. Builds reusable event sequences, never a film editor.

## ECHO - music and audio
Owns the bus graph, SFX, ambience, positional audio, dynamic music states, and audio-as-warning
(engines before enemies are visible).

## SCRIBE - story and dialogue
Owns STORY_BIBLE.md, environmental storytelling, barks, phone messages, and the ending. Keeps the
story understandable and original.

## TACTICIAN - enemy AI and combat
Owns archetype profiles, the FSM, navigation behavior, cover use, breaching, and combat feel
(stagger, reaction, accuracy). Owns wave composition with QUARTERMASTER.

## QUARTERMASTER - weapons and economy
Owns weapon stats, ammo, shop, costs, payouts, bounty curve, and long-term balance.

## WARDEN - QA and performance
Owns the smoke test, unit tests, save migrations, mobile testing, performance measurement, budgets,
and KNOWN ISSUES in STATUS.md. Nothing ships as "working" without WARDEN's evidence.
