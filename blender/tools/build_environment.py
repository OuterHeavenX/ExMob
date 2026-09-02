"""Environment + damage prototypes: trees, rocks, grass, fence, debris chunks, door fragments."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from exmob_lib import (clear_scene, material, hexcol, box, cylinder, cone, sphere, empty, parent, export_glb, save_blend, out_dir, blend_dir)  # noqa: E402


def tree(name='ENV_Tree_Pine_A'):
    bark = material('MAT_Bark', hexcol(0x3a2b1e), roughness=1.0)
    fol = material('MAT_Foliage_Pine', hexcol(0x17301c), roughness=1.0)
    root = empty(name)
    parent(cylinder(name + '_Trunk', 0.32, 6, bark, offset=(0, 0, 3), segments=7, radius2=0.18), root)
    parent(cone(name + '_Crown', 1.7, 5.5, fol, offset=(0, 0, 5.4), segments=8), root)
    parent(cone(name + '_Top', 1.2, 4.0, fol, offset=(0, 0, 8.0), segments=8), root)
    return root, 'trees'


def rock(name='ENV_Rock_A'):
    stone = material('MAT_Stone', hexcol(0x5c5a58), roughness=0.95)
    root = empty(name)
    s = sphere(name + '_Geo', 0.5, stone, offset=(0, 0, 0.3), subdivisions=1)
    s.scale = (1.0, 1.0, 0.7)
    parent(s, root)
    return root, 'rocks'


def grass(name='ENV_Grass_A'):
    fol = material('MAT_Grass', hexcol(0x2a4a24), roughness=1.0)
    root = empty(name)
    for i in range(3):
        parent(cone(f'{name}_Blade{i}', 0.12, 0.35, fol, offset=(i * 0.12 - 0.12, 0, 0.17), segments=4), root)
    return root, 'grass'


def fence(name='ENV_Fence_A'):
    wood = material('MAT_Wood_Weathered', hexcol(0x6a5a48), roughness=0.95)
    root = empty(name)
    for i, x in enumerate((0.0, 2.0)):
        parent(box(f'{name}_Post{i}', (0.12, 0.12, 1.1), wood, offset=(x, 0, 0.55)), root)
    for i, z in enumerate((0.4, 0.85)):
        parent(box(f'{name}_Rail{i}', (2.0, 0.06, 0.1), wood, offset=(1.0, 0, z)), root)
    return root, 'fences'


def debris_wood(name='ENV_Debris_Wood_A'):
    wood = material('MAT_Wood_Door', hexcol(0x8a6a48), roughness=0.75)
    root = empty(name)
    parent(box(name + '_Chunk', (0.22, 0.09, 0.05), wood, offset=(0, 0, 0.025)), root)
    return root, 'debris'


def debris_glass(name='ENV_Debris_Glass_A'):
    glass = material('MAT_Glass_Window', hexcol(0x9fc4ff), roughness=0.05, alpha=0.3)
    root = empty(name)
    parent(box(name + '_Shard', (0.1, 0.12, 0.01), glass, offset=(0, 0, 0.005)), root)
    return root, 'debris'


def door_fragment(name='ENV_Door_Fragment_A'):
    wood = material('MAT_Wood_Door', hexcol(0x8a6a48), roughness=0.75)
    trim = material('MAT_Wood_Trim', hexcol(0x3a2a1c), roughness=0.8)
    root = empty(name)
    parent(box(name + '_Plank', (0.35, 0.06, 0.6), wood, offset=(0, 0, 0.3)), root)
    parent(box(name + '_Panel', (0.25, 0.02, 0.3), trim, offset=(0, -0.035, 0.3)), root)
    return root, 'debris'


def main():
    out = out_dir()
    for b in (tree, rock, grass, fence, debris_wood, debris_glass, door_fragment):
        clear_scene()
        root, folder = b()
        export_glb([root], os.path.join(out, 'environment', root.name + '.glb'))
        save_blend(os.path.join(blend_dir(), 'environment' if folder != 'debris' else 'props', folder, root.name + '.blend'))
        print('[EXMOB] built', root.name)


if __name__ == '__main__':
    main()
