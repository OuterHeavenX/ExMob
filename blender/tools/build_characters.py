"""
Character prototypes: CHR_ExMob, CHR_Goon01, CHR_Enforcer01, CHR_Soldier01, CHR_Hitman01.

Rigid-part humanoids (ADR-010). Each part is a separate object whose origin is its joint pivot so
the runtime CharacterRig can swing it: Torso (hip), Head (neck), ArmL/ArmR (shoulder),
LegL/LegR (hip), SOCK_Hand_R (weapon socket, child of ArmR). Forward is -Y.
Skeletal rigs and ANM_* clips replace these in the production pass (docs/BLENDER_PIPELINE.md).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from exmob_lib import (clear_scene, material, hexcol, box, cylinder, empty, parent, export_glb, save_blend, out_dir, blend_dir)  # noqa: E402

LOOKS = {
    'CHR_ExMob':      dict(height=1.85, width=1.12, body=0x23262b, accent=0xb9ad93, skin=0xc9a78a, hat=None, coat=0.9, folder='exmob'),
    'CHR_Goon01':     dict(height=1.80, width=1.00, body=0x1c1c22, accent=0x7a1f2e, skin=0xc79b7a, hat=None, coat=0.55, folder='mob_goon'),
    'CHR_Enforcer01': dict(height=1.90, width=1.25, body=0x111114, accent=0x2a2a30, skin=0xb98c6c, hat=None, coat=0.7, folder='enforcer'),
    'CHR_Soldier01':  dict(height=1.82, width=1.05, body=0x3a3d44, accent=0x20232a, skin=0xc4a184, hat=None, coat=0.45, folder='future'),
    'CHR_Hitman01':   dict(height=1.85, width=0.88, body=0x0c0c10, accent=0x0c0c10, skin=0xd8c0aa, hat=0x0a0a0d, coat=0.85, folder='hitman'),
}


def build_character(name, look):
    H = look['height']
    W = look['width']
    s = H / 1.8
    m_body = material(f'MAT_Cloth_{name}', hexcol(look['body']), roughness=0.9)
    m_acc = material(f'MAT_Accent_{name}', hexcol(look['accent']), roughness=0.85)
    m_skin = material(f'MAT_Skin_{name}', hexcol(look['skin']), roughness=0.65)
    m_trous = material('MAT_Trousers', hexcol(0x1a1a1e), roughness=0.9)
    m_shoe = material('MAT_Shoe', hexcol(0x0e0e10), roughness=0.45)
    m_hair = material('MAT_Hair', hexcol(0x2a2320), roughness=0.95)

    root = empty(f'{name}_Body')
    leg_len = 0.85 * s

    # legs: pivot at the hip
    for side, sx in (('L', -1), ('R', 1)):
        piv = empty(f'Leg{side}', location=(sx * 0.11 * s * W, 0, leg_len))
        parent(piv, root)
        leg = box(f'{name}_Leg{side}_Geo', (0.16 * s * W, 0.18 * s, leg_len), m_trous, offset=(0, 0, -leg_len / 2))
        parent(leg, piv)
        shoe = box(f'{name}_Shoe{side}_Geo', (0.17 * s * W, 0.28 * s, 0.08 * s), m_shoe, offset=(0, -0.05 * s, -leg_len + 0.04 * s))
        parent(shoe, piv)

    # torso (pivot at hip)
    torso = empty('Torso', location=(0, 0, leg_len))
    parent(torso, root)
    chest = box(f'{name}_Chest_Geo', (0.46 * s * W, 0.28 * s, 0.62 * s), m_body, offset=(0, 0, 0.31 * s))
    parent(chest, torso)
    shoulders = box(f'{name}_Shoulders_Geo', (0.56 * s * W, 0.30 * s, 0.12 * s), m_body, offset=(0, 0, 0.58 * s))
    parent(shoulders, torso)
    coat = box(f'{name}_Coat_Geo', (0.50 * s * W, 0.32 * s, look['coat'] * s), m_body, offset=(0, 0, -look['coat'] * s / 2 + 0.05 * s))
    parent(coat, torso)
    sweater = box(f'{name}_Front_Geo', (0.20 * s * W, 0.05 * s, 0.50 * s), m_acc, offset=(0, -0.14 * s, 0.30 * s))
    parent(sweater, torso)

    # head (pivot at neck)
    head = empty('Head', location=(0, 0, 0.66 * s))
    parent(head, torso)
    skull = box(f'{name}_Skull_Geo', (0.22 * s, 0.24 * s, 0.26 * s), m_skin, offset=(0, 0, 0.14 * s))
    parent(skull, head)
    hair = box(f'{name}_Hair_Geo', (0.23 * s, 0.25 * s, 0.09 * s), m_hair, offset=(0, 0.01 * s, 0.26 * s))
    parent(hair, head)
    nose = box(f'{name}_Nose_Geo', (0.04 * s, 0.04 * s, 0.05 * s), m_skin, offset=(0, -0.13 * s, 0.12 * s))
    parent(nose, head)
    if look['hat']:
        m_hat = material('MAT_Hat', hexcol(look['hat']), roughness=0.6)
        brim = cylinder(f'{name}_HatBrim_Geo', 0.20 * s, 0.02 * s, m_hat, offset=(0, 0, 0.28 * s), segments=14)
        parent(brim, head)
        crown = cylinder(f'{name}_HatCrown_Geo', 0.125 * s, 0.13 * s, m_hat, offset=(0, 0, 0.35 * s), segments=14)
        parent(crown, head)

    # arms (pivot at shoulder)
    arm_len = 0.62 * s
    for side, sx in (('L', -1), ('R', 1)):
        piv = empty(f'Arm{side}', location=(sx * 0.30 * s * W, 0, 0.56 * s))
        parent(piv, torso)
        upper = box(f'{name}_Arm{side}_Geo', (0.13 * s, 0.14 * s, arm_len), m_body, offset=(0, 0, -arm_len / 2))
        parent(upper, piv)
        hand = box(f'{name}_Hand{side}_Geo', (0.10 * s, 0.10 * s, 0.10 * s), m_skin, offset=(0, 0, -arm_len - 0.03 * s))
        parent(hand, piv)
        if side == 'R':
            sock = empty('SOCK_Hand_R', location=(0, -0.03 * s, -arm_len - 0.02 * s))
            parent(sock, piv)
    return root


def main():
    out = out_dir()
    for name, look in LOOKS.items():
        clear_scene()
        root = build_character(name, look)
        export_glb([root], os.path.join(out, 'characters', name + '.glb'))
        save_blend(os.path.join(blend_dir(), 'characters', look['folder'], name + '.blend'))
        print('[EXMOB] built', name)


if __name__ == '__main__':
    main()
