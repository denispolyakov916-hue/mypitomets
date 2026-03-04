import re
from collections import defaultdict

SQL_PATH = r"d:\pet_develop\Pet_dev\pet-care-platform\backend\pitomets_db_dump.sql"

copy_re = re.compile(r"^COPY\s+public\.(\w+)\s*\(([^)]+)\)\s+FROM\s+stdin;\s*$")


def parse_copy_section(path, table_name):
    cols = []
    with open(path, "r", encoding="utf-8") as f:
        in_section = False
        for line in f:
            line = line.rstrip("\n")
            if not in_section:
                m = copy_re.match(line)
                if m and m.group(1) == table_name:
                    cols = [c.strip() for c in m.group(2).split(",")]
                    in_section = True
                continue
            if line == "\\.":
                break
            yield cols, line


def main():
    sku_data = {}
    attr_keys = [
        "weight_display",
        "flavor_display",
        "pack_quantity",
        "volume_display",
        "size_code",
        "color_display",
    ]

    for cols, line in parse_copy_section(SQL_PATH, "shop_product_skus"):
        parts = line.split("\t")
        if len(parts) != len(cols):
            continue
        row = dict(zip(cols, parts))
        product_id = row.get("product_id")
        if not product_id:
            continue
        entry = sku_data.setdefault(product_id, {"count": 0, "attrs": defaultdict(set)})
        entry["count"] += 1
        for key in attr_keys:
            val = row.get(key)
            if val and val != "\\N":
                entry["attrs"][key].add(val)

    examples = defaultdict(list)
    for cols, line in parse_copy_section(SQL_PATH, "products"):
        parts = line.split("\t")
        if len(parts) != len(cols):
            continue
        row = dict(zip(cols, parts))
        pid = row.get("id")
        if not pid or pid not in sku_data:
            continue
        sku_info = sku_data[pid]
        if sku_info["count"] < 2:
            continue

        product_group = row.get("product_group")
        animal = row.get("animal_type") or row.get("animal")
        name = row.get("name")
        slug = row.get("slug")
        category = row.get("category_name") or row.get("category")
        subcategory = row.get("subcategory")

        def normalize(value):
            return None if value == "\\N" else value

        product_group = normalize(product_group)
        animal = normalize(animal)
        name = normalize(name)
        slug = normalize(slug)
        category = normalize(category)
        subcategory = normalize(subcategory)

        group_key = product_group or "unknown"
        if len(examples[group_key]) >= 3:
            continue

        examples[group_key].append({
            "id": pid,
            "name": name,
            "animal": animal,
            "category": category,
            "subcategory": subcategory,
            "slug": slug,
            "sku_count": sku_info["count"],
            "attrs": {k: list(v)[:3] for k, v in sku_info["attrs"].items()},
        })

    for group, items in examples.items():
        print(f"\n# {group} ({len(items)} examples)")
        for item in items:
            attrs_summary = ", ".join(
                f"{k}={item['attrs'].get(k)}"
                for k in attr_keys
                if item["attrs"].get(k)
            )
            name = item["name"] or ""
            print(
                f"- id={item['id']} "
                f"name={name[:80]} "
                f"animal={item['animal']} "
                f"category={item['category']} "
                f"subcategory={item['subcategory']} "
                f"skus={item['sku_count']} "
                f"attrs: {attrs_summary}"
            )


if __name__ == "__main__":
    main()
