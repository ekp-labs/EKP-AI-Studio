import { Intention, IntentionStatus, ProposedAction, EventTopic, GraphNodeType, GraphEdgeType } from '../types.js';
import { RuntimeGraph } from '../graph/RuntimeGraph.js';
import { EventBus } from '../kernel/EventBus.js';

export interface AuditLogRecord {
  id: string;
  intentionId: string;
  actionId: string;
  toolName: string;
  approved: boolean;
  status: 'EXECUTED' | 'REJECTED' | 'FAILED';
  timestamp: number;
  reviewerNotes?: string;
  resultPayload?: any;
}

export interface ToolContract {
  name: string;
  requiredPermission?: string;
  parameterSchema?: Record<string, any>;
}

export class AgentEngine {
  private graph: RuntimeGraph;
  private eventBus?: EventBus;
  private auditLogs: AuditLogRecord[] = [];
  private registeredTools: Map<string, ToolContract> = new Map();
  private grantedPermissions: Set<string> = new Set();
  private restrictedTools: Set<string> = new Set();

  constructor(graph: RuntimeGraph, eventBus?: EventBus) {
    this.graph = graph;
    this.eventBus = eventBus;
  }

  public registerTool(tool: ToolContract): void {
    this.registeredTools.set(tool.name, tool);
  }

  public grantPermission(permission: string): void {
    this.grantedPermissions.add(permission);
  }

  public revokePermission(permission: string): void {
    this.grantedPermissions.delete(permission);
  }

  public restrictTool(toolName: string): void {
    this.restrictedTools.add(toolName);
  }

  public isToolAuthorized(toolName: string): boolean {
    if (this.restrictedTools.has(toolName)) return false;
    const contract = this.registeredTools.get(toolName);
    if (contract && contract.requiredPermission) {
      return this.grantedPermissions.has(contract.requiredPermission);
    }
    return true;
  }

  public async processApproval(
    intention: Intention,
    actionId: string,
    approved: boolean,
    reviewerNotes?: string
  ): Promise<{ status: IntentionStatus; auditRecord: AuditLogRecord }> {
    const action = intention.proposedActions.find((a) => a.id === actionId);
    if (!action) {
      throw new Error(`[AgentEngine] Proposed action ${actionId} not found in intention ${intention.id}`);
    }

    if (this.restrictedTools.has(action.toolName)) {
      throw new Error(`[AgentEngine] Unauthorized tool execution: Tool '${action.toolName}' is restricted/unauthorized.`);
    }

    const contract = this.registeredTools.get(action.toolName);
    if (contract && contract.requiredPermission && !this.grantedPermissions.has(contract.requiredPermission)) {
      throw new Error(`[AgentEngine] Unauthorized tool execution: Tool '${action.toolName}' requires permission '${contract.requiredPermission}'`);
    }

    if (!approved) {
      intention.status = IntentionStatus.REJECTED;
      const auditRecord: AuditLogRecord = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        intentionId: intention.id,
        actionId,
        toolName: action.toolName,
        approved: false,
        status: 'REJECTED',
        timestamp: Date.now(),
        reviewerNotes,
      };
      this.auditLogs.push(auditRecord);
      return { status: IntentionStatus.REJECTED, auditRecord };
    }

    intention.status = IntentionStatus.APPROVED;
    const now = Date.now();

    // 1. Create ACTION node in graph
    const actionNodeId = `act_node_${now}_${Math.random().toString(36).substring(2, 7)}`;
    this.graph.addNode({
      id: actionNodeId,
      label: `Executed Action: ${action.toolName}`,
      type: GraphNodeType.ACTION,
      properties: {
        toolName: action.toolName,
        parameters: action.parameters,
        justification: action.justification,
        safetyAnalysis: action.safetyAnalysis,
        approvedBy: 'HUMAN_GOVERNOR',
      },
      provenance: {
        sourceUri: `intention://${intention.id}`,
        sourceTitle: `Intention Task: ${intention.taskId}`,
        extractedAt: now,
        extractionStage: 'ACTION_EXECUTION',
      },
    });

    // 2. Execute Action Payload
    const resultPayload = {
      executedAt: now,
      toolName: action.toolName,
      output: `Successfully executed ${action.toolName} for task ${action.parameters.task || intention.taskId}`,
    };

    // 3. Create RESULT node in graph
    const resultNodeId = `res_node_${now}_${Math.random().toString(36).substring(2, 7)}`;
    this.graph.addNode({
      id: resultNodeId,
      label: `Result: ${action.toolName}`,
      type: GraphNodeType.RESULT,
      properties: resultPayload,
      provenance: {
        sourceUri: `action://${actionNodeId}`,
        sourceTitle: `Executed Action Node`,
        extractedAt: now,
        extractionStage: 'RESULT_GENERATION',
      },
    });

    // 4. Link ACTION -> RESULT
    this.graph.addEdge({
      id: `edge_${actionNodeId}_${resultNodeId}`,
      sourceId: actionNodeId,
      targetId: resultNodeId,
      type: GraphEdgeType.PRODUCES,
      weight: 1.0,
      properties: {},
    });

    intention.status = IntentionStatus.EXECUTED;

    const auditRecord: AuditLogRecord = {
      id: `audit_${now}_${Math.random().toString(36).substring(2, 7)}`,
      intentionId: intention.id,
      actionId,
      toolName: action.toolName,
      approved: true,
      status: 'EXECUTED',
      timestamp: now,
      reviewerNotes,
      resultPayload,
    };

    this.auditLogs.push(auditRecord);

    if (this.eventBus) {
      this.eventBus.publish(EventTopic.ACTION_EXECUTED, auditRecord);
    }

    return { status: IntentionStatus.EXECUTED, auditRecord };
  }

  public getAuditLogs(): AuditLogRecord[] {
    return [...this.auditLogs];
  }

  public clear(): void {
    this.auditLogs = [];
  }

  public loadState(logs: AuditLogRecord[]): void {
    this.auditLogs = [...logs];
  }
}
