#!/usr/bin/env python
import sys
sys.path.insert(0, '/Users/hares/Desktop/SheCodes/SheCodes_app_travelQue/backend')

from main import app

print("=" * 80)
print("Registered Routes in FastAPI App")
print("=" * 80)

for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        print(f"{' | '.join(route.methods):15} {route.path}")

print("\n" + "=" * 80)
print(f"Total routes: {len(app.routes)}")
print("=" * 80)
