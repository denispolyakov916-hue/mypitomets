#!/usr/bin/env python3
"""
Анализ нагрузки на эндпоинты из логов RequestLoggingMiddleware.
"""
import re
from pathlib import Path
from collections import defaultdict

log_dir = Path(__file__).parent / "backend" / "logs"
pattern = re.compile(
    r"Request completed: (GET|POST|PUT|PATCH|DELETE) ([^\s]+) Status: (\d+) Duration: ([\d.]+)s"
)

stats = defaultdict(lambda: {"count": 0, "total_time": 0.0, "status_200": 0})

for log_file in sorted(log_dir.glob("app.log*")):
    try:
        content = log_file.read_text(errors="ignore")
    except Exception as e:
        print(f"Warning: could not read {log_file}: {e}")
        continue
    for line in content.splitlines():
        m = pattern.search(line)
        if m:
            method, path, status, duration = m.groups()
            key = f"{method} {path}"
            stats[key]["count"] += 1
            stats[key]["total_time"] += float(duration)
            if status == "200":
                stats[key]["status_200"] += 1

# Сортируем по суммарному времени (нагрузка)
print("=" * 70)
print("ТОП эндпоинтов по нагрузке (суммарное время выполнения)")
print("=" * 70)
for key in sorted(stats, key=lambda k: stats[k]["total_time"], reverse=True)[:25]:
    s = stats[key]
    avg = s["total_time"] / s["count"] if s["count"] else 0
    success = s["status_200"] / s["count"] * 100 if s["count"] else 0
    print(f"\n{key}")
    print(f"  Запросов: {s['count']}  |  avg: {avg:.2f}s  |  total: {s['total_time']:.1f}s  |  успех: {success:.0f}%")
