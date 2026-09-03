# EXMOB - SAVE SYSTEM

## Storage

Primary: **IndexedDB** (`exmob` database, `saves` store, key `main`, `settings` key `settings`).
Fallback: `localStorage` when IndexedDB is unavailable (private mode, some WebViews).

Export/import produce a JSON blob (with schema version) for backup and device transfer.
RESET wipes both stores.

## Schema (version 3)

```json
{
  "schemaVersion": 2,
  "createdAt": 0,
  "updatedAt": 0,
  "settings": {
    "quality": "auto",
    "masterVolume": 0.8, "musicVolume": 0.6, "sfxVolume": 1.0,
    "screenShake": 1.0,
    "touchScale": 1.0,
    "difficulty": "normal"
  },
  "campaign": {
    "chapter": "cabin",
    "waveIndex": 0,
    "completed": false
  },
  "player": {
    "cash": 350,
    "bounty": 25000,
    "health": 100,
    "armor": 0,
    "weapons": { "pistol": { "owned": true, "mag": 12, "reserve": 60 } },
    "equipped": "pistol",
    "unlockedDefenses": ["boards", "door_repair"]
  },
  "property": {
    "id": "cabin",
    "upgrades": []
  },
  "stats": { "kills": 0, "shotsFired": 0, "shotsHit": 0, "meleeHits": 0, "meleeKills": 0, "cashEarned": 0, "cashSpent": 0, "deaths": 0, "wavesSurvived": 0, "playTime": 0 }
}
```

## Schema versions

| Version | Added |
| --- | --- |
| 1 | Baseline: campaign, player, weapons, property, stats |
| 2 | Melee statistics (`stats.meleeHits`, `stats.meleeKills`) |
| 3 | `property.upgrades`: the standing defense installations bought from the shop |

Every bump ships with a migration in `src/save/migrations.js` and a test in `tests/save.test.js`.
The v3 migration also drops ids that are not purchasable installations, because an early save
could list `boards` and `door_repair` there and those are always available.

## When the game saves

- After every cleared wave (campaign + player + stats).
- When settings change.
- On NEW GAME (fresh save).
- A **wave-start snapshot** is kept in memory for RETRY WAVE; it is not persisted.

## Migrations

`src/save/migrations.js` exports an ordered array of `{ from, to, migrate(data) }`. Shipped
migrations: 0 -> 1 (pre-release saves without a version), 1 -> 2 (melee statistics). `SaveManager`
applies every migration from the stored version to `CURRENT_SCHEMA_VERSION` on load, then
validates. Unknown future versions are refused with a clear message (the game does not
downgrade). Every schema change must:

1. bump `CURRENT_SCHEMA_VERSION`,
2. add a migration,
3. add a unit test in `tests/save.test.js`.

## Cloud

Not implemented. The blob format is designed to be uploaded as-is later.
