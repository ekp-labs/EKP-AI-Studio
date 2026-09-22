/**
 * Pluggable Domain Knowledge Libraries (Sample Data Only - Separated from Core Logic)
 * Invariant: Core logic has zero awareness of domain specifics.
 */

export interface SampleKnowledgeDocument {
  id: string;
  title: string;
  domain: string;
  sourceUri: string;
  markdownContent: string;
}

export const SAMPLE_DOMAIN_DOCUMENTS: SampleKnowledgeDocument[] = [
  {
    id: 'doc_embroidery_spec_01',
    title: 'Industrial Embroidery Tension & Stabilizer Protocol',
    domain: 'Embroidery',
    sourceUri: 'manual://textiles/embroidery-spec-v4.md',
    markdownContent: `# Industrial Embroidery Tension & Stabilizer Protocol

## Section 1: Thread Tension Calibration
Top thread tension is defined as the resistive force applied to the needle thread during the stitch cycle.
Top thread tension must be calibrated between 110gf and 130gf for 40wt Rayon thread on high-speed Tajima heads.
Bobbin thread tension must remain at 20gf to 25gf as measured with a TOWA gauge.
If top tension exceeds 140gf, thread breakage probability increases by 78% due to friction heating.

## Section 2: Stabilizer and Backing Matrix
Tearaway backing is a temporary non-woven cellulosic stabilizer suitable only for stable woven fabrics.
Cutaway backing is strictly required for knitwear, pique polo shirts, and elastic performance apparel.
Water-soluble topping (PVA film) must be used on terry cloth and fleece to prevent stitch sinking.

## Section 3: Stitch Density Invariants
Satin stitch column width must never fall below 1.0mm to avoid needle deflection.
Maximum satin stitch jump distance is 9.0mm before automatic split-stitch insertion is mandated.
Underlay stitching must always be laid prior to top embroidery fill to lock the fabric fibers.

## Section 4: Operational Safety Rules
Machine operators must pause spindle rotation before manual hoop re-clamping.
Decision: We chose polyester 40wt over rayon for workwear uniforms due to chlorine bleach resistance.
`
  },
  {
    id: 'doc_arch_patterns_01',
    title: 'Canonical Epistemic Knowledge Systems Specification',
    domain: 'Software Architecture',
    sourceUri: 'spec://architecture/canonical-ekp-v1.md',
    markdownContent: `# Canonical Epistemic Knowledge Systems Specification

## Section 1: Epistemic State & RuntimeGraph
The RuntimeGraph is defined as the directed epistemic graph representing nodes, temporal edges, provenance, and state mutations.
State changes must be represented as explicit graph operations or transactions rather than unobservable side-effects.
The Core must remain completely domain-agnostic; knowledge libraries must remain external data.

## Section 2: Separation of Reasoning and Execution
LLM reasoning must not directly mutate persistent system state or execute tools without authorization.
The reasoning engine receives context, formulates structured intentions, and delegates actions to the AgentEngine.
All consequential actions require explicit human-in-the-loop approval before execution.

## Section 3: Provenance & ADU Invariants
Every ingested knowledge statement must be deconstructed into Atomic Discourse Units (ADUs).
Each ADU must retain its source document identifier, line span, and extraction stage signature.
The system must be capable of tracing backwards from an executed state change to the source document ADU.
`
  },
  {
    id: 'doc_cognitive_philosophy_01',
    title: 'Epistemic Logic & Knowledge Justification Framework',
    domain: 'Cognitive Science',
    sourceUri: 'ref://cognitive-science/justified-belief.md',
    markdownContent: `# Epistemic Logic & Knowledge Justification Framework

## Section 1: Epistemic Status Hierarchy
Provisional knowledge refers to claims supported by single, uncorroborated observations.
Corroborated knowledge requires independent validation from at least two distinct sources.
Consolidated knowledge represents epistemic consensus across multi-source triangulated observations.

## Section 2: Conflict Resolution Principles
When contradictory claims are observed, the system must downgrade confidence and flag a dispute state.
Superseded knowledge retains historical provenance but is marked inactive for active reasoning plans.
`
  }
];
