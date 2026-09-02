"""
Modular cabin architecture (library assets). Module sizes match src/data/properties/cabin.js:
wall 1.0 x 2.8 x 0.2, window 1.2 wide sill 0.9 height 1.2, door 1.0 x 2.1.

The runtime currently assembles the Cabin procedurally from the same numbers (ADR-012); these
modules exist so the production pass can swap in authored geometry without touching gameplay.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from exmob_lib import (clear_scene, material, hexcol, box, empty, parent, export_glb, save_blend, out_dir, blend_dir, plane)  # noqa: E402

H, T, WW, WH, SILL, DW, DH = 2.8, 0.2, 1.2, 1.2, 0.9, 1.0, 2.1


def mats():
    return dict(
        ext=material('MAT_Wood_Cabin_Ext', hexcol(0xb08a66), roughness=0.85),
        intr=material('MAT_Wood_Cabin_Int', hexcol(0xd9b48c), roughness=0.8),
        trim=material('MAT_Wood_Trim', hexcol(0x3a2a1c), roughness=0.8),
        door=material('MAT_Wood_Door', hexcol(0x8a6a48), roughness=0.75),
        floor=material('MAT_Wood_Floor', hexcol(0xb8926a), roughness=0.7),
        roof=material('MAT_Roof_Shingle', hexcol(0x6a5a4a), roughness=0.95),
        glass=material('MAT_Glass_Window', hexcol(0x9fc4ff), roughness=0.05, alpha=0.22),
        metal=material('MAT_Metal_Dark', hexcol(0x2a2c30), roughness=0.5, metallic=0.7),
    )


def wall(name='ENV_Cabin_Wall_A'):
    m = mats()
    root = empty(name)
    parent(box(name + '_Geo', (1.0, T, H), m['ext'], offset=(0.5, 0, H / 2)), root)
    return root, 'walls'


def corner(name='ENV_Cabin_Corner_A'):
    m = mats()
    root = empty(name)
    parent(box(name + '_Post', (T + 0.1, T + 0.1, H + 0.05), m['trim'], offset=(0, 0, H / 2)), root)
    return root, 'walls'


def floor_tile(name='ENV_Cabin_Floor_A'):
    m = mats()
    root = empty(name)
    parent(box(name + '_Geo', (1.0, 1.0, 0.02), m['floor'], offset=(0.5, 0.5, 0.01)), root)
    return root, 'floors'


def window(name='ENV_Cabin_Window_A', broken=False):
    m = mats()
    root = empty(name)
    # sill wall + header
    parent(box(name + '_SillWall', (WW, T, SILL), m['ext'], offset=(0, 0, SILL / 2)), root)
    parent(box(name + '_Header', (WW, T, H - SILL - WH), m['ext'], offset=(0, 0, SILL + WH + (H - SILL - WH) / 2)), root)
    for i, z in enumerate((SILL, SILL + WH)):
        parent(box(f'{name}_FrameH{i}', (WW + 0.12, T + 0.06, 0.06), m['trim'], offset=(0, 0, z)), root)
    for i, x in enumerate((-WW / 2, WW / 2)):
        parent(box(f'{name}_FrameV{i}', (0.06, T + 0.06, WH), m['trim'], offset=(x, 0, SILL + WH / 2)), root)
    parent(box(name + '_Cross', (0.04, 0.04, WH), m['trim'], offset=(0, 0, SILL + WH / 2)), root)
    if not broken:
        parent(plane('pane', WW, WH, m['glass'], offset=(0, 0, SILL + WH / 2), vertical=True), root)
    else:
        for i in range(6):
            sx = 0.12 + (i % 3) * 0.05
            parent(plane(f'{name}_Shard{i}', sx, 0.15, m['glass'], offset=(-WW / 2 + 0.1 + i * 0.2, 0, SILL + (0.08 if i % 2 else WH - 0.08)), vertical=True), root)
    return root, 'windows'


def door(name='ENV_Cabin_Door_A', broken=False):
    m = mats()
    root = empty(name)  # origin at the hinge (left edge, floor)
    if not broken:
        d = box('door', (DW, 0.06, DH - 0.02), m['door'], offset=(DW / 2, 0, DH / 2))
        parent(d, root)
        for i in range(2):
            parent(box(f'{name}_Panel{i}', (DW * 0.7, 0.02, DH * 0.36), m['trim'], offset=(DW / 2, -0.035, DH / 4 + i * DH / 2)), root)
        parent(box(name + '_Knob', (0.05, 0.05, 0.05), m['metal'], offset=(DW - 0.12, -0.05, DH / 2 - 0.05)), root)
    else:
        parent(box(name + '_Stub', (0.2, 0.06, DH * 0.55), m['door'], offset=(0.1, 0, DH * 0.28)), root)
    for i, x in enumerate((-0.04, DW + 0.04)):
        parent(box(f'{name}_Post{i}', (0.08, T + 0.06, DH), m['trim'], offset=(x, 0, DH / 2)), root)
    parent(box(name + '_Lintel', (DW, T, H - DH), m['ext'], offset=(DW / 2, 0, DH + (H - DH) / 2)), root)
    return root, 'doors'


def roof_segment(name='ENV_Cabin_Roof_A'):
    m = mats()
    root = empty(name)
    parent(box(name + '_Slab', (1.0, 4.9, 0.12), m['roof'], offset=(0.5, 0, 0.06)), root)
    return root, 'roof'


def main():
    out = out_dir()
    builders = [
        lambda: wall(), lambda: corner(), lambda: floor_tile(),
        lambda: window('ENV_Cabin_Window_A'), lambda: window('ENV_Cabin_Window_A_Broken', broken=True),
        lambda: door('ENV_Cabin_Door_A'), lambda: door('ENV_Cabin_Door_A_Broken', broken=True),
        lambda: roof_segment(),
    ]
    for b in builders:
        clear_scene()
        root, folder = b()
        export_glb([root], os.path.join(out, 'environment', root.name + '.glb'))
        save_blend(os.path.join(blend_dir(), 'architecture', folder, root.name + '.blend'))
        print('[EXMOB] built', root.name)


if __name__ == '__main__':
    main()
