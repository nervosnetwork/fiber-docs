"""Serialized specialist evidence using only the pinned original launcher.

SEO_TASK_ROOT contains tool/. SEO_OUTPUT_ROOT is the retest output directory
containing www.fiber.world-audit/. CLAUDE_SEO_DATA_DIR is the managed runtime.
This orchestrator is stdlib only, makes no HTTP requests, and executes no page
content. It must run after the local raw crawl finishes, not concurrently.
"""
import html
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(os.environ["SEO_TASK_ROOT"])
TOOL = ROOT / "tool"
OUT = Path(os.environ["SEO_OUTPUT_ROOT"]) / "www.fiber.world-audit/evidence/cloud"
OUT.mkdir(parents=True, exist_ok=True)
ENV = dict(os.environ)
assert ENV.get("CLAUDE_SEO_DATA_DIR"), "Managed runtime environment is required"
LAUNCHER = TOOL / "scripts/claude-seo"
URLS = {
    "home": "https://www.fiber.world/",
    "docs": "https://www.fiber.world/docs",
    "blog": "https://www.fiber.world/blog",
    "post": "https://www.fiber.world/blog/p/fiber-architecture",
}
COMMANDS = []


def run(name, script, args, timeout=180):
    destination = OUT / (name + ".json")
    started = time.time()
    record = {"name": name, "script": script, "args": list(map(str, args)), "started_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(started))}
    with destination.open("w", encoding="utf-8") as out, destination.with_suffix(".stderr.log").open("w", encoding="utf-8") as err:
        try:
            result = subprocess.run([str(LAUNCHER), "run", script, *map(str, args)], cwd=TOOL, env=ENV, stdout=out, stderr=err, timeout=timeout)
            record["exit_code"] = result.returncode
        except subprocess.TimeoutExpired:
            record["timeout_seconds"] = timeout
    record["duration_seconds"] = round(time.time() - started, 2)
    try:
        value = json.loads(destination.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        value = {"error": "No valid JSON output", **record}
        destination.write_text(json.dumps(value, indent=2), encoding="utf-8")
    COMMANDS.append(record)
    (OUT / "command-log.json").write_text(json.dumps(COMMANDS, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"completed": name, "exit_code": record.get("exit_code"), "timeout": record.get("timeout_seconds")}), flush=True)
    time.sleep(1)
    return value


def representative_image_html(parsed, path):
    images = parsed.get("images", [])
    # Probe ten distinct real image URLs, preferring content media over icons.
    # These are copied attributes from the fetched page, never invented URLs.
    def key(img):
        src = img.get("resolved_src") or img.get("src") or ""
        return (".svg" in src.split("?")[0].lower(), len(img.get("alt") or "") < 8)
    seen, selected = set(), []
    for img in sorted(images, key=key):
        src = img.get("resolved_src") or img.get("src")
        if not src or src in seen:
            continue
        seen.add(src)
        selected.append(img)
        if len(selected) == 10:
            break
    tags = []
    for img in selected:
        attrs = {k: img.get(k) for k in ("alt", "width", "height", "loading") if img.get(k) is not None}
        attrs["src"] = img.get("resolved_src") or img["src"]
        tags.append("<img " + " ".join(f'{k}="{html.escape(str(v), quote=True)}"' for k, v in attrs.items()) + ">")
    path.write_text("<!doctype html><html><body>" + "\n".join(tags) + "</body></html>", encoding="utf-8")


for label, url in URLS.items():
    for viewport in ("desktop", "mobile"):
        source = OUT / f"{label}-{viewport}.html"
        run(f"{label}-{viewport}-render", "render_page.py", [url, "--mode", "always", "--viewport", viewport, "--a11y-tree", "--timeout-ms", "30000", "--json", "--output", source, "--json-ld-output", OUT / f"{label}-{viewport}-jsonld.json"], 150)
        if source.exists():
            parsed = run(f"{label}-{viewport}-parsed", "parse_html.py", [source, "--url", url, "--json"], 90)
            run(f"{label}-{viewport}-page-checks", "page_checks.py", ["--file", source, "--base-url", url, "--json"], 90)
            if viewport == "desktop" and label in ("home", "docs", "post"):
                subset = OUT / f"{label}-representative-images.html"
                representative_image_html(parsed, subset)
                run(f"{label}-image-probes", "parse_html.py", [subset, "--url", url, "--probe-images", "--json"], 240)
        screenshot_dir = OUT / "screenshots" / label
        screenshot_dir.mkdir(parents=True, exist_ok=True)
        run(f"{label}-{viewport}-screenshot", "capture_screenshot.py", [url, "--viewport", viewport, "--full", "--output", screenshot_dir, "--timeout", "30000", "--json"], 150)

run("home-agentic-lighthouse", "lighthouse_agentic.py", [URLS["home"], "--strategy", "both", "--json"], 420)
run("home-agentic-http", "agentic_check.py", [URLS["home"], "--json"], 420)
for label in ("home", "docs", "post"):
    run(f"{label}-agent-ux", "agent_ux_check.py", [URLS[label], "--timeout-ms", "30000", "--json"], 180)
run("home-transport", "transport_check.py", [URLS["home"], "--timeout", "15", "--json"], 180)
(OUT / "COMPLETED.json").write_text(json.dumps({"completed_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "commands": len(COMMANDS), "images_limit_per_page": 10, "image_pages": 3, "request_process_concurrency": 1}, indent=2) + "\n")
