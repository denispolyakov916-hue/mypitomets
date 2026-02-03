"""
Скрипт для запекания текстур "шерсти" в Blender и экспорта GLB для веб-сайта.

Совместимость: Blender 3.0+ (протестировано на 5.0.1)
Использование: Откройте файл F-5.0.blend в Blender и запустите этот скрипт через Text Editor.

Примечание: Использует новый API Blender 5.0+ для запекания (bpy.ops.object.bake(type=...))
"""

import bpy
import os

# ===== НАСТРОЙКИ =====
BLEND_FILE = "/home/dmitry/Загрузки/Telegram Desktop/F-5.0.blend"
OUTPUT_DIR = "/home/dmitry/PycharmProjects/Pet_dev2/pet-care-platform/frontend/public/models"
OUTPUT_GLB = os.path.join(OUTPUT_DIR, "assistant.glb")
BAKE_DIR = os.path.join(OUTPUT_DIR, "bakes")
TEXTURE_SIZE = 2048  # Разрешение текстур (1024, 2048, 4096)

# Типы запекаемых текстур
BAKE_TYPES = {
    'basecolor': {'type': 'DIFFUSE', 'color_space': 'sRGB'},
    'normal': {'type': 'NORMAL', 'color_space': 'Non-Color'},
    'roughness': {'type': 'EMIT', 'color_space': 'Non-Color'},
    'ao': {'type': 'AO', 'color_space': 'Non-Color'}
}


def setup_scene():
    """Настройка сцены для запекания"""
    print("🔧 Настройка сцены...")
    
    # Переключаемся на Cycles
    bpy.context.scene.render.engine = 'CYCLES'
    bpy.context.scene.cycles.device = 'GPU'  # Используем GPU если доступно
    bpy.context.scene.cycles.samples = 128  # Качество бейка
    
    # Настройки бейка
    bpy.context.scene.render.bake.use_pass_direct = False
    bpy.context.scene.render.bake.use_pass_indirect = False
    bpy.context.scene.render.bake.use_pass_color = True
    
    # Создаем директорию для текстур
    os.makedirs(BAKE_DIR, exist_ok=True)
    
    print("✅ Сцена настроена")


def check_uvs(obj):
    """Проверка UV-развертки"""
    if not obj.data.uv_layers:
        print(f"⚠️  У объекта {obj.name} нет UV-развертки. Создаем...")
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02)
        bpy.ops.object.mode_set(mode='OBJECT')
        print(f"✅ UV-развертка создана для {obj.name}")
    else:
        print(f"✅ UV-развертка найдена для {obj.name}")


def create_bake_images(obj, material):
    """Создание изображений для запекания"""
    print(f"🖼️  Создание изображений для {obj.name} - {material.name}...")
    
    images = {}
    for tex_name, tex_info in BAKE_TYPES.items():
        image_name = f"{obj.name}_{material.name}_{tex_name}.png"
        image_path = os.path.join(BAKE_DIR, image_name)
        
        # Создаем изображение
        if image_name in bpy.data.images:
            bpy.data.images.remove(bpy.data.images[image_name])
        
        img = bpy.data.images.new(
            image_name,
            width=TEXTURE_SIZE,
            height=TEXTURE_SIZE,
            alpha=False
        )
        img.colorspace_settings.name = tex_info['color_space']
        img.filepath_raw = image_path
        img.file_format = 'PNG'
        
        images[tex_name] = img
        print(f"  ✓ {image_name}")
    
    return images


def setup_emission_for_roughness(material):
    """Временная настройка материала для запекания Roughness через Emission"""
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    
    # Находим Principled BSDF
    principled = None
    for node in nodes:
        if node.type == 'BSDF_PRINCIPLED':
            principled = node
            break
    
    if not principled:
        print("⚠️  Principled BSDF не найден")
        return None, None
    
    # Сохраняем оригинальное подключение
    original_connections = []
    output_node = None
    for node in nodes:
        if node.type == 'OUTPUT_MATERIAL':
            output_node = node
            break
    
    if output_node and output_node.inputs['Surface'].is_linked:
        original_connections = list(output_node.inputs['Surface'].links)
    
    # Создаем временную ноду Emission
    emission = nodes.new(type='ShaderNodeEmission')
    emission.location = (principled.location[0] + 300, principled.location[1])
    
    # Подключаем Roughness к Emission
    roughness_input = principled.inputs.get('Roughness')
    if roughness_input and roughness_input.is_linked:
        source = roughness_input.links[0].from_socket
        links.new(source, emission.inputs['Color'])
    else:
        # Если roughness не подключен, используем значение
        emission.inputs['Color'].default_value = (roughness_input.default_value,) * 3 + (1.0,)
    
    # Подключаем Emission к выходу
    if output_node:
        links.new(emission.outputs['Emission'], output_node.inputs['Surface'])
    
    return emission, original_connections


def restore_material(material, emission_node, original_connections):
    """Восстановление материала после запекания Roughness"""
    if emission_node:
        material.node_tree.nodes.remove(emission_node)
    
    if original_connections:
        output_node = None
        for node in material.node_tree.nodes:
            if node.type == 'OUTPUT_MATERIAL':
                output_node = node
                break
        
        if output_node:
            for link in original_connections:
                material.node_tree.links.new(
                    link.from_socket,
                    output_node.inputs['Surface']
                )


