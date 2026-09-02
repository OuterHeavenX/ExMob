"""
Furniture and prop prototypes used by src/data/properties/cabin.js. Origins at base center.
Lamps expose a child named `shade` so the runtime can swap its material when the lamp breaks.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from exmob_lib import (clear_scene, material, hexcol, box, cylinder, empty, parent, export_glb, save_blend, out_dir, blend_dir)  # noqa: E402


def M():
    return dict(
        wood=material('MAT_Wood_Cabin', hexcol(0xd9b48c), roughness=0.8),
        woodDark=material('MAT_Wood_Dark', hexcol(0x4f371f), roughness=0.8),
        trim=material('MAT_Wood_Trim', hexcol(0x3a2a1c), roughness=0.8),
        fabric=material('MAT_Fabric_Worn', hexcol(0x5a4a3a), roughness=0.95),
        fabricDark=material('MAT_Fabric_Dark', hexcol(0x3b3a44), roughness=0.95),
        metal=material('MAT_Metal_Appliance', hexcol(0x9a9da0), roughness=0.45, metallic=0.8),
        metalDark=material('MAT_Metal_Dark', hexcol(0x2a2c30), roughness=0.5, metallic=0.7),
        plastic=material('MAT_Plastic_Black', hexcol(0x1a1a1c), roughness=0.6),
        paper=material('MAT_Paper', hexcol(0xe8dcc0), roughness=0.9),
        stone=material('MAT_Stone', hexcol(0x5c5a58), roughness=0.95),
        shade=material('MAT_LampShade', hexcol(0xffe0b0), roughness=0.8, emission=hexcol(0xff9a40), emission_strength=1.6),
        porcelain=material('MAT_Porcelain', hexcol(0xe6e6e0), roughness=0.3),
        glassDark=material('MAT_Glass_Dark', hexcol(0x0c1218), roughness=0.1, metallic=0.9),
        screen=material('MAT_PhoneScreen', hexcol(0x102030), roughness=0.3, emission=hexcol(0x4090ff), emission_strength=0.0),
    )


def legs(root, name, mat, dx, dy, h, t=0.05):
    for i, (x, y) in enumerate(((-dx, -dy), (dx, -dy), (-dx, dy), (dx, dy))):
        parent(box(f'{name}_Leg{i}', (t, t, h), mat, offset=(x, y, h / 2)), root)


def build(name):
    m = M()
    root = empty(name)
    P = lambda o: parent(o, root)  # noqa: E731
    if name == 'PRP_Couch_A':
        P(box(name + '_Seat', (2.2, 0.9, 0.4), m['fabric'], offset=(0, 0, 0.25)))
        P(box(name + '_Back', (2.2, 0.25, 0.45), m['fabric'], offset=(0, 0.32, 0.62)))
        P(box(name + '_ArmL', (0.22, 0.9, 0.3), m['fabric'], offset=(-0.99, 0, 0.6)))
        P(box(name + '_ArmR', (0.22, 0.9, 0.3), m['fabric'], offset=(0.99, 0, 0.6)))
        P(box(name + '_CushionL', (0.95, 0.55, 0.12), m['fabricDark'], offset=(-0.5, -0.1, 0.5)))
        P(box(name + '_CushionR', (0.95, 0.55, 0.12), m['fabricDark'], offset=(0.5, -0.1, 0.5)))
    elif name == 'PRP_Table_Coffee_A':
        P(box(name + '_Top', (1.2, 0.6, 0.05), m['wood'], offset=(0, 0, 0.43)))
        legs(root, name, m['trim'], 0.55, 0.25, 0.42)
    elif name == 'PRP_Table_A':
        P(box(name + '_Top', (1.4, 0.9, 0.06), m['wood'], offset=(0, 0, 0.73)))
        legs(root, name, m['trim'], 0.62, 0.38, 0.72, 0.07)
    elif name == 'PRP_Chair_A':
        P(box(name + '_Seat', (0.45, 0.45, 0.04), m['wood'], offset=(0, 0, 0.45)))
        P(box(name + '_Back', (0.45, 0.04, 0.45), m['wood'], offset=(0, 0.2, 0.7)))
        legs(root, name, m['trim'], 0.19, 0.19, 0.45, 0.04)
    elif name == 'PRP_Chair_Arm_A':
        P(box(name + '_Seat', (0.8, 0.8, 0.4), m['fabricDark'], offset=(0, 0, 0.22)))
        P(box(name + '_Back', (0.8, 0.2, 0.5), m['fabricDark'], offset=(0, 0.3, 0.65)))
        P(box(name + '_ArmL', (0.18, 0.8, 0.25), m['fabricDark'], offset=(-0.31, 0, 0.55)))
        P(box(name + '_ArmR', (0.18, 0.8, 0.25), m['fabricDark'], offset=(0.31, 0, 0.55)))
    elif name == 'PRP_Lamp_Floor_A':
        P(cylinder(name + '_Base', 0.17, 0.03, m['metalDark'], offset=(0, 0, 0.015), segments=14))
        P(cylinder(name + '_Pole', 0.015, 1.5, m['metalDark'], offset=(0, 0, 0.77), segments=8))
        P(cylinder('shade', 0.14, 0.32, m['shade'], offset=(0, 0, 1.55), segments=16, radius2=0.22))
    elif name == 'PRP_Lamp_Ceiling_A':
        P(cylinder(name + '_Cord', 0.01, 0.4, m['metalDark'], offset=(0, 0, 2.6), segments=6))
        P(cylinder('shade', 0.10, 0.2, m['shade'], offset=(0, 0, 2.4), segments=16, radius2=0.22))
    elif name == 'PRP_Shelf_A':
        P(box(name + '_Body', (1.2, 0.35, 1.8), m['trim'], offset=(0, 0, 0.9)))
        for i in range(4):
            P(box(f'{name}_Shelf{i}', (1.1, 0.3, 0.03), m['wood'], offset=(0, -0.01, 0.3 + i * 0.42)))
        for i in range(9):
            mat = (m['fabricDark'], m['fabric'], m['paper'])[i % 3]
            P(box(f'{name}_Book{i}', (0.06, 0.2, 0.28), mat, offset=(-0.45 + i * 0.11, -0.03, 0.48 + (i // 5) * 0.42)))
    elif name == 'PRP_TV_A':
        P(box(name + '_Stand', (1.0, 0.4, 0.5), m['trim'], offset=(0, 0, 0.25)))
        P(box(name + '_Body', (0.8, 0.06, 0.5), m['plastic'], offset=(0, -0.05, 0.78)))
        P(box(name + '_Screen', (0.72, 0.01, 0.42), m['glassDark'], offset=(0, -0.09, 0.78)))
    elif name == 'PRP_Counter_A':
        P(box(name + '_Body', (3.0, 0.66, 0.86), m['trim'], offset=(0, 0, 0.43)))
        P(box(name + '_Top', (3.05, 0.7, 0.06), m['stone'], offset=(0, 0, 0.89)))
        for i in range(4):
            P(box(f'{name}_Handle{i}', (0.03, 0.14, 0.03), m['metal'], offset=(-1.1 + i * 0.75, -0.34, 0.6)))
    elif name == 'PRP_Fridge_A':
        P(box(name + '_Body', (0.8, 0.8, 1.8), m['metal'], offset=(0, 0, 0.9)))
        P(box(name + '_HandleTop', (0.03, 0.03, 0.5), m['metalDark'], offset=(0.3, -0.41, 1.2)))
        P(box(name + '_HandleBot', (0.03, 0.03, 0.3), m['metalDark'], offset=(0.3, -0.41, 0.5)))
    elif name == 'PRP_Cabinet_A':
        P(box(name + '_Body', (0.5, 1.0, 1.6), m['trim'], offset=(0, 0, 0.8)))
        P(box(name + '_HandleL', (0.03, 0.04, 0.8), m['metal'], offset=(0.26, 0.2, 0.9)))
        P(box(name + '_HandleR', (0.03, 0.04, 0.8), m['metal'], offset=(0.26, -0.2, 0.9)))
    elif name == 'PRP_Bed_A':
        P(box(name + '_Frame', (1.6, 2.0, 0.3), m['trim'], offset=(0, 0, 0.15)))
        P(box(name + '_Mattress', (1.5, 1.9, 0.25), m['fabric'], offset=(0, 0, 0.42)))
        P(box(name + '_Blanket', (1.5, 0.8, 0.12), m['fabricDark'], offset=(0, -0.5, 0.6)))
        P(box(name + '_Pillow', (0.6, 0.35, 0.12), m['paper'], offset=(0, 0.75, 0.6)))
        P(box(name + '_Headboard', (1.6, 0.08, 0.8), m['trim'], offset=(0, 1.0, 0.5)))
    elif name == 'PRP_Nightstand_A':
        P(box(name + '_Body', (0.5, 0.5, 0.6), m['trim'], offset=(0, 0, 0.3)))
        P(cylinder(name + '_Stem', 0.01, 0.12, m['metalDark'], offset=(0, 0, 0.62), segments=6))
        P(cylinder('shade', 0.08, 0.18, m['shade'], offset=(0, 0, 0.72), segments=12, radius2=0.1))
    elif name == 'PRP_Suitcase_A':
        P(box(name + '_Body', (0.6, 0.22, 0.35), m['fabricDark'], offset=(0, 0, 0.18)))
        P(box(name + '_Handle', (0.15, 0.03, 0.04), m['metal'], offset=(0, 0, 0.37)))
    elif name == 'PRP_Toilet_A':
        P(box(name + '_Bowl', (0.45, 0.5, 0.4), m['porcelain'], offset=(0, -0.05, 0.2)))
        P(box(name + '_Tank', (0.45, 0.2, 0.4), m['porcelain'], offset=(0, 0.25, 0.55)))
    elif name == 'PRP_Sink_A':
        P(box(name + '_Pedestal', (0.5, 0.5, 0.8), m['porcelain'], offset=(0, 0, 0.4)))
        P(box(name + '_Basin', (0.55, 0.55, 0.06), m['porcelain'], offset=(0, 0, 0.83)))
        P(cylinder(name + '_Tap', 0.015, 0.2, m['metal'], offset=(0, 0.15, 0.95), segments=8))
    elif name == 'PRP_Tub_A':
        P(box(name + '_Body', (1.7, 0.8, 0.55), m['porcelain'], offset=(0, 0, 0.27)))
        P(box(name + '_Water', (1.5, 0.6, 0.05), m['glassDark'], offset=(0, 0, 0.5)))
    elif name == 'PRP_Paper_A':
        P(box(name + '_Sheet', (0.2, 0.28, 0.005), m['paper'], offset=(0, 0, 0.0025)))
    elif name == 'PRP_Can_A':
        P(cylinder(name + '_Body', 0.08, 0.16, m['metal'], offset=(0, 0, 0.08), segments=14))
    elif name == 'PRP_Phone_A':
        P(box(name + '_Body', (0.06, 0.12, 0.012), m['plastic'], offset=(0, 0, 0.006)))
        P(box('screen', (0.05, 0.1, 0.002), m['screen'], offset=(0, 0, 0.013)))
    elif name == 'PRP_Photo_A':
        P(box(name + '_Frame', (0.12, 0.01, 0.15), m['trim'], offset=(0, 0, 0.08)))
        P(box(name + '_Print', (0.1, 0.002, 0.12), m['paper'], offset=(0, -0.006, 0.08)))
    else:
        raise ValueError(name)
    return root


PROPS = {
    'PRP_Couch_A': 'living_room', 'PRP_Table_Coffee_A': 'living_room', 'PRP_Chair_Arm_A': 'living_room', 'PRP_TV_A': 'living_room',
    'PRP_Shelf_A': 'living_room', 'PRP_Lamp_Floor_A': 'living_room', 'PRP_Lamp_Ceiling_A': 'living_room',
    'PRP_Table_A': 'kitchen', 'PRP_Chair_A': 'kitchen', 'PRP_Counter_A': 'kitchen', 'PRP_Fridge_A': 'kitchen', 'PRP_Cabinet_A': 'kitchen',
    'PRP_Bed_A': 'bedroom', 'PRP_Nightstand_A': 'bedroom', 'PRP_Suitcase_A': 'bedroom',
    'PRP_Toilet_A': 'bathroom', 'PRP_Sink_A': 'bathroom', 'PRP_Tub_A': 'bathroom',
    'PRP_Paper_A': 'office', 'PRP_Can_A': 'office', 'PRP_Phone_A': 'office', 'PRP_Photo_A': 'office',
}


def main():
    out = out_dir()
    for name, folder in PROPS.items():
        clear_scene()
        root = build(name)
        export_glb([root], os.path.join(out, 'props', name + '.glb'))
        save_blend(os.path.join(blend_dir(), 'furniture' if folder != 'office' else 'props', folder if folder != 'office' else 'decorations', name + '.blend'))
        print('[EXMOB] built', name)


if __name__ == '__main__':
    main()
