from django.db import migrations


def seed_supplier(apps, schema_editor):
    Supplier = apps.get_model('pets', 'Supplier')
    SupplierOffer = apps.get_model('pets', 'SupplierOffer')
    supplier, _ = Supplier.objects.get_or_create(
        code='dinozavrik',
        defaults={
            'name': 'Динозаврик',
            'supplier_type': 'feed',
            'is_active': True,
            'website_url': 'https://www.dinozavrik.ru/',
            'payment_model': 'partner_checkout',
            'settlement_model': 'agent_commission',
            'comment': 'Первый поставщик. Источник: catalog.json (агентский %% = АП_ПИТОМЕЦПЛЮС).',
        },
    )
    # все офферы, что пришли как dinozavrik (или ещё без поставщика), привязываем
    SupplierOffer.objects.filter(supplier__isnull=True).update(supplier=supplier)


def unseed_supplier(apps, schema_editor):
    Supplier = apps.get_model('pets', 'Supplier')
    # SET_NULL обнулит supplier у офферов автоматически
    Supplier.objects.filter(code='dinozavrik').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('pets', '0026_supplier_alter_supplieroffer_source_and_more'),
    ]
    operations = [
        migrations.RunPython(seed_supplier, unseed_supplier),
    ]
