# Epistemic Knowledge Platform (EKP) — Phase 5.2 Core Reconstruction & Hardening

EKP is a governed epistemic knowledge and reasoning engine engineered around **16 canonical architectural invariants**. The system enforces explicit human governance over consequential actions, complete provenance traceability from source documents to executed graph state, and decoupled persistence.

---

## Phase 5.2 Verified Repairs

### A. Real Separate-Process Persistence
- **Architecture**: Core domain → Repository contracts (`IRuntimeGraphRepository`, `IKnowledgeRepository`, `ICognitiveMemoryRepository`, `IAgentAuditRepository`) → Persistence Adapter (`IPersistenceAdapter` / `FileStorageAdapter`) → Local JSON files.
- **Genuine OS Process Restart**: Verified via isolated child processes (`Process A` ingests, reasons, executes, persists, and terminates; `Process B` boots clean, restores state from disk, and validates documents, ADUs, RuntimeGraph nodes/edges, knowledge retrieval, and lineage depth).

### B. Real Gemini 5000ms Timeout & Governance Preserved Fallback
- **Abortable Deadline**: Enforces an explicit 5000ms `AbortController` timeout deadline around Gemini network requests.
- **Automatic Fallback Policy**: Automatically falls back to `DeterministicEpistemicProvider` whenever Gemini experiences timeouts (>5000ms), network errors (`fetch failed`), HTTP 503 Service Unavailable, or missing API keys.
- **Strict Governance Preservation**: Reasoning outputs from both Gemini and fallback providers pass through `LLMReasoning` → `IntentionValidator` → `AgentEngine` (requiring explicit human approval for consequential tool executions).

---

## Architectural Invariants & Guarantees

1. **Governed Tool Execution**: Consequential actions require explicit human approval before execution. Tools cannot bypass `AgentEngine` governance.
2. **LLM Boundary**: The LLM reasoning layer formulates intentions; it **cannot directly mutate** `RuntimeGraph` or system state.
3. **UI Boundary**: The UI is a read/query facade; it **cannot directly mutate** Core state except through governed API boundaries via `ClientGateway`.
4. **Complete Provenance Traceability**: Every node, edge, and consolidated knowledge unit preserves complete source provenance (source URI, title, extraction stage, line numbers).
5. **Epistemic Status Progression**: Knowledge progresses through explicit states (`UNSUBSTANTIATED` → `CORROBORATED` → `CONTRADICTED` → `SUPERSEDED`).
6. **Provider Abstraction & Fallback**: Supports server-side Google Gemini (`@google/genai`) with automatic fallback to `DeterministicEpistemicProvider`.
7. **Secret Isolation**: `GEMINI_API_KEY` exists exclusively in server-side environment variables (`process.env.GEMINI_API_KEY`). It is never hardcoded, never sent to the browser, and never stored in `RuntimeGraph` or API payloads.
8. **Decoupled Persistence**: State persistence (`RuntimeGraph`, `KnowledgeLibrary`, `CognitiveMemory`, `AgentEngine` audit logs) is handled behind repository contracts (`IRuntimeGraphRepository`, `IKnowledgeRepository`, `ICognitiveMemoryRepository`, `IAgentAuditRepository`) using `IPersistenceAdapter` and `FileStorageAdapter`.

---

## Verification & Test Suites

```bash
npx tsx tests/run-all-tests.ts
```

### Test Coverage Summary

- **Core Invariants Suite** (`tests/run-all-tests.ts`): 16/16 Canonical Invariants Passed.
- **Persistence & Process Restart Suite** (`tests/persistence.test.ts` & `tests/process-persistence-worker.ts`): Separate OS process lifecycle state survival, document restoration, graph node/edge counts, knowledge retrieval, and provenance lineage post-reload.
- **Gemini Integration, Timeout & Fallback Suite** (`tests/gemini-integration.test.ts`): Controlled >5000ms timeout enforcement test, network failure fallback, HTTP 503 fallback, missing API key fallback, secret isolation verification, and live integration.
