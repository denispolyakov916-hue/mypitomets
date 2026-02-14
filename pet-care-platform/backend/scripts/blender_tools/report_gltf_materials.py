import sys
import bpy


def main():
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if not args:
        print("Usage: blender -b -P report_gltf_materials.py -- /path/to/file.glb")
        return

    path = args[0]
    bpy.ops.import_scene.gltf(filepath=path)

    print("Objects and materials:")
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        print(f"- {obj.name}")
        for slot in obj.material_slots:
            mat = slot.material
            if not mat or not mat.use_nodes:
                continue
            print(f"  material: {mat.name}")
            for node in mat.node_tree.nodes:
                if node.type == "TEX_IMAGE" and node.image:
                    print(f"    image: {node.image.name} ({node.image.filepath})")


if __name__ == "__main__":
    main()
