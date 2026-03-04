import bpy


def main():
    for obj in bpy.context.scene.objects:
        if obj.particle_systems:
            print(f"{obj.name} particle systems:")
            for ps in obj.particle_systems:
                print(f"  - {ps.name} type={ps.settings.type}")


if __name__ == "__main__":
    main()
