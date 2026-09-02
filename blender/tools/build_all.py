"""
Build the whole EXMOB prototype library headless:

    blender -b -P blender/tools/build_all.py -- --out blender/exports

Then `tools/build-blender-assets.mjs` copies exports into assets/models and writes manifest.json.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import build_characters  # noqa: E402
import build_weapons  # noqa: E402
import build_props  # noqa: E402
import build_architecture  # noqa: E402
import build_vehicles  # noqa: E402
import build_environment  # noqa: E402

import traceback  # noqa: E402

failed = False
for mod in (build_characters, build_weapons, build_props, build_architecture, build_vehicles, build_environment):
    try:
        mod.main()
    except Exception:
        traceback.print_exc()
        failed = True
if failed:
    print('[EXMOB] library build FAILED')
    sys.exit(1)
print('[EXMOB] library build complete')
