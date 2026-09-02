"""
EXMOB Blender asset library helpers.

Shared by the build_*.py generators. Runs headless (`blender -b -P build_all.py`).
Conventions (docs/BLENDER_PIPELINE.md): 1 unit = 1 m, forward = -Y, origins at base center
(characters/props), hinge (doors), sill center (windows). Names use the CHR_/WPN_/PRP_/ENV_/VEH_
prefixes. Exports are GLB, +Y up (the glTF exporter converts -Y forward to +Z forward).

Everything here is prototype geometry: proportioned blockouts with PBR flat materials so the
runtime pipeline (Blender -> GLB -> AssetLoader -> CharacterRig / props) is proven end to end.
"""
import bpy
import bmesh
import math
import os
from mathutils import Matrix, Vector

# ----------------------------------------------------------------------------- scene


def clear_scene():
    _MATS.clear()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.objects, bpy.data.images):
        for item in list(block):
            try:
                block.remove(item)
            except Exception:
                pass


def collection(name):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    return col


def link(obj, col_name='Assets'):
    col = collection(col_name)
    if obj.name not in col.objects:
        col.objects.link(obj)
    return obj


# ----------------------------------------------------------------------------- materials

_MATS = {}


def material(name, color, roughness=0.8, metallic=0.0, emission=None, emission_strength=0.0, alpha=1.0):
    """Principled BSDF material. name should be MAT_*. color is (r,g,b) 0..1 linear."""
    if name in _MATS:
        try:
            if _MATS[name].name in bpy.data.materials:
                return _MATS[name]
        except ReferenceError:
            pass
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if emission is not None:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    if alpha < 1.0:
        bsdf.inputs['Alpha'].default_value = alpha
        try:
            mat.surface_render_method = 'BLENDED'
        except Exception:
            mat.blend_method = 'BLEND'
    _MATS[name] = mat
    return mat


def hexcol(h):
    """0xRRGGBB (sRGB) -> linear rgb tuple."""
    r = ((h >> 16) & 255) / 255.0
    g = ((h >> 8) & 255) / 255.0
    b = (h & 255) / 255.0

    def lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin(r), lin(g), lin(b))


# ----------------------------------------------------------------------------- geometry


def _new_object(name, bm, mat=None, location=(0, 0, 0)):
    mesh = bpy.data.meshes.new(name + '_Mesh')
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    if mat is not None:
        mesh.materials.append(mat)
    link(obj)
    return obj


def box(name, size, mat, location=(0, 0, 0), offset=(0, 0, 0)):
    """Axis-aligned box of `size` (x,y,z) whose center sits at `offset` relative to the object origin."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bmesh.ops.translate(bm, vec=offset, verts=bm.verts)
    return _new_object(name, bm, mat, location)


def cylinder(name, radius, depth, mat, location=(0, 0, 0), offset=(0, 0, 0), segments=12, radius2=None, axis='Z'):
    bm = bmesh.new()
    r2 = radius if radius2 is None else radius2
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments, radius1=radius, radius2=r2, depth=depth)
    if axis == 'X':
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'Y'), verts=bm.verts)
    elif axis == 'Y':
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'), verts=bm.verts)
    bmesh.ops.translate(bm, vec=offset, verts=bm.verts)
    return _new_object(name, bm, mat, location)


def cone(name, radius, depth, mat, location=(0, 0, 0), offset=(0, 0, 0), segments=8):
    return cylinder(name, radius, depth, mat, location, offset, segments, radius2=0.0)


def sphere(name, radius, mat, location=(0, 0, 0), offset=(0, 0, 0), subdivisions=1):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdivisions, radius=radius)
    bmesh.ops.translate(bm, vec=offset, verts=bm.verts)
    return _new_object(name, bm, mat, location)


def plane(name, size_x, size_y, mat, location=(0, 0, 0), offset=(0, 0, 0), vertical=False):
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    bmesh.ops.scale(bm, vec=(size_x, size_y, 1), verts=bm.verts)
    if vertical:
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'), verts=bm.verts)
    bmesh.ops.translate(bm, vec=offset, verts=bm.verts)
    return _new_object(name, bm, mat, location)


def empty(name, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    obj.location = location
    obj.empty_display_size = 0.05
    link(obj)
    return obj


def parent(child, par):
    child.parent = par
    child.matrix_parent_inverse = par.matrix_world.inverted()
    return child


def join(objects, name, mat=None):
    """Join several objects into one mesh named `name` (keeps per-face materials)."""
    if not objects:
        return None
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    obj.data.name = name + '_Mesh'
    return obj


def set_shade_smooth(obj, smooth=True):
    for p in obj.data.polygons:
        p.use_smooth = smooth


def all_children(obj):
    out = [obj]
    for c in obj.children:
        out.extend(all_children(c))
    return out


# ----------------------------------------------------------------------------- export


def export_glb(root_objects, path):
    """Export the given objects (and their children) as a single GLB."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    objs = []
    for r in root_objects:
        objs.extend(all_children(r))
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_materials='EXPORT',
        export_animations=False,
        export_skins=False,
        export_lights=False,
        export_cameras=False,
    )
    return path


def save_blend(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=path, compress=True)


def out_dir():
    """Exports directory passed as `-- --out <dir>` or default blender/exports."""
    import sys
    argv = sys.argv
    if '--' in argv:
        rest = argv[argv.index('--') + 1:]
        if '--out' in rest:
            return rest[rest.index('--out') + 1]
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'exports')


def blend_dir():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
