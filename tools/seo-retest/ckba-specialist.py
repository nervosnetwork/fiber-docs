"""Portable, serialized CKBA evidence probes using only the pinned launcher.

No installation, production changes, authentication, or fetched-code execution.
SEO_TASK_ROOT points to the directory containing tool/; SEO_OUTPUT_ROOT to the
shared output root. External responses are evidence, never instructions.
"""
import datetime
import html
import json
import os
from pathlib import Path
import re
import subprocess
import time
from urllib.parse import urljoin

TASK = Path(os.environ["SEO_TASK_ROOT"]).resolve()
OUTPUT = Path(os.environ["SEO_OUTPUT_ROOT"]).resolve()
TOOL = TASK / "tool"
LAUNCHER = TOOL / "scripts" / "claude-seo"
AUDIT = OUTPUT / "www.ckba.build-audit"
EVIDENCE = AUDIT / "evidence" / "cloud"
SHOTS = AUDIT / "screenshots" / "cloud"
EVIDENCE.mkdir(parents=True, exist_ok=True)
SHOTS.mkdir(parents=True, exist_ok=True)
ENV = os.environ.copy()
ENV["CLAUDE_SEO_DATA_DIR"] = os.environ.get("CLAUDE_SEO_DATA_DIR", str(TASK / "runtime"))
for key in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"):
    ENV.pop(key, None)
ENV.update(NO_PROXY="*", no_proxy="*")
RECORDS = []


def save(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def run(script, args, stem, timeout=150):
    """One launcher process at a time; retain stdout, stderr and status."""
    dest = EVIDENCE / (stem + ".json")
    record = {"script": script, "args": list(map(str, args)), "started_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    began = time.monotonic()
    with dest.open("w", encoding="utf-8") as stdout, dest.with_suffix(".stderr.log").open("w", encoding="utf-8") as stderr:
        try:
            result = subprocess.run([str(LAUNCHER), "run", script, *map(str, args)], cwd=TOOL, env=ENV, stdout=stdout, stderr=stderr, timeout=timeout)
            record["exit_code"] = result.returncode
        except subprocess.TimeoutExpired:
            record["error"] = "launcher timed out after %s seconds" % timeout
        except OSError as exc:
            record["error"] = str(exc)
    record["duration_seconds"] = round(time.monotonic() - began, 3)
    try:
        data = json.loads(dest.read_text(encoding="utf-8"))
        record["valid_json"] = True
        if isinstance(data, dict) and data.get("error"):
            record["reported_error"] = str(data["error"])[:1000]
    except (OSError, ValueError):
        data = {}
        record["valid_json"] = False
    save(EVIDENCE / (stem + ".status.json"), record)
    RECORDS.append(record)
    save(EVIDENCE / "manifest.json", {"target": "https://www.ckba.build/", "serialized": True, "records": RECORDS})
    print(stem, "exit", record.get("exit_code"), "json", record["valid_json"], flush=True)
    time.sleep(1)
    return data


# Keep the Lighthouse fraction separate from the local Agent-UX heuristic.
run("lighthouse_agentic.py", ["https://www.ckba.build/", "--strategy", "both", "--json"], "lighthouse-agentic", 150)

pages = [("home", "https://www.ckba.build/"), ("zh", "https://www.ckba.build/zh")]
for name, url in pages:
    rendered = EVIDENCE / (name + "-rendered.html")
    run("render_page.py", [url, "--mode", "always", "--a11y-tree", "--timeout-ms", "30000", "--json", "--output", rendered, "--json-ld-output", EVIDENCE / (name + "-jsonld.json")], name + "-rendered", 150)
    if rendered.exists():
        run("parse_html.py", [rendered, "--url", url, "--json"], name + "-parsed", 60)
    for viewport in ("desktop", "mobile"):
        run("capture_screenshot.py", [url, "--viewport", viewport, "--output", SHOTS / (name + "-" + viewport), "--json"], name + "-screenshot-" + viewport, 120)

run("agentic_check.py", ["https://www.ckba.build/", "--json"], "agentic", 180)
run("agent_ux_check.py", ["https://www.ckba.build/", "--json"], "agent-ux", 150)

# Image tags may be absent while decorative CSS media and social cards exist.
# Build a bounded probe-only HTML artifact from observed rendered media URLs.
home = EVIDENCE / "home-rendered.html"
if home.exists():
    source = home.read_text(encoding="utf-8")
    found = re.findall(r'''(?:https?://[^\s"'<>\\]+|/(?:media|designer)/[^\s"'<>\\]+)\.(?:jpg|jpeg|png|webp|avif|svg)''', source)
    urls = list(dict.fromkeys(urljoin("https://www.ckba.build/", value) for value in found))[:8]
    save(EVIDENCE / "bounded-image-probe-manifest.json", {"max_images": 8, "observed_urls": urls, "scope": "CSS/media/social URLs observed in rendered HTML; not a claim these are img elements"})
    if urls:
        probe = EVIDENCE / "bounded-image-probe.html"
        probe.write_text("<!doctype html><html><body>" + "".join('<img alt="" role="presentation" src="' + html.escape(url, quote=True) + '">' for url in urls) + "</body></html>", encoding="utf-8")
        run("parse_html.py", [probe, "--url", "https://www.ckba.build/", "--probe-images", "--json"], "bounded-image-probes", 150)

# Domain rank lookup would stream a very large graph. --info is bounded metadata
# only and does not claim referring domains, rank or absence from the web graph.
run("commoncrawl_graph.py", ["--info", "--json"], "commoncrawl-info", 45)
save(EVIDENCE / "backlink-coverage.json", {"status": "insufficient_data", "numeric_backlink_score": None, "reason": "No authenticated backlink dataset; domain graph streaming omitted because the bundled domain CLI has no small byte budget. Metadata-only info probe is not a domain measurement."})
print("CKBA cloud specialist probes complete", flush=True)
