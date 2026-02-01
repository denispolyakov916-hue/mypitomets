"""
Упрощённая версия скрипта для запекания текстур в Blender 5.0+
Обрабатывает каждый материал отдельно для избежания ошибок памяти.
"""

import bpy
import os

# ===== НАСТРОЙКИ =====
BLEND_FILE = "/home/dmitry/Загрузки/Telegram Desktop/F-5.0.blend"
OUTPUT_DIR = "/home/dmitry/PycharmProjects/Pet_dev2/pet-care-platform/frontend/public/models"
OUTPUT_GLB = os.path.join(OUTPUT_DIR, "assistant.glb")
BAKE_DIR = os.path.join(OUTPUT_DIR, "bakes")
TEXTURE_SIZE = 2048

# Типы текстур
BAKE_TYPES = {
    'basecolor': {'type': 'DIFFUSE', 'color_space': 'sRGB'},
    'normal': {'type': 'NORMAL', 'color_space': 'Non-Color'},
    'roughness': {'type': 'EMIT', 'color_space': 'Non-Color'},
    'ao': {'type': 'AO', 'color_space': 'Non-Color'}
}


def setup_scene():
    """Настройка сцены для запекания"""
    print("🔧 Настройка сцены...")
    
    bpy.context.scene.render.engine = 'CYCLES'
    bpy.context.scene.cycles.device = 'GPU'
    bpy.context.scene.cycles.samples = 128
    
    bpy.context.scene.render.bake.use_pass_direct = False
    bpy.context.scene.render.bake.use_pass_indirect = False
    bpy.context.scene.render.bake.use_pass_color = True
    
    os.makedirs(BAKE_DIR, exist_ok=True)
    print("✅ Сцена настроена")


def bake_single_texture(obj, material, tex_name, tex_info):
    """Запекает одну текстуру для материала"""
    try:
        # Создаём изображение
        image_name = f"{obj.name}_{material.name}_{tex_name}.png"
        image_path = os.path.join(BAKE_DIR, image_name)
        
        if image_name in bpy.data.images:
            bpy.data.images.remove(bpy.data.images[image_name])
        
        img = bpy.data.images.new(image_name, width=TEXTURE_SIZE, height=TEXTURE_SIZE, alpha=False)
        img.colorspace_settings.name = tex_info['color_space']
        img.filepath_raw = image_path
        img.file_format = 'PNG'
        
        # Создаём Image Texture ноду
        nodes = material.node_tree.nodes
        img_node = nodes.new(type='ShaderNodeTexImage')
        img_node.image = img
        nodes.active = img_node
        
        # Выбираем объект
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        
        # Запекаем
        print(f"  🔥 Запекание {tex_name}...")
        
        if tex_info['type'] == 'DIFFUSE':
            bpy.context.scene.render.bake.use_pass_direct = False
            bpy.context.scene.render.bake.use_pass_indirect = False
            bpy.context.scene.render.bake.use_pass_color = True
        
        bpy.ops.object.bake(type=tex_info['type'])
        img.save()
        print(f"    ✅ {tex_name} запечён")
        
        # Удаляем временную ноду
        nodes.remove(img_node)
        
        return True
        
    except Exception as e:
        print(f"    ❌ Ошибка: {e}")
        return False


def process_material(obj, material):
    """Обрабатывает один материал"""
    print(f"\n  🎨 Материал: {material.name}")
    
    if not material.use_nodes:
        print(f"  ⚠️  Материал не использует ноды. Пропускаем.")
        return
    
    success_count = 0
    for tex_name, tex_info in BAKE_TYPES.items():
        if bake_single_texture(obj, material, tex_name, tex_info):
            success_count += 1
    
    print(f"  ✅ Запечено {success_count}/{len(BAKE_TYPES)} текстур")


def export_glb():
    """Экспорт модели в GLB"""
    print(f"\n📦 Экспорт GLB...")
    
    try:
        bpy.ops.object.select_all(action='DESELECT')
        for obj in bpy.context.scene.objects:
            if obj.type == 'MESH':
                obj.select_set(True)
        
        bpy.ops.export_scene.gltf(
            filepath=OUTPUT_GLB,
            export_format='GLB',
            use_selection=True,
            export_texcoords=True,
            export_normals=True,
            export_materials='EXPORT',
            export_cameras=False,
            export_lights=False,
            export_apply=True
        )
        
        print(f"✅ GLB экспортирован: {OUTPUT_GLB}")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка экспорта: {e}")
        return False


def main():
    """Основная функция"""
    print("=" * 60)
    print("🚀 Упрощённое запекание текстур (Blender 5.0+)")
    print("=" * 60)
    
    setup_scene()
    
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    
    if not mesh_objects:
        print("❌ Не найдено объектов сетки!")
        return
    
    print(f"\n📋 Найдено объектов: {len(mesh_objects)}")
    
    # Обрабатываем каждый объект
    for obj in mesh_objects:
        print(f"\n🎯 Обработка объекта: {obj.name}")
        
        if not obj.data.materials:
            print(f"⚠️  У объекта нет материалов. Пропускаем.")
            continue
        
        # Обрабатываем каждый материал
        for mat_slot in obj.material_slots:
            material = mat_slot.material
            if material:
                process_material(obj, material)
    
    # Экспортируем GLB
    if export_glb():
        print("\n" + "=" * 60)
        print("✅ Процесс завершён успешно!")
        print("=" * 60)
        print(f"📁 Текстуры: {BAKE_DIR}")
        print(f"📦 GLB: {OUTPUT_GLB}")
        print("\n💡 Обновите версию: MODEL_URL = '/models/assistant.glb?v=9'")
    else:
        print("\n❌ Процесс завершился с ошибками")


if __name__ == "__main__":
    main()
