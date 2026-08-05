"""GPE Research Swarm orchestrator (scaffold).

Loads config + prompts + source manifest and prepares the pipeline.
Does NOT read article contents and does NOT call any LLM yet — this is the
structural skeleton. Actual agent execution is wired once the user confirms
the framework/backend and gives the go-ahead to start reading sources."""
from __future__ import annotations
import os, json, sys

try:
    import yaml
except ImportError:
    yaml = None

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def load_config():
    cfg_path = os.path.join(ROOT, "06_orchestrator", "config.yaml")
    if yaml is None:
        raise SystemExit("PyYAML not installed. `pip install pyyaml`")
    with open(cfg_path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_manifest(cfg):
    with open(os.path.join(ROOT, cfg["paths"]["manifest"]), encoding="utf-8") as f:
        return json.load(f)


def main():
    cfg = load_config()
    manifest = load_manifest(cfg)
    print("=" * 64)
    print("GPE Research Swarm — scaffold status")
    print("=" * 64)
    print(f"Project : {cfg['project']}")
    print(f"Agents  : {len(cfg['agents'])}")
    print(f"Sources : {manifest['total_documents']} documents in {len(manifest['categories'])} categories")
    print(f"Pipeline: {' -> '.join(cfg['pipeline'])}")
    print(f"LLM     : {cfg['llm']['provider']} / {cfg['llm']['model']}  (awaiting user decision)")
    print("-" * 64)
    for a in cfg["agents"]:
        prompt_ok = os.path.exists(os.path.join(ROOT, a["prompt"]))
        print(f"  [{ 'OK' if prompt_ok else '??'}] {a['id']:<28} prompt={a['prompt']}")
    print("-" * 64)
    print("Phase: STRUCTURE ONLY. No articles read, no LLM calls made.")
    print("Next : awaiting user instructions to activate agents.")


if __name__ == "__main__":
    main()
