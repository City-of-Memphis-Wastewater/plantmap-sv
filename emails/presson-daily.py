
#!/usr/bin/env python3

import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime, timezone


# --------------------------------------------------
# Configuration
# --------------------------------------------------

REPO_DIR = Path(__file__).resolve().parent.parent

APP_DIR = Path.home() / ".plantmap-sv"
EXPORT_DIR = APP_DIR / "export"

QUERY_FILE = REPO_DIR / "queries" / "presson-daily-tags.txt"

FORMATS = ("csv", "json", "svg")
INTERVAL_SECONDS = "900"
EMAIL_LIST_KEY = "list-3"

# --------------------------------------------------
# Command execution
# --------------------------------------------------

def run_command(args: list[str]) -> str:
    """Execute a command and return stdout."""

    print(f"\n$ {' '.join(map(str, args))}")

    if os.name == "nt":
        # Windows requires shell handling for npx.cmd.
        command = subprocess.list2cmdline(
            [str(arg) for arg in args]
        )

        result = subprocess.run(
            command,
            shell=True,
            cwd=REPO_DIR,
            text=True,
            capture_output=True,
        )
    else:
        result = subprocess.run(
            [str(arg) for arg in args],
            cwd=REPO_DIR,
            text=True,
            capture_output=True,
        )

    if result.stdout:
        print(result.stdout, end="")

    if result.stderr:
        print(result.stderr, end="", file=sys.stderr)

    if result.returncode != 0:
        raise RuntimeError(
            f"Command failed with exit code {result.returncode}"
        )

    return result.stdout.strip()


# --------------------------------------------------
# Main workflow
# --------------------------------------------------

def main():

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)

    if not QUERY_FILE.is_file():
        raise FileNotFoundError(
            f"Query file not found: {QUERY_FILE}"
        )

    # Retrieve recipients from the settings vault.
    print("Retrieving email recipients...")

    email_list = run_command([
        "npx",
        "memphis-settings",
        "--app-dir", str(APP_DIR),
        "config", "get",
        "email-recipient", EMAIL_LIST_KEY,
    ])

    if not email_list:
        raise RuntimeError("No email recipients configured.")

    # Snapshot existing exports.
    before = {
        path: path.stat().st_mtime_ns
        for path in EXPORT_DIR.iterdir()
        if path.is_file()
    }

    started = datetime.now(timezone.utc).timestamp_ns() \
        if hasattr(datetime.now(timezone.utc), "timestamp_ns") \
        else int(datetime.now(timezone.utc).timestamp() * 1_000_000_000)

    # Download telemetry.
    print("\nDownloading Presson telemetry...")

    run_command([
        "npx",
        "plantmap-sv",
        "download",
        str(QUERY_FILE),
        "--days", "1",
        "--format", "csv",
        "--format", "json",
        "--format", "svg",
        "-o", str(EXPORT_DIR),
        "-sec", INTERVAL_SECONDS,
    ])

    # Collect files generated or updated by this run.
    attachments = []

    for path in sorted(EXPORT_DIR.iterdir()):

        if not path.is_file():
            continue

        if path.suffix.lower() not in FORMATS:
            continue

        previous_mtime = before.get(path)

        if previous_mtime is None or path.stat().st_mtime_ns >= started:
            if path.stat().st_size == 0:
                raise RuntimeError(
                    f"Empty attachment: {path}"
                )

            attachments.append(path)

    if not attachments:
        raise RuntimeError("No export attachments were generated.")

    print("\nAttachments:")

    for path in attachments:
        print(f"  {path}")

    # Send email.
    print("\nSending Presson daily report...")

    email_args = [
        "npx",
        "plantmap-sv",
        "email",
        "--to", email_list,
        "--subject", "Daily Presson Report",
        "--body",
        (
            "Attached is the daily Presson test data report "
            "in 15-minute increments. Open the SVG image file "
            "in your browser to view the graph. This report "
            "was generated using PlantMap-SV automated "
            "reporting tools."
        ),
    ]

    for path in attachments:
        email_args.extend([
            "--attachment",
            str(path),
        ])

    run_command(email_args)

    print("\nPresson daily report sent successfully.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, FileNotFoundError, OSError) as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        sys.exit(1)
