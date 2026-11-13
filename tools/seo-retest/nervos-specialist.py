"""Bounded Nervos specialist collection; original pinned launcher only.

Run after collect_evidence.py nervos --concurrency 1 has finished. Page content
is persisted as untrusted evidence, never interpreted as code or instructions.
No production writes, credential setup, UA matrix, or external graph downloads.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
from urllib.parse import urlsplit

TASK = Path(os.environ["SEO_TASK_ROOT"]).resolve()
OUTPUT = Path(os.environ["SEO_OUTPUT_ROOT"]).resolve()
TOOL = TASK / "tool"
LAUNCHER = TOOL / "scripts/claude-seo"
AUDIT = OUTPUT / "docs.nervos.org-audit"
EVIDENCE = AUDIT / "evidence"
DEST = EVIDENCE / "specialist"
DEST.mkdir(parents=True, exist_ok=True)
ENV = {**os.environ, "CLAUDE_SEO_DATA_DIR": os.environ["CLAUDE_SEO_DATA_DIR"]}
MANIFEST = []


def save(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run(name, script, args, timeout=180):
    # One bundled command process at a time. Scripts retain SSRF/network guards.
    time.sleep(1)
    target = DEST / (name + ".json")
    error = DEST / (name + ".stderr.log")
    started = time.time()
    result = {"name": name, "script": script, "args": [str(x) for x in args]}
    try:
        with target.open("w", encoding="utf-8") as out, error.open("w", encoding="utf-8") as err:
            proc = subprocess.run([str(LAUNCHER), "run", script, *map(str, args)], cwd=TOOL,
                                  env=ENV, stdout=out, stderr=err, timeout=timeout)
        result["exit_code"] = proc.returncode
    except subprocess.TimeoutExpired:
        result["error"] = "collector_timeout"
    result["elapsed_seconds"] = round(time.time() - started, 2)
    result["stdout"] = str(target.relative_to(AUDIT))
    result["stderr"] = str(error.relative_to(AUDIT))
    MANIFEST.append(result)
    save(DEST / "manifest.json", MANIFEST)
    print(json.dumps(result), flush=True)
    try:
        return json.loads(target.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return {}


crawl = json.loads((EVIDENCE / "crawl.json").read_text(encoding="utf-8"))
rows = [r for r in crawl["rows"] if r.get("status") == 200 and r.get("requested_url")]
home = "https://docs.nervos.org/"
docs = [r for r in rows if urlsplit(r["requested_url"]).path.startswith("/docs/")]


def select(tokens, excluded):
    options = [r for r in docs if r["requested_url"] not in excluded]
    return max(options, key=lambda r: (sum(t in ((r.get("title") or "") + " " + r["requested_url"]).lower() for t in tokens), min(r.get("word_count") or 0, 1500)), default=None)


# Representative selection is driven by fresh crawl, not prior audit/baseline.
chosen = []
for tokens in [("quick-start", "quick start", "getting-started", "how-ckb-works"),
               ("transaction-structure", "cell-model", "cell model", "tech-explanation", "rpc")]:
    row = select(tokens, {r["requested_url"] for r in chosen})
    if row:
        chosen.append(row)
pages = [("home", home)] + [("doc-" + str(i + 1), r["requested_url"]) for i, r in enumerate(chosen)]
save(DEST / "representative-pages.json", [{"id": k, "url": u} for k, u in pages])

run("lighthouse-agentic", "lighthouse_agentic.py", [home, "--strategy", "both", "--json"], timeout=420)
run("agentic-home", "agentic_check.py", [home, "--json"], timeout=360)
run("agent-ux-home", "agent_ux_check.py", [home, "--timeout-ms", "30000", "--json"], timeout=180)
run("transport", "transport_check.py", [home, "--timeout", "15", "--json"], timeout=180)
run("pagespeed-mobile", "pagespeed_check.py", [home, "--strategy", "mobile", "--json"], timeout=240)

for name, url in pages:
    html = DEST / (name + ".rendered.html")
    run("render-" + name, "render_page.py", [url, "--mode", "always", "--a11y-tree", "--timeout-ms", "30000", "--json", "--output", html, "--json-ld-output", DEST / (name + ".jsonld.json")], timeout=180)
    for viewport in ("desktop", "mobile"):
        shots = AUDIT / "screenshots" / name
        run("screenshot-" + name + "-" + viewport, "capture_screenshot.py", [url, "--viewport", viewport, "--output", shots, "--timeout", "30000", "--json"], timeout=120)
    # Existing crawl HTML prevents an unnecessary page fetch. Probes are bounded
    # by the original parser (50 unique images/page maximum, three pages).
    key = hashlib.sha256(url.encode()).hexdigest()[:20]
    original = EVIDENCE / "pages" / (key + ".html")
    if original.exists():
        run("image-probes-" + name, "parse_html.py", [original, "--url", url, "--probe-images", "--json"], timeout=300)
    if name != "home":
        run("agent-ux-" + name, "agent_ux_check.py", [url, "--timeout-ms", "30000", "--json"], timeout=180)

# Explicit bounded historical-route candidates; a 404 is not a current defect
# unless fresh internal-link or sitemap evidence shows the URL is promoted.
legacy = [
    "https://docs.nervos.org/docs/basics/introduction",
    "https://docs.nervos.org/docs/basics/guides/mainnet",
    "https://docs.nervos.org/docs/reference/rpc",
    "https://docs-old.nervos.org/",
    "https://docs-old.nervos.org/robots.txt",
]
# Also inspect up to two old-domain URLs actually linked by the current site.
for row in rows:
    for link in row.get("external_links") or []:
        url = link.get("href", "")
        if urlsplit(url).hostname == "docs-old.nervos.org" and url not in legacy and len(legacy) < 7:
            legacy.append(url)
for i, url in enumerate(legacy):
    html = DEST / ("legacy-" + str(i + 1) + ".html")
    data = run("legacy-" + str(i + 1), "fetch_page.py", [url, "--json", "--output", html], timeout=100)
    response_headers = {k.lower(): v for k, v in (data.get("headers") or {}).items()}
    if html.exists() and "text/html" in response_headers.get("content-type", ""):
        run("legacy-parsed-" + str(i + 1), "parse_html.py", [html, "--url", data.get("url") or url, "--json"], timeout=100)
save(DEST / "completion.json", {"completed_at_unix": time.time(), "pages": pages, "legacy_probes": legacy,
                                "process_concurrency": 1, "no_ua_matrix": True, "no_large_graph": True})
