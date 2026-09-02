# EXMOB - SAVE SYSTEM

## Storage

Primary: **IndexedDB** (`exmob` database, `saves` store, key `main`, `settings` key `settings`).
Fallback: `localStorage` when IndexedDB is unavailable (private mode, some WebViews).

Export/import produce a JSON blob (with schema version) for backup and device transfer.
RESET wipes both stores.

## Schema (version 1)

```json
{
  "schemaVersion": 1,
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
  "stats": { "kills": 0, "shotsFired": 0, "shotsHit": 0, "cashEarned": 0, "cashSpent": 0, "deaths": 0, "wavesSurvived": 0, "playTime": 0 }
}
```

## When the game saves

- After every cleared wave (campaign + player + stats).
- When settings change.
- On NEW GAME (fresh save).
- A **wave-start snapshot** is kept in memory for RETRY WAVE; it is not persisted.

## Migrations

`src/save/migrations.js` exports an ordered array of `{ from, to, migrate(data) }`. `SaveManager`
applies every migration from the stored version to `CURRENT_SCHEMA_VERSION` on load, then
validates. Unknown future versions are refused with a clear message (the game does not
downgrade). Every schema change must:

1. bump `CURRENT_SCHEMA_VERSION`,
2. add a migration,
3. add a unit test in `tests/save.test.js`.

## Cloud

Not implemented. The blob format is designed to be uploaded as-is later.
