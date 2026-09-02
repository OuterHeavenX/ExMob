"""Vehicle prototype: VEH_Sedan_A. Forward is -Y (front bumper at -Y). Origin at ground center."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from exmob_lib import (clear_scene, material, hexcol, box, cylinder, empty, parent, export_glb, save_blend, out_dir, blend_dir)  # noqa: E402


def sedan(name='VEH_Sedan_A', paint=0x3a3f4a):
    m_paint = material('MAT_CarPaint', hexcol(paint), roughness=0.35, metallic=0.6)
    m_glass = material('MAT_CarGlass', hexcol(0x0c1218), roughness=0.1, metallic=0.9)
    m_dark = material('MAT_Metal_Dark', hexcol(0x2a2c30), roughness=0.5, metallic=0.7)
    m_tire = material('MAT_Tire', hexcol(0x0d0d0f), roughness=0.95)
    m_head = material('MAT_Headlight', hexcol(0xfff2d0), roughness=0.3, emission=hexcol(0xfff2d0), emission_strength=3.0)
    m_tail = material('MAT_Taillight', hexcol(0xff2a1a), roughness=0.3, emission=hexcol(0xff2a1a), emission_strength=1.5)
    root = empty(name)
    P = lambda o: parent(o, root)  # noqa: E731
    P(box(name + '_Body', (1.9, 4.5, 0.55), m_paint, offset=(0, 0, 0.55)))
    P(box(name + '_Cabin', (1.7, 2.3, 0.5), m_paint, offset=(0, 0.2, 1.05)))
    P(box(name + '_Glass', (1.62, 2.1, 0.42), m_glass, offset=(0, 0.2, 1.08)))
    P(box(name + '_BumperF', (1.95, 0.5, 0.18), m_dark, offset=(0, -2.3, 0.32)))
    P(box(name + '_BumperR', (1.95, 0.5, 0.18), m_dark, offset=(0, 2.3, 0.32)))
    for i, (x, y) in enumerate(((-0.85, -1.5), (0.85, -1.5), (-0.85, 1.5), (0.85, 1.5))):
        P(cylinder(f'{name}_Wheel{i}', 0.34, 0.24, m_tire, offset=(x, y, 0.34), segments=16, axis='X'))
    for i, s in enumerate((-1, 1)):
        P(box(f'headlight{i}', (0.34, 0.06, 0.16), m_head, offset=(s * 0.65, -2.26, 0.65)))
        P(box(f'{name}_Tail{i}', (0.34, 0.06, 0.12), m_tail, offset=(s * 0.65, 2.26, 0.65)))
    P(empty('SOCK_Headlight_L', location=(-0.65, -2.2, 0.7)))
    P(empty('SOCK_Headlight_R', location=(0.65, -2.2, 0.7)))
    return root


def main():
    out = out_dir()
    clear_scene()
    root = sedan()
    export_glb([root], os.path.join(out, 'vehicles', root.name + '.glb'))
    save_blend(os.path.join(blend_dir(), 'vehicles', 'sedans', root.name + '.blend'))
    print('[EXMOB] built', root.name)


if __name__ == '__main__':
    main()
