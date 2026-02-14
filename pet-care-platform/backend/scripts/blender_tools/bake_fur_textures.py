import argparse
import os
import sys

import bpy


def parse_args():
    parser = argparse.ArgumentParser(description="Bake fur-like textures to images.")
    parser.add_argument("--out", required=True, help="Output directory for baked textures.")
    parser.add_argument("--size", type=int, default=1024, help="Texture resolution (square).")
    parser.add_argument("--samples", type=int, default=64, help="Cycles samples.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply baked maps to materials (basic PBR hookups).",
    )
    parser.add_argument(
        "--apply-ao",
        action="store_true",
        help="Multiply AO into Base Color when applying baked maps.",
    )
    parser.add_argument(
        "--basecolor-mode",
        choices=["diffuse", "combined"],
        default="combined",
        help="Bake mode for base color. 'combined' captures hair but includes lighting.",
    )
    parser.add_argument(
        "--export",
        help="Optional path to export GLB after baking (requires --apply).",
    )
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])


def ensure_cycles(samples):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = True
    scene.render.bake.use_clear = True
    scene.render.bake.margin = 8
    scene.render.bake.use_selected_to_active = False
    scene.render.bake.use_cage = False


def ensure_light():
    scene = bpy.context.scene
    if any(obj.type == "LIGHT" for obj in scene.objects):
        return None
    light_data = bpy.data.lights.new(name="BakeLight", type="AREA")
    light_data.energy = 1500
    light_object = bpy.data.objects.new(name="BakeLight", object_data=light_data)
    light_object.location = (2.5, -2.5, 3.5)
    light_object.rotation_euler = (1.1, 0.0, 0.9)
    scene.collection.objects.link(light_object)
    if scene.world:
        scene.world.color = (0.2, 0.2, 0.2)
    return light_object


def ensure_image(name, size, colorspace, alpha=True):
    image = bpy.data.images.new(name=name, width=size, height=size, alpha=alpha)
    image.colorspace_settings.name = colorspace
    return image


def ensure_image_node(nodes, image):
    node = nodes.new(type="ShaderNodeTexImage")
    node.image = image
    node.select = True
    nodes.active = node
    return node


def find_principled(nodes):
    for node in nodes:
        if node.type == "BSDF_PRINCIPLED":
            return node
    return None


def should_skip_material(mat_name):
    name = mat_name.lower()
    return "hair" in name


def choose_basecolor_mode(mat_name, default_mode):
    name = mat_name.lower()
    if any(token in name for token in ("iris", "sclera", "pupil", "eye")):
        return "diffuse"
    return default_mode


