import bpy


def main():
    lights = [obj for obj in bpy.context.scene.objects if obj.type == "LIGHT"]
    if not lights:
        print("No lights found.")
        return
    for light in lights:
        data = light.data
        print(f"{light.name}: type={data.type} energy={data.energy}")


if __name__ == "__main__":
    main()
