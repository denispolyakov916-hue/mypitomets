import os
import bpy


def main():
    print("Images in blend:")
    for image in bpy.data.images:
        if image.type != "IMAGE":
            continue
        filepath = bpy.path.abspath(image.filepath) if image.filepath else ""
        exists = os.path.exists(filepath) if filepath else False
        packed = image.packed_file is not None
        print(f"- {image.name}")
        print(f"  filepath: {filepath}")
        print(f"  exists: {exists}")
        print(f"  packed: {packed}")


if __name__ == "__main__":
    main()
