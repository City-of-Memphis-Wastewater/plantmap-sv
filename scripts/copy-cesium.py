#!/usr/bin/env python3

from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "node_modules" / "cesium" / "Build" / "Cesium"
DESTINATION = ROOT / "static" / "cesium"


def main() -> None:
    if not SOURCE.is_dir():
        raise SystemExit(f"Cesium build directory not found: {SOURCE}")

    if DESTINATION.exists() or DESTINATION.is_symlink():
        raise SystemExit(
            f"Destination already exists: {DESTINATION}\n"
            "Remove it manually before copying Cesium assets."
        )

    shutil.copytree(SOURCE, DESTINATION)

    print("Copied Cesium assets:")
    print(f"  from: {SOURCE}")
    print(f"  to:   {DESTINATION}")


if __name__ == "__main__":
    main()
