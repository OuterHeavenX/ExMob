"""Weapon prototypes: WPN_Pistol01, WPN_Revolver01, WPN_Shotgun01, WPN_SMG01. Barrel points -Y."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from exmob_lib import (clear_scene, material, hexcol, box, cylinder, empty, parent, export_glb, save_blend, out_dir, blend_dir)  # noqa: E402


def mats():
    return dict(
        metal=material('MAT_Gunmetal', hexcol(0x2a2c30), roughness=0.5, metallic=0.7),
        steel=material('MAT_Steel', hexcol(0x9a9da0), roughness=0.45, metallic=0.8),
        grip=material('MAT_Grip', hexcol(0x1a1a1c), roughness=0.6),
        wood=material('MAT_GunStock', hexcol(0x4f371f), roughness=0.7),
    )


def pistol(name='WPN_Pistol01'):
    M = mats()
    root = empty(name)
    parent(box(name + '_Slide', (0.03, 0.17, 0.05), M['metal'], offset=(0, -0.07, 0.02)), root)
    parent(box(name + '_Grip', (0.03, 0.04, 0.09), M['grip'], offset=(0, 0.03, -0.04)), root)
    parent(box(name + '_Trigger', (0.01, 0.02, 0.02), M['steel'], offset=(0, -0.02, -0.02)), root)
    parent(empty('SOCK_Muzzle', location=(0, -0.155, 0.02)), root)
    return root, 'pistols'


def revolver(name='WPN_Revolver01'):
    M = mats()
    root = empty(name)
    parent(cylinder(name + '_Barrel', 0.012, 0.16, M['steel'], offset=(0, -0.1, 0.02), axis='Y', segments=10), root)
    parent(cylinder(name + '_Cylinder', 0.025, 0.06, M['metal'], offset=(0, -0.02, 0.01), axis='Y', segments=10), root)
    parent(box(name + '_Frame', (0.03, 0.10, 0.04), M['steel'], offset=(0, -0.01, 0.02)), root)
    parent(box(name + '_Grip', (0.03, 0.04, 0.09), M['wood'], offset=(0, 0.03, -0.04)), root)
    parent(empty('SOCK_Muzzle', location=(0, -0.18, 0.02)), root)
    return root, 'revolvers'


def shotgun(name='WPN_Shotgun01'):
    M = mats()
    root = empty(name)
    parent(cylinder(name + '_Barrel', 0.014, 0.62, M['metal'], offset=(0, -0.30, 0.02), axis='Y', segments=10), root)
    parent(cylinder(name + '_Tube', 0.012, 0.5, M['metal'], offset=(0, -0.25, -0.01), axis='Y', segments=10), root)
    parent(box(name + '_Pump', (0.04, 0.22, 0.05), M['wood'], offset=(0, -0.18, 0.0)), root)
    parent(box(name + '_Receiver', (0.045, 0.16, 0.06), M['steel'], offset=(0, 0.02, 0.0)), root)
    parent(box(name + '_Stock', (0.045, 0.2, 0.08), M['wood'], offset=(0, 0.2, -0.03)), root)
    parent(empty('SOCK_Muzzle', location=(0, -0.61, 0.02)), root)
    return root, 'shotguns'


def smg(name='WPN_SMG01'):
    M = mats()
    root = empty(name)
    parent(box(name + '_Receiver', (0.05, 0.36, 0.07), M['metal'], offset=(0, -0.12, 0.01)), root)
    parent(box(name + '_Mag', (0.03, 0.04, 0.14), M['metal'], offset=(0, -0.06, -0.08)), root)
    parent(box(name + '_Grip', (0.03, 0.04, 0.08), M['grip'], offset=(0, 0.08, -0.04)), root)
    parent(cylinder(name + '_Barrel', 0.012, 0.16, M['steel'], offset=(0, -0.36, 0.02), axis='Y', segments=10), root)
    parent(box(name + '_Stock', (0.02, 0.16, 0.02), M['steel'], offset=(0, 0.14, 0.02)), root)
    parent(empty('SOCK_Muzzle', location=(0, -0.44, 0.02)), root)
    return root, 'smgs'


def main():
    out = out_dir()
    for fn in (pistol, revolver, shotgun, smg):
        clear_scene()
        root, family = fn()
        export_glb([root], os.path.join(out, 'weapons', root.name + '.glb'))
        save_blend(os.path.join(blend_dir(), 'weapons', family, root.name + '.blend'))
        print('[EXMOB] built', root.name)


if __name__ == '__main__':
    main()