def bake_textures(obj, material, images):
    """Запекание всех типов текстур"""
    print(f"🔥 Запекание текстур для {obj.name} - {material.name}...")
    
    # Выбираем объект
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    
    # Создаем временные Image Texture ноды
    temp_nodes = {}
    
    for tex_name, img in images.items():
        # Создаем ноду для изображения
        img_node = nodes.new(type='ShaderNodeTexImage')
        img_node.image = img
        img_node.location = (0, len(temp_nodes) * -300)
        temp_nodes[tex_name] = img_node
    
    # Запекаем каждый тип текстуры
    for tex_name, img in images.items():
        print(f"  🔥 Запекание {tex_name}...")
        
        # Активируем ноду для этой текстуры
        nodes.active = temp_nodes[tex_name]
        
        bake_info = BAKE_TYPES[tex_name]
        
        # Специальная обработка для Roughness
        emission_node = None
        original_connections = None
        if tex_name == 'roughness':
            emission_node, original_connections = setup_emission_for_roughness(material)
            bpy.context.scene.render.bake.use_pass_emit = True
        
        # Настраиваем параметры бейка для Blender 5.0+
        if bake_info['type'] == 'DIFFUSE':
            bpy.context.scene.render.bake.use_pass_direct = False
            bpy.context.scene.render.bake.use_pass_indirect = False
            bpy.context.scene.render.bake.use_pass_color = True
        
        # Запекаем! (В Blender 5.0+ используем type напрямую в bake())
        try:
            bpy.ops.object.bake(type=bake_info['type'])
            img.save()
            print(f"    ✅ {tex_name} запечён")
        except Exception as e:
            print(f"    ❌ Ошибка при запекании {tex_name}: {e}")
        
        # Восстанавливаем материал после Roughness
        if emission_node:
            restore_material(material, emission_node, original_connections)
    
    # Удаляем временные ноды
    for node in temp_nodes.values():
        nodes.remove(node)
    
    print(f"✅ Все текстуры запечены для {material.name}")


def create_pbr_material(obj, material, images):
    """Создание PBR материала с запечёнными текстурами"""
    print(f"🎨 Создание PBR материала...")
    
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    
    # Очищаем существующие ноды (опционально)
    # for node in nodes:
    #     if node.type not in ['BSDF_PRINCIPLED', 'OUTPUT_MATERIAL']:
    #         nodes.remove(node)
    
    # Находим или создаем Principled BSDF
    principled = None
    for node in nodes:
        if node.type == 'BSDF_PRINCIPLED':
            principled = node
            break
    
    if not principled:
        principled = nodes.new(type='ShaderNodeBsdfPrincipled')
        principled.location = (0, 0)
    
    # Создаем Image Texture ноды для каждой текстуры
    x_offset = -400
    y_offset = 0
    
    for tex_name, img in images.items():
        img_node = nodes.new(type='ShaderNodeTexImage')
        img_node.image = img
        img_node.location = (x_offset, y_offset)
        img_node.label = tex_name
        
        # Подключаем к Principled BSDF
        if tex_name == 'basecolor':
            links.new(img_node.outputs['Color'], principled.inputs['Base Color'])
        elif tex_name == 'normal':
            # Создаем Normal Map ноду
            normal_map = nodes.new(type='ShaderNodeNormalMap')
            normal_map.location = (x_offset + 200, y_offset)
            links.new(img_node.outputs['Color'], normal_map.inputs['Color'])
            links.new(normal_map.outputs['Normal'], principled.inputs['Normal'])
        elif tex_name == 'roughness':
            links.new(img_node.outputs['Color'], principled.inputs['Roughness'])
        elif tex_name == 'ao':
            # AO можно смешать с Base Color через MixRGB
            pass  # Опционально
        
        y_offset -= 300
    
    print(f"✅ PBR материал создан")


def export_glb():
    """Экспорт модели в GLB"""
    print(f"📦 Экспорт GLB...")
    
    # Выбираем все объекты сетки
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            obj.select_set(True)
    
    # Экспорт
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_GLB,
        export_format='GLB',
        use_selection=True,
        export_texcoords=True,
        export_normals=True,
        export_materials='EXPORT',
        export_colors=True,
        export_cameras=False,
        export_lights=False,
        export_apply=True
    )
    
    print(f"✅ GLB экспортирован: {OUTPUT_GLB}")


def main():
    """Основная функция"""
    print("=" * 60)
    print("🚀 Начало процесса запекания текстур")
    print("=" * 60)
    
    # Настройка сцены
    setup_scene()
    
    # Получаем все объекты сетки
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    
    if not mesh_objects:
        print("❌ Не найдено объектов сетки!")
        return
    
    print(f"📋 Найдено объектов: {len(mesh_objects)}")
    
    # Обрабатываем каждый объект
    for obj in mesh_objects:
        print(f"\n🎯 Обработка объекта: {obj.name}")
        
        # Проверяем UV
        check_uvs(obj)
        
        # Обрабатываем материалы
        if not obj.data.materials:
            print(f"⚠️  У объекта {obj.name} нет материалов. Пропускаем.")
            continue
        
        for mat_slot in obj.material_slots:
            material = mat_slot.material
            if not material or not material.use_nodes:
                print(f"⚠️  Материал {material.name if material else 'None'} не использует ноды. Пропускаем.")
                continue
            
            print(f"  🎨 Материал: {material.name}")
            
            # Создаем изображения для бейка
            images = create_bake_images(obj, material)
            
            # Запекаем текстуры
            bake_textures(obj, material, images)
            
            # Создаем PBR материал
            create_pbr_material(obj, material, images)
    
    # Экспортируем GLB
    export_glb()
    
    print("\n" + "=" * 60)
    print("✅ Процесс завершён успешно!")
    print("=" * 60)
    print(f"📁 Текстуры сохранены в: {BAKE_DIR}")
    print(f"📦 GLB файл: {OUTPUT_GLB}")
    print("\n💡 Теперь обновите версию в коде: MODEL_URL = '/models/assistant.glb?v=9'")


if __name__ == "__main__":
    main()
