import sys
import bpy


def main():
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    filter_text = args[0].lower() if args else ""

    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        if filter_text and filter_text not in mat.name.lower():
            continue
        print(f"Material: {mat.name}")
        for node in mat.node_tree.nodes:
            info = f"  {node.type} - {node.name}"
            if node.type == "RGB":
                info += f" value={tuple(node.outputs[0].default_value)}"
            if node.type == "TEX_IMAGE" and node.image:
                info += f" image={node.image.name}"
            if node.type == "VERTEX_COLOR":
                info += f" layer={node.layer_name}"
            print(info)


if __name__ == "__main__":
    main()
