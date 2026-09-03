"""
Character prototypes with SKELETAL RIGS and animation clips:
CHR_ExMob, CHR_Goon01, CHR_Enforcer01, CHR_Soldier01, CHR_Hitman01.

Shared humanoid skeleton (bone names have no dots so Three.js keeps them verbatim):
  root (ground pivot) > hips > spine > head
                              > arm_L > hand_L,  arm_R > hand_R
                       hips  > leg_L, leg_R
The body is ONE skinned mesh (rigid weights per part, one material per part family) so a
character costs one primitive per material at runtime.

Clips are authored as keyframed poses and exported as NLA tracks named ANM_* :
  ANM_Idle, ANM_Walk, ANM_Run, ANM_Aim, ANM_Fire, ANM_Reload, ANM_Hit, ANM_Death, ANM_Kick,
  ANM_Melee.
Forward is -Y in Blender (+Z in glTF). The right hand bone (hand_R) is the weapon socket.
See docs/BLENDER_PIPELINE.md.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from exmob_lib import (clear_scene, material, hexcol, box, cylinder, link, export_glb, save_blend, out_dir, blend_dir)  # noqa: E402

LOOKS = {
    'CHR_ExMob':      dict(height=1.85, width=1.12, body=0x23262b, accent=0xb9ad93, skin=0xc9a78a, hat=None, coat=0.9, folder='exmob'),
    'CHR_Goon01':     dict(height=1.80, width=1.00, body=0x1c1c22, accent=0x7a1f2e, skin=0xc79b7a, hat=None, coat=0.55, folder='mob_goon'),
    'CHR_Enforcer01': dict(height=1.90, width=1.25, body=0x111114, accent=0x2a2a30, skin=0xb98c6c, hat=None, coat=0.7, folder='enforcer'),
    'CHR_Soldier01':  dict(height=1.82, width=1.05, body=0x3a3d44, accent=0x20232a, skin=0xc4a184, hat=None, coat=0.45, folder='future'),
    'CHR_Hitman01':   dict(height=1.85, width=0.88, body=0x0c0c10, accent=0x0c0c10, skin=0xd8c0aa, hat=0x0a0a0d, coat=0.85, folder='hitman'),
}
FPS = 24


def deg(*a):
    return tuple(math.radians(v) for v in a)


# ----------------------------------------------------------------------------- skeleton


def build_skeleton(name, s, W):
    leg_len = 0.85 * s
    arm_len = 0.62 * s
    arm_data = bpy.data.armatures.new(name + '_Armature')
    arm = bpy.data.objects.new(name, arm_data)
    link(arm)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm_data.edit_bones

    def bone(n, head, tail, parent=None):
        b = eb.new(n)
        b.head = Vector(head)
        b.tail = Vector(tail)
        b.roll = 0.0
        if parent:
            b.parent = eb[parent]
        return b

    hip_z = leg_len
    bone('root', (0, 0, 0), (0, 0, 0.2 * s))
    bone('hips', (0, 0, hip_z), (0, 0, hip_z + 0.15 * s), 'root')
    bone('spine', (0, 0, hip_z + 0.15 * s), (0, 0, hip_z + 0.66 * s), 'hips')
    bone('head', (0, 0, hip_z + 0.66 * s), (0, 0, hip_z + 0.96 * s), 'spine')
    for side, sx in (('L', -1), ('R', 1)):
        sh = (sx * 0.30 * s * W, 0, hip_z + 0.56 * s)
        wr = (sx * 0.30 * s * W, 0, hip_z + 0.56 * s - arm_len)
        bone(f'arm_{side}', sh, wr, 'spine')
        bone(f'hand_{side}', wr, (wr[0], wr[1], wr[2] - 0.1 * s), f'arm_{side}')
        hp = (sx * 0.11 * s * W, 0, hip_z)
        bone(f'leg_{side}', hp, (hp[0], 0, 0.04 * s), 'hips')
    bpy.ops.object.mode_set(mode='OBJECT')
    return arm, leg_len, arm_len


# ----------------------------------------------------------------------------- body mesh


def build_body(name, look, arm, leg_len, arm_len):
    H, W = look['height'], look['width']
    s = H / 1.8
    m_body = material(f'MAT_Cloth_{name}', hexcol(look['body']), roughness=0.9)
    m_acc = material(f'MAT_Accent_{name}', hexcol(look['accent']), roughness=0.85)
    m_skin = material(f'MAT_Skin_{name}', hexcol(look['skin']), roughness=0.65)
    m_trous = material('MAT_Trousers', hexcol(0x1a1a1e), roughness=0.9)
    m_shoe = material('MAT_Shoe', hexcol(0x0e0e10), roughness=0.45)
    m_hair = material('MAT_Hair', hexcol(0x2a2320), roughness=0.95)
    parts = []  # (object, bone)
    hip_z = leg_len

    def part(obj, bone):
        vg = obj.vertex_groups.new(name=bone)
        vg.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
        parts.append(obj)
        return obj

    for side, sx in (('L', -1), ('R', 1)):
        hx = sx * 0.11 * s * W
        part(box(f'{name}_Leg{side}', (0.16 * s * W, 0.18 * s, leg_len), m_trous, offset=(hx, 0, leg_len / 2)), f'leg_{side}')
        part(box(f'{name}_Shoe{side}', (0.17 * s * W, 0.28 * s, 0.08 * s), m_shoe, offset=(hx, -0.05 * s, 0.04 * s)), f'leg_{side}')
    part(box(f'{name}_Chest', (0.46 * s * W, 0.28 * s, 0.62 * s), m_body, offset=(0, 0, hip_z + 0.31 * s)), 'spine')
    part(box(f'{name}_Shoulders', (0.56 * s * W, 0.30 * s, 0.12 * s), m_body, offset=(0, 0, hip_z + 0.58 * s)), 'spine')
    part(box(f'{name}_Coat', (0.50 * s * W, 0.32 * s, look['coat'] * s), m_body, offset=(0, 0, hip_z - look['coat'] * s / 2 + 0.05 * s)), 'hips')
    part(box(f'{name}_Front', (0.20 * s * W, 0.05 * s, 0.50 * s), m_acc, offset=(0, -0.14 * s, hip_z + 0.30 * s)), 'spine')
    head_z = hip_z + 0.66 * s
    part(box(f'{name}_Skull', (0.22 * s, 0.24 * s, 0.26 * s), m_skin, offset=(0, 0, head_z + 0.14 * s)), 'head')
    part(box(f'{name}_Hair', (0.23 * s, 0.25 * s, 0.09 * s), m_hair, offset=(0, 0.01 * s, head_z + 0.26 * s)), 'head')
    part(box(f'{name}_Nose', (0.04 * s, 0.04 * s, 0.05 * s), m_skin, offset=(0, -0.13 * s, head_z + 0.12 * s)), 'head')
    if look['hat']:
        m_hat = material('MAT_Hat', hexcol(look['hat']), roughness=0.6)
        part(cylinder(f'{name}_HatBrim', 0.20 * s, 0.02 * s, m_hat, offset=(0, 0, head_z + 0.28 * s), segments=14), 'head')
        part(cylinder(f'{name}_HatCrown', 0.125 * s, 0.13 * s, m_hat, offset=(0, 0, head_z + 0.35 * s), segments=14), 'head')
    for side, sx in (('L', -1), ('R', 1)):
        shx = sx * 0.30 * s * W
        sh_z = hip_z + 0.56 * s
        part(box(f'{name}_Arm{side}', (0.13 * s, 0.14 * s, arm_len), m_body, offset=(shx, 0, sh_z - arm_len / 2)), f'arm_{side}')
        part(box(f'{name}_Hand{side}', (0.10 * s, 0.10 * s, 0.10 * s), m_skin, offset=(shx, 0, sh_z - arm_len - 0.03 * s)), f'hand_{side}')

    # join into one skinned mesh
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active
    body.name = name + '_Body'
    body.data.name = name + '_Body_Mesh'
    mod = body.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    body.parent = arm
    return body


# ----------------------------------------------------------------------------- animation


class Animator:
    """Keyframes poses on the armature and stashes each clip as an NLA track."""

    def __init__(self, arm):
        self.arm = arm
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.select_all(action='DESELECT')
        arm.select_set(True)
        bpy.ops.object.mode_set(mode='POSE')
        for pb in arm.pose.bones:
            pb.rotation_mode = 'XYZ'
        arm.animation_data_create()
        # discover axis signs empirically so forward always means -Y
        self.arm_fwd = self._sign_for('arm_R', 'hand_R', axis=0, want_negative_y=True)
        self.leg_fwd = self._sign_for('leg_R', 'leg_R', axis=0, want_negative_y=True, use_tail=True)
        self.fall_back = -self._sign_for('root', 'head', axis=0, want_negative_y=True, use_tail=True)

    def _sign_for(self, bone, probe, axis=0, want_negative_y=True, use_tail=True):
        pb = self.arm.pose.bones[bone]
        pr = self.arm.pose.bones[probe]
        rot = [0, 0, 0]
        rot[axis] = math.radians(60)
        pb.rotation_euler = rot
        bpy.context.view_layer.update()
        y = (pr.tail if use_tail else pr.head).y
        pb.rotation_euler = (0, 0, 0)
        bpy.context.view_layer.update()
        return 1 if (y < 0) == want_negative_y else -1

    def _reset(self):
        for pb in self.arm.pose.bones:
            pb.rotation_euler = (0, 0, 0)
            pb.location = (0, 0, 0)

    def clip(self, name, keys, length):
        """keys: list of (frame, {bone: (rx, ry, rz) degrees}, {bone: (x,y,z) location}) ."""
        arm = self.arm
        act = bpy.data.actions.new(name)
        act.use_fake_user = True
        arm.animation_data.action = act
        try:
            if hasattr(act, 'slots') and len(act.slots) == 0:
                slot = act.slots.new(id_type='OBJECT', name=name)
                arm.animation_data.action_slot = slot
        except Exception:
            pass
        for frame, rots, locs in keys:
            self._reset()
            for b, r in rots.items():
                arm.pose.bones[b].rotation_euler = deg(*r)
            for b, l in (locs or {}).items():
                arm.pose.bones[b].location = l
            for pb in arm.pose.bones:
                pb.keyframe_insert('rotation_euler', frame=frame)
                pb.keyframe_insert('location', frame=frame)
        arm.animation_data.action = None
        track = arm.animation_data.nla_tracks.new()
        track.name = name
        strip = track.strips.new(name, 1, act)
        try:
            if hasattr(act, 'slots') and len(act.slots):
                strip.action_slot = act.slots[0]
        except Exception:
            pass
        strip.frame_start = 1
        strip.frame_end = length
        strip.action_frame_start = 1
        strip.action_frame_end = length
        self._reset()
        return act

    def finish(self):
        bpy.ops.object.mode_set(mode='OBJECT')


def author_clips(arm):
    A = Animator(arm)
    af, lf, fb = A.arm_fwd, A.leg_fwd, A.fall_back
    AIM_R = (af * 82, 0, 0)          # right arm straight forward, slightly low
    AIM_L = (af * 70, 0, 0)          # left hand supports
    aim = {'arm_R': AIM_R, 'arm_L': AIM_L, 'hand_R': (0, 0, 0)}

    def pose(extra=None):
        p = dict(aim)
        if extra:
            p.update(extra)
        return p

    # Idle: breathing sway (48 frames loop)
    A.clip('ANM_Idle', [
        (1, pose({'spine': (2, 0, 0), 'head': (-1, 0, 0)}), None),
        (24, pose({'spine': (-1.5, 0, 1.5), 'head': (1.5, 0, -1), 'arm_R': (af * 80, 0, 0)}), None),
        (48, pose({'spine': (2, 0, 0), 'head': (-1, 0, 0)}), None),
    ], 48)
    # Aim: static
    A.clip('ANM_Aim', [(1, pose(), None), (2, pose(), None)], 2)
    # Walk: 24 frames loop, legs +-28, slight bob and counter-twist
    walk = []
    for i, f in enumerate((1, 7, 13, 19, 25)):
        ph = i * math.pi / 2
        sw = math.sin(ph) * 28
        bob = abs(math.sin(ph)) * 0.02
        walk.append((f, pose({'leg_L': (lf * sw, 0, 0), 'leg_R': (-lf * sw, 0, 0), 'spine': (3, 0, -sw * 0.08), 'arm_L': (af * 70 + sw * 0.15, 0, 0)}), {'hips': (0, 0, bob)}))
    A.clip('ANM_Walk', walk, 24)
    # Run: 16 frames loop, legs +-45, more bob, forward lean
    run = []
    for i, f in enumerate((1, 5, 9, 13, 17)):
        ph = i * math.pi / 2
        sw = math.sin(ph) * 45
        bob = abs(math.sin(ph)) * 0.04
        run.append((f, pose({'leg_L': (lf * sw, 0, 0), 'leg_R': (-lf * sw, 0, 0), 'spine': (9, 0, -sw * 0.1), 'head': (-4, 0, 0)}), {'hips': (0, 0, bob)}))
    A.clip('ANM_Run', run, 16)
    # Fire: recoil (arms only matter; authored at 2x amplitude because it blends with locomotion)
    A.clip('ANM_Fire', [
        (1, pose(), None),
        (2, pose({'arm_R': (af * 82 + 34, 0, 0), 'arm_L': (af * 70 + 22, 0, 0), 'spine': (-5, 0, 0)}), None),
        (7, pose(), None),
    ], 7)
    # Reload: left hand drops to the hip and returns
    A.clip('ANM_Reload', [
        (1, pose(), None),
        (8, pose({'arm_L': (af * 10, 0, 25), 'arm_R': (af * 60, 0, 0), 'head': (12, 0, 0)}), None),
        (18, pose({'arm_L': (af * 40, 0, 10), 'arm_R': (af * 62, 0, 0), 'head': (10, 0, 0)}), None),
        (30, pose(), None),
    ], 30)
    # Hit: flinch
    A.clip('ANM_Hit', [
        (1, pose(), None),
        (3, pose({'spine': (-16, 0, 6), 'head': (-20, 0, 0), 'arm_R': (af * 65, 0, 0)}), None),
        (10, pose(), None),
    ], 10)
    # Death: fall backward from the feet, arms drop, hold
    A.clip('ANM_Death', [
        (1, pose(), None),
        (6, pose({'root': (fb * 25, 0, 0), 'spine': (-10, 0, 0), 'arm_R': (af * 40, 0, 0), 'arm_L': (af * 30, 0, 0)}), None),
        (16, {'root': (fb * 84, 0, 0), 'spine': (-6, 0, 0), 'head': (-10, 0, 0), 'arm_R': (af * -20, 0, 30), 'arm_L': (af * -10, 0, -30), 'leg_L': (lf * 8, 0, 0), 'leg_R': (-lf * 5, 0, 0)}, {'root': (0, 0, 0.05)}),
        (26, {'root': (fb * 86, 0, 0), 'spine': (-6, 0, 0), 'head': (-10, 0, 0), 'arm_R': (af * -20, 0, 35), 'arm_L': (af * -10, 0, -35), 'leg_L': (lf * 8, 0, 0), 'leg_R': (-lf * 5, 0, 0)}, {'root': (0, 0, 0.05)}),
    ], 26)
    # Melee: weapon-butt swing across the body, hips and shoulders drive it
    A.clip('ANM_Melee', [
        (1, pose(), None),
        (3, pose({'arm_R': (af * 38, 0, -55), 'spine': (2, 0, -16), 'head': (0, 0, -9), 'arm_L': (af * 62, 0, -8)}), None),
        (7, pose({'arm_R': (af * 100, 0, 62), 'spine': (-2, 0, 21), 'head': (0, 0, 11), 'arm_L': (af * 44, 0, 16)}), None),
        (11, pose({'arm_R': (af * 88, 0, 30), 'spine': (0, 0, 8)}), None),
        (18, pose(), None),
    ], 18)
    # Kick (door breach): right leg drives forward
    A.clip('ANM_Kick', [
        (1, pose(), None),
        (4, pose({'leg_R': (-lf * 30, 0, 0), 'spine': (-6, 0, 0)}), None),
        (7, pose({'leg_R': (lf * 70, 0, 0), 'spine': (14, 0, 0), 'leg_L': (-lf * 10, 0, 0)}), None),
        (12, pose(), None),
    ], 12)
    A.finish()


# ----------------------------------------------------------------------------- export


def export_character(arm, body, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    body.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 48
    bpy.context.scene.render.fps = FPS
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_materials='EXPORT',
        export_animations=True,
        export_animation_mode='NLA_TRACKS',
        export_nla_strips=True,
        export_force_sampling=True,
        export_frame_range=False,
        export_optimize_animation_size=False,
        export_skins=True,
        export_def_bones=False,
        export_lights=False,
        export_cameras=False,
    )


def build_character(name, look):
    s = look['height'] / 1.8
    arm, leg_len, arm_len = build_skeleton(name, s, look['width'])
    body = build_body(name, look, arm, leg_len, arm_len)
    author_clips(arm)
    return arm, body


def main():
    out = out_dir()
    for name, look in LOOKS.items():
        clear_scene()
        arm, body = build_character(name, look)
        export_character(arm, body, os.path.join(out, 'characters', name + '.glb'))
        save_blend(os.path.join(blend_dir(), 'characters', look['folder'], name + '.blend'))
        print('[EXMOB] built', name, 'clips:', len(arm.animation_data.nla_tracks))


if __name__ == '__main__':
    main()
