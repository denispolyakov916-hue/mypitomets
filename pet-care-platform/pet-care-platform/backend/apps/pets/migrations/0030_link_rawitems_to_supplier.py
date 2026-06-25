from django.db import migrations


def link_raw(apps, schema_editor):
    Supplier = apps.get_model('pets', 'Supplier')
    SupplierRawItem = apps.get_model('pets', 'SupplierRawItem')
    supplier = Supplier.objects.filter(code='dinozavrik').first()
    if not supplier:
        supplier = Supplier.objects.create(
            code='dinozavrik', name='Динозаврик', supplier_type='feed', is_active=True,
        )
    SupplierRawItem.objects.filter(supplier__isnull=True).update(supplier=supplier)


def unlink_raw(apps, schema_editor):
    SupplierRawItem = apps.get_model('pets', 'SupplierRawItem')
    SupplierRawItem.objects.filter(supplier__code='dinozavrik').update(supplier=None)


class Migration(migrations.Migration):
    dependencies = [
        ('pets', '0029_alter_supplierrawitem_unique_together_and_more'),
    ]
    operations = [
        migrations.RunPython(link_raw, unlink_raw),
    ]
