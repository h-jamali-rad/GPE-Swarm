"""Base scaffold for a swarm agent. LLM wiring is intentionally left as a TODO
until the framework/backend is confirmed with the user."""
from __future__ import annotations
import os, json
from dataclasses import dataclass, field


@dataclass
class AgentContext:
    root: str
    config: dict
    shared: dict = field(default_factory=dict)  # cross-agent shared state


class BaseAgent:
    id: str = "base"

    def __init__(self, root: str, spec: dict, ctx: AgentContext):
        self.root = root
        self.spec = spec
        self.ctx = ctx
        self.prompt = self._load_prompt(spec.get("prompt"))
        self.output_dir = os.path.join(root, spec["output"]) if spec.get("output") else None

    def _load_prompt(self, rel):
        if not rel:
            return ""
        with open(os.path.join(self.root, rel), encoding="utf-8") as f:
            return f.read()

    def run(self, task_input: dict) -> dict:
        """Override in subclasses. Must NOT read article contents until the
        user explicitly authorizes reading (current phase: structure only)."""
        raise NotImplementedError(f"Agent '{self.id}' has no run() yet — awaiting task instructions.")
