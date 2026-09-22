/**
 * EKP Tool Registry Subsystem
 * Registers governed tools with explicit contracts, parameter schemas, and permission levels.
 */

import {
  ToolContract,
  ToolPermissionLevel,
  ExecutionContext,
  GraphNodeType,
  GraphEdgeType,
} from '../types';
import { RuntimeGraph } from '../graph/RuntimeGraph';
import { CognitiveMemory } from '../memory/CognitiveMemory';
import { KnowledgeLibrary } from '../library/KnowledgeLibrary';

export class ToolRegistry {
  private tools: Map<string, ToolContract> = new Map();

  constructor(
    graph?: RuntimeGraph,
    memory?: CognitiveMemory,
    library?: KnowledgeLibrary
  ) {
    this.registerDefaultTools(graph, memory, library);
  }

  public registerTool(tool: ToolContract): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ToolContract | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): ToolContract[] {
    return Array.from(this.tools.values());
  }

  private registerDefaultTools(
    graph?: RuntimeGraph,
    memory?: CognitiveMemory,
    library?: KnowledgeLibrary
  ): void {
    // 1. Inspect Knowledge (Read-Only)
    this.registerTool({
      name: 'inspect_knowledge',
      description: 'Perform read-only epistemic inspection of an ADU, document, or entity in the KnowledgeLibrary.',
      permissionLevel: ToolPermissionLevel.READ_ONLY,
      consequential: false,
      parameterSchema: {
        properties: {
          aduId: { type: 'string', description: 'The identifier of the ADU to inspect', required: false },
          documentId: { type: 'string', description: 'The identifier of the Document to inspect', required: false },
        },
        required: [],
      },
      execute: async (params: Record<string, any>) => {
        if (params.aduId && library) {
          const adu = library.getADU(params.aduId);
          return { found: Boolean(adu), adu };
        }
        if (params.documentId && library) {
          const doc = library.getDocument(params.documentId);
          return { found: Boolean(doc), doc };
        }
        return { message: 'No ID provided, returned library overview', stats: library?.getStats() };
      },
    });

    // 2. Compute Epistemic Metrics (Read-Only)
    this.registerTool({
      name: 'compute_epistemic_metrics',
      description: 'Compute epistemic graph connectivity, node density, and confidence averages.',
      permissionLevel: ToolPermissionLevel.READ_ONLY,
      consequential: false,
      parameterSchema: {
        properties: {
          includeNodes: { type: 'boolean', description: 'Whether to include node list summary', required: false },
        },
        required: [],
      },
      execute: async () => {
        const nodeCount = graph?.getNodeCount() || 0;
        const edgeCount = graph?.getEdgeCount() || 0;
        return {
          nodeCount,
          edgeCount,
          graphDensity: nodeCount > 1 ? Number((edgeCount / (nodeCount * (nodeCount - 1))).toFixed(4)) : 0,
          timestamp: new Date().toISOString(),
        };
      },
    });

    // 3. Create Epistemic Note / Scratchpad (Safe Mutation)
    this.registerTool({
      name: 'create_epistemic_note',
      description: 'Create an in-memory epistemic scratchpad note or observation attached to the graph.',
      permissionLevel: ToolPermissionLevel.SAFE_MUTATION,
      consequential: false,
      parameterSchema: {
        properties: {
          title: { type: 'string', description: 'Title of the epistemic note', required: true },
          body: { type: 'string', description: 'Body content of the note', required: true },
          tags: { type: 'array', description: 'Tags for categorization', required: false },
        },
        required: ['title', 'body'],
      },
      execute: async (params: Record<string, any>, ctx: ExecutionContext) => {
        const noteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        if (graph) {
          graph.addNode(
            noteId,
            GraphNodeType.CONCEPT,
            `[NOTE] ${params.title}`,
            {
              body: params.body,
              tags: params.tags || [],
              author: ctx.actor,
              intentionId: ctx.intentionId,
            },
            ctx.provenance
          );
        }
        return { noteId, title: params.title, status: 'CREATED' };
      },
    });

    // 4. Consolidate Epistemic Concept (Consequential Action - Requires Human Approval)
    this.registerTool({
      name: 'consolidate_epistemic_concept',
      description: 'Promote corroborated ADUs into a stable ConsolidatedKnowledgeUnit within CognitiveMemory and RuntimeGraph.',
      permissionLevel: ToolPermissionLevel.CONSEQUENTIAL,
      consequential: true,
      parameterSchema: {
        properties: {
          concept: { type: 'string', description: 'Name of the concept to consolidate', required: true },
          definition: { type: 'string', description: 'Consolidated definition or ground rule', required: true },
          supportingAduIds: { type: 'array', description: 'Array of supporting ADU identifiers', required: true },
          domain: { type: 'string', description: 'Domain namespace (e.g. Embroidery, Architecture)', required: true },
        },
        required: ['concept', 'definition', 'supportingAduIds', 'domain'],
      },
      execute: async (params: Record<string, any>, ctx: ExecutionContext) => {
        const adus = (params.supportingAduIds || [])
          .map((id: string) => library?.getADU(id))
          .filter(Boolean);

        let consolidatedUnit = null;
        if (memory) {
          consolidatedUnit = await memory.consolidateADUs(
            params.concept,
            params.definition,
            adus,
            params.domain,
            ctx.provenance
          );
        }

        if (graph && consolidatedUnit) {
          const conceptNodeId = `concept_${consolidatedUnit.id}`;
          graph.addNode(
            conceptNodeId,
            GraphNodeType.CONCEPT,
            `[CONSOLIDATED] ${params.concept}`,
            {
              definition: params.definition,
              status: consolidatedUnit.status,
              confidenceScore: consolidatedUnit.confidenceScore,
              domain: params.domain,
            },
            ctx.provenance
          );

          // Connect supporting ADUs
          for (const aduId of params.supportingAduIds) {
            if (graph.hasNode(aduId)) {
              graph.addEdge(
                conceptNodeId,
                aduId,
                GraphEdgeType.SUPPORTS,
                ctx.provenance,
                { label: 'Grounded In ADU' }
              );
            }
          }
        }

        return {
          status: 'CONSOLIDATED',
          unitId: consolidatedUnit?.id,
          concept: params.concept,
          epistemicStatus: consolidatedUnit?.status,
        };
      },
    });

    // 5. Calibrate Tension Parameter / Machine Setting (Consequential Action - Requires Human Approval)
    this.registerTool({
      name: 'calibrate_tension_parameter',
      description: 'Adjust and verify an operational domain parameter (e.g. Thread Tension calibration).',
      permissionLevel: ToolPermissionLevel.CONSEQUENTIAL,
      consequential: true,
      parameterSchema: {
        properties: {
          parameter: { type: 'string', description: 'Parameter name (e.g. Top Thread Tension)', required: true },
          targetValue: { type: 'number', description: 'Target numerical setting', required: true },
          unit: { type: 'string', description: 'Measurement unit (e.g. gf, mm, rpm)', required: true },
          reason: { type: 'string', description: 'Epistemic justification from source document', required: true },
          groundingAduId: { type: 'string', description: 'ADU ID providing the constraint ground truth', required: false },
        },
        required: ['parameter', 'targetValue', 'unit', 'reason'],
      },
      execute: async (params: Record<string, any>, ctx: ExecutionContext) => {
        const paramNodeId = `param_${params.parameter.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

        if (graph) {
          graph.addNode(
            paramNodeId,
            GraphNodeType.DECISION,
            `[CALIBRATION] ${params.parameter} = ${params.targetValue} ${params.unit}`,
            {
              parameter: params.parameter,
              targetValue: params.targetValue,
              unit: params.unit,
              reason: params.reason,
              calibratedAt: new Date().toISOString(),
              operator: ctx.actor,
            },
            ctx.provenance
          );

          if (params.groundingAduId && graph.hasNode(params.groundingAduId)) {
            graph.addEdge(
              paramNodeId,
              params.groundingAduId,
              GraphEdgeType.CONSTRAINS,
              ctx.provenance,
              { label: 'Calibrated from ADU Specification' }
            );
          } else if (ctx.provenance.parentProvenanceIds && ctx.provenance.parentProvenanceIds.length > 0) {
            for (const parentId of ctx.provenance.parentProvenanceIds) {
              if (graph.hasNode(parentId)) {
                graph.addEdge(
                  paramNodeId,
                  parentId,
                  GraphEdgeType.CONSTRAINS,
                  ctx.provenance,
                  { label: 'Calibrated from ADU Specification' }
                );
              }
            }
          }
        }

        return {
          status: 'APPLIED',
          parameter: params.parameter,
          appliedValue: `${params.targetValue} ${params.unit}`,
          appliedAt: new Date().toISOString(),
        };
      },
    });

    // 6. Mutate Runtime State (Consequential Action - Requires Human Approval)
    this.registerTool({
      name: 'mutate_runtime_state',
      description: 'Apply an explicit state transition or mutation to the RuntimeGraph.',
      permissionLevel: ToolPermissionLevel.CONSEQUENTIAL,
      consequential: true,
      parameterSchema: {
        properties: {
          nodeId: { type: 'string', description: 'Target node identifier to mutate', required: true },
          propertyUpdates: { type: 'object', description: 'Properties to update', required: true },
          justification: { type: 'string', description: 'Epistemic justification for mutation', required: true },
        },
        required: ['nodeId', 'propertyUpdates', 'justification'],
      },
      execute: async (params: Record<string, any>, ctx: ExecutionContext) => {
        if (!graph) throw new Error('RuntimeGraph not available');
        const node = graph.updateNodeProperties(params.nodeId, params.propertyUpdates, ctx.provenance);
        return {
          status: 'MUTATED',
          nodeId: node.id,
          version: node.version,
          updatedProperties: params.propertyUpdates,
        };
      },
    });
  }
}