def bake_for_material(obj, mat, out_dir, size, apply_maps, apply_ao, basecolor_mode):
    if not mat.use_nodes:
        return

    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    output_node = next((n for n in nodes if n.type == "OUTPUT_MATERIAL"), None)
    principled = find_principled(nodes)

    if not output_node:
        return

    def bake_image(bake_type, image, setup_emission=False):
        image_node = ensure_image_node(nodes, image)
        obj.active_material = mat
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj

        original_surface_link = None
        original_surface_from = None
        emission_node = None
        if setup_emission:
            emission_node = nodes.new(type="ShaderNodeEmission")
            emission_node.location = output_node.location.x - 200, output_node.location.y
            original_surface_link = next(
                (link for link in links if link.to_socket == output_node.inputs["Surface"]),
                None,
            )
            if original_surface_link:
                original_surface_from = original_surface_link.from_socket
                links.remove(original_surface_link)
            links.new(emission_node.outputs["Emission"], output_node.inputs["Surface"])
            roughness_input = principled.inputs.get("Roughness")
            if roughness_input:
                if roughness_input.is_linked:
                    source_socket = roughness_input.links[0].from_socket
                    links.new(source_socket, emission_node.inputs["Color"])
                else:
                    rough_value = roughness_input.default_value
                    emission_node.inputs["Color"].default_value = (
                        rough_value,
                        rough_value,
                        rough_value,
                        1.0,
                    )

        bpy.ops.object.bake(type=bake_type)

        if setup_emission and original_surface_from:
            if output_node.inputs["Surface"].links:
                links.remove(output_node.inputs["Surface"].links[0])
            links.new(original_surface_from, output_node.inputs["Surface"])

        if emission_node:
            nodes.remove(emission_node)

        nodes.remove(image_node)

    def save_image(image, suffix):
        filename = f"{obj.name}_{mat.name}_{suffix}.png"
        filepath = os.path.join(out_dir, filename)
        image.filepath_raw = filepath
        image.file_format = "PNG"
        image.save()
        return filepath

    # Base color
    diffuse_image = ensure_image(
        f"{obj.name}_{mat.name}_basecolor", size, "sRGB", alpha=False
    )
    mode = choose_basecolor_mode(mat.name, basecolor_mode)
    if mode == "diffuse":
        bpy.context.scene.render.bake.use_pass_direct = False
        bpy.context.scene.render.bake.use_pass_indirect = False
        bpy.context.scene.render.bake.use_pass_color = True
        bake_image("DIFFUSE", diffuse_image, setup_emission=False)
    else:
        bake_image("COMBINED", diffuse_image, setup_emission=False)
    basecolor_path = save_image(diffuse_image, "basecolor")

    # Normal
    normal_image = ensure_image(
        f"{obj.name}_{mat.name}_normal", size, "Non-Color", alpha=False
    )
    bake_image("NORMAL", normal_image, setup_emission=False)
    normal_path = save_image(normal_image, "normal")

    # Roughness via Emission
    roughness_path = None
    if principled and principled.inputs.get("Roughness"):
        roughness_image = ensure_image(
            f"{obj.name}_{mat.name}_roughness", size, "Non-Color", alpha=False
        )
        bake_image("EMIT", roughness_image, setup_emission=True)
        roughness_path = save_image(roughness_image, "roughness")

    # AO
    ao_image = ensure_image(f"{obj.name}_{mat.name}_ao", size, "Non-Color", alpha=False)
    bake_image("AO", ao_image, setup_emission=False)
    ao_path = save_image(ao_image, "ao")

    if apply_maps:
        if should_skip_material(mat.name):
            return
        if not principled:
            principled = nodes.new(type="ShaderNodeBsdfPrincipled")
            principled.location = output_node.location.x - 200, output_node.location.y
            if output_node.inputs["Surface"].links:
                for link in list(output_node.inputs["Surface"].links):
                    links.remove(link)
            links.new(principled.outputs["BSDF"], output_node.inputs["Surface"])
        # Apply baked maps to Principled BSDF (basic PBR hookup).
        tex_base = nodes.new(type="ShaderNodeTexImage")
        tex_base.image = bpy.data.images.load(basecolor_path)
        tex_base.image.colorspace_settings.name = "sRGB"
        links.new(tex_base.outputs["Color"], principled.inputs["Base Color"])

        tex_normal = nodes.new(type="ShaderNodeTexImage")
        tex_normal.image = bpy.data.images.load(normal_path)
        tex_normal.image.colorspace_settings.name = "Non-Color"
        normal_map = nodes.new(type="ShaderNodeNormalMap")
        links.new(tex_normal.outputs["Color"], normal_map.inputs["Color"])
        links.new(normal_map.outputs["Normal"], principled.inputs["Normal"])

        if roughness_path:
            tex_rough = nodes.new(type="ShaderNodeTexImage")
            tex_rough.image = bpy.data.images.load(roughness_path)
            tex_rough.image.colorspace_settings.name = "Non-Color"
            links.new(tex_rough.outputs["Color"], principled.inputs["Roughness"])

        if ao_path and apply_ao:
            tex_ao = nodes.new(type="ShaderNodeTexImage")
            tex_ao.image = bpy.data.images.load(ao_path)
            tex_ao.image.colorspace_settings.name = "Non-Color"
            mix_node = nodes.new(type="ShaderNodeMixRGB")
            mix_node.blend_type = "MULTIPLY"
            mix_node.inputs["Fac"].default_value = 1.0
            links.new(tex_base.outputs["Color"], mix_node.inputs["Color1"])
            links.new(tex_ao.outputs["Color"], mix_node.inputs["Color2"])
            links.new(mix_node.outputs["Color"], principled.inputs["Base Color"])


def main():
    args = parse_args()
    os.makedirs(args.out, exist_ok=True)

    ensure_cycles(args.samples)
    temp_light = ensure_light()

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not meshes:
        print("No mesh objects found.")
        return

    bpy.ops.object.select_all(action="DESELECT")

    for obj in meshes:
        if not obj.data.uv_layers:
            print(f"Skipping {obj.name}: no UV map.")
            continue

        for index, slot in enumerate(obj.material_slots):
            mat = slot.material
            if not mat:
                continue
            obj.active_material_index = index
            bake_for_material(
                obj,
                mat,
                args.out,
                args.size,
                args.apply,
                args.apply_ao,
                args.basecolor_mode,
            )

    if args.export:
        if not args.apply:
            print("Skipping export: use --apply to wire baked maps before export.")
        else:
            bpy.ops.export_scene.gltf(
                filepath=args.export,
                export_format="GLB",
                export_apply=True,
            )

    if temp_light:
        bpy.data.objects.remove(temp_light, do_unlink=True)

    print(f"Bake completed. Output: {args.out}")


if __name__ == "__main__":
    main()
