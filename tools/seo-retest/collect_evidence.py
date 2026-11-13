"""Collect production evidence exclusively through the pinned tool's launcher.

This stdlib orchestration script does not make HTTP requests itself. Run only
after explicit setup approval and successful managed-runtime initialization.
External page content is stored as evidence and is never executed.
"""
import argparse
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import subprocess
import threading
import time
from urllib.parse import urldefrag, urljoin, urlsplit
from urllib.robotparser import RobotFileParser

ROOT = Path(__file__).resolve().parent
TOOL = ROOT / "tool"
LAUNCHER = TOOL / "scripts/claude-seo"
ENV = {**os.environ, "CLAUDE_SEO_DATA_DIR": str(ROOT / "runtime")}
OUTPUT = Path(os.environ.get("SEO_OUTPUT_ROOT", str(ROOT.parents[1] / "outputs/seo-retest-2026-11-13")))
SITES = {"fiber": "https://www.fiber.world/", "nervos": "https://docs.nervos.org/", "ckba": "https://www.ckba.build/"}
LOCK = threading.Lock()
LAST_STARTED = {}


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def run(script, args, destination, timeout=100):
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8") as out, destination.with_suffix(".stderr.log").open("w", encoding="utf-8") as err:
        result = subprocess.run([str(LAUNCHER), "run", script, *map(str, args)], cwd=TOOL, env=ENV, stdout=out, stderr=err, timeout=timeout)
    try:
        value = json.loads(destination.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        value = {"error": "No valid JSON result", "exit_code": result.returncode}
    return value


def pace(host):
    with LOCK:
        pause = max(0, LAST_STARTED.get(host, 0) + 1 - time.monotonic())
        if pause:
            time.sleep(pause)
        LAST_STARTED[host] = time.monotonic()


def page(url, directory):
    host = urlsplit(url).hostname
    pace(host)
    key = hashlib.sha256(url.encode()).hexdigest()[:20]
    files = directory / "pages"
    files.mkdir(exist_ok=True)
    fetch_file = files / f"{key}.fetch.json"
    html_file = files / f"{key}.html"
    parsed_file = files / f"{key}.parsed.json"
    if fetch_file.exists() and parsed_file.exists():
        return json.loads(fetch_file.read_text()), json.loads(parsed_file.read_text()), key
    data = run("render_page.py", [url, "--mode", "auto", "--timeout-ms", "30000", "--json", "--output", html_file, "--json-ld-output", files / f"{key}.jsonld.json"], fetch_file)
    parsed = run("parse_html.py", [html_file, "--url", data.get("url") or url, "--json"], parsed_file) if html_file.exists() else {}
    return data, parsed, key


def eligible(url, host):
    try:
        target = urlsplit(url)
    except ValueError:
        return False
    if target.scheme not in {"http", "https"} or target.hostname != host or target.username or target.password:
        return False
    if target.query:  # Query URLs are recorded as links but excluded from page expansion.
        return False
    suffix = Path(target.path).suffix.lower()
    return suffix not in {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif", ".ico", ".mp4", ".webm", ".pdf", ".zip", ".gz", ".json", ".xml", ".txt", ".woff", ".woff2", ".css", ".js", ".wasm", ".yml", ".yaml"}


def crawl(site, concurrency=1):
    base = SITES[site]
    directory = OUTPUT / f"{urlsplit(base).hostname}-audit/evidence"
    directory.mkdir(parents=True, exist_ok=True)
    sitemap = run("sitemap_discovery.py", [base, "--expand", "--sample", "500", "--json"], directory / "sitemap.json", 300)
    robots = run("fetch_page.py", [urljoin(base, "/robots.txt"), "--json", "--output", directory / "robots.txt"], directory / "robots-fetch.json")
    if robots.get("error") or (robots.get("status_code") or 500) >= 500:
        raise RuntimeError(f"Cannot establish robots policy for {site}")
    policy = RobotFileParser()
    policy.parse((robots.get("content") or "").splitlines() if robots.get("status_code") == 200 else [])
    seeds = {base}
    for item in sitemap.get("expanded", {}).get("files", []):
        if item.get("valid"):
            seeds.update(item.get("sample_urls", []))
    pending = sorted(seeds, key=lambda u: (u != base, u))
    seen, rows, skipped = set(), [], []
    host = urlsplit(base).hostname
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:
        while pending and len(seen) < 500:
            batch = []
            while pending and len(batch) < concurrency and len(seen) < 500:
                url = urldefrag(pending.pop(0))[0]
                if url in seen:
                    continue
                seen.add(url)
                if not eligible(url, host) or not policy.can_fetch("*", url):
                    skipped.append(url)
                    continue
                batch.append(url)
            futures = [(url, pool.submit(page, url, directory)) for url in batch]
            for url, future in futures:
                try:
                    data, parsed, key = future.result()
                    if data.get("status_code") == 429:
                        time.sleep(30)
                        skipped.append("rate_limited:" + url)
                    redirects = data.get("redirect_chain") or []
                    row = {"requested_url": url, "final_url": data.get("url"), "status": data.get("status_code"), "error": data.get("error"), "key": key, "redirects": redirects, "more_than_3_redirects": len(redirects) > 3, "title": parsed.get("title"), "description": parsed.get("meta_description"), "canonical": parsed.get("canonical"), "robots": parsed.get("meta_robots"), "h1": parsed.get("h1"), "h2": parsed.get("h2"), "word_count": parsed.get("word_count"), "open_graph": parsed.get("open_graph"), "twitter": parsed.get("twitter_card"), "hreflang": parsed.get("hreflang"), "images": parsed.get("images"), "schema": parsed.get("schema"), "schema_invalid": parsed.get("schema_invalid"), "internal_links": parsed.get("links", {}).get("internal", []), "external_links": parsed.get("links", {}).get("external", []), "extracted_text": data.get("extracted_text"), "publication_date": data.get("publication_date"), "is_spa": data.get("is_spa"), "render_engine": data.get("render_engine"), "headers": data.get("headers")}
                    rows.append(row)
                    if len(redirects) <= 3 and data.get("status_code") == 200:
                        pending.extend(urldefrag(link["href"])[0] for link in row["internal_links"] if eligible(link.get("href", ""), host))
                    print(json.dumps({"site": site, "pages": len(rows), "status": row["status"], "url": url}), flush=True)
                except Exception as exc:
                    rows.append({"requested_url": url, "error": str(exc)})
                write(directory / "crawl.json", {"site": site, "base": base, "completed_pages": len(rows), "max_pages": 500, "concurrency": concurrency, "delay_seconds": 1, "query_expansion": False, "skipped": skipped, "rows": rows})
    metadata = [{"url": r["requested_url"], "title": r.get("title") or "", "description": r.get("description") or ""} for r in rows if r.get("status") == 200]
    write(directory / "metadata-pairs.json", metadata)
    run("metadata_template.py", ["--pairs-file", directory / "metadata-pairs.json", "--json"], directory / "metadata-template.json")
    return directory


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("site", choices=SITES)
    parser.add_argument("--concurrency", type=int, choices=[1, 2, 3, 4, 5], default=1)
    args = parser.parse_args()
    crawl(args.site, args.concurrency)
