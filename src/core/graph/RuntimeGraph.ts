import { GraphNode, GraphEdge, GraphNodeType, GraphEdgeType, EventTopic, EpistemicStatus } from '../types.js';
import { EventBus } from '../kernel/EventBus.js';

export class RuntimeGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private eventBus?: EventBus;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus;
  }

  public addNode(node: Omit<GraphNode, 'createdAt' | 'updatedAt' | 'version'> & { version?: number; createdAt?: number; updatedAt?: number }): GraphNode {
    const now = Date.now();
    const fullNode: GraphNode = {
      ...node,
      version: node.version ?? 1,
      createdAt: node.createdAt ?? now,
      updatedAt: node.updatedAt ?? now,
    };

    this.nodes.set(fullNode.id, fullNode);
    if (this.eventBus) {
      this.eventBus.publish(EventTopic.NODE_CREATED, fullNode);
    }
    return fullNode;
  }

  public getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  public updateNode(id: string, updates: Partial<Omit<GraphNode, 'id' | 'createdAt'>>): GraphNode {
    const existing = this.nodes.get(id);
    if (!existing) {
      throw new Error(`[RuntimeGraph] Node ${id} not found for update`);
    }

    const updated: GraphNode = {
      ...existing,
      ...updates,
      version: existing.version + 1,
      updatedAt: Date.now(),
    };

    this.nodes.set(id, updated);
    return updated;
  }

  public addEdge(edge: Omit<GraphEdge, 'createdAt'> & { createdAt?: number }): GraphEdge {
    if (!this.nodes.has(edge.sourceId)) {
      throw new Error(`[RuntimeGraph] Cannot add edge: Source node ${edge.sourceId} does not exist`);
    }
    if (!this.nodes.has(edge.targetId)) {
      throw new Error(`[RuntimeGraph] Cannot add edge: Target node ${edge.targetId} does not exist`);
    }

    const fullEdge: GraphEdge = {
      ...edge,
      createdAt: edge.createdAt ?? Date.now(),
    };

    this.edges.set(fullEdge.id, fullEdge);
    if (this.eventBus) {
      this.eventBus.publish(EventTopic.EDGE_CREATED, fullEdge);
    }
    return fullEdge;
  }

  public getEdge(id: string): GraphEdge | undefined {
    return this.edges.get(id);
  }

  public getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  public getAllEdges(): GraphEdge[] {
    return Array.from(this.edges.values());
  }

  public getEdgesForNode(nodeId: string): GraphEdge[] {
    return Array.from(this.edges.values()).filter(
      (e) => e.sourceId === nodeId || e.targetId === nodeId
    );
  }

  public clear(): void {
    this.nodes.clear();
    this.edges.clear();
  }

  public loadState(nodes: GraphNode[], edges: GraphEdge[]): void {
    this.clear();
    for (const node of nodes) {
      this.nodes.set(node.id, node);
    }
    for (const edge of edges) {
      this.edges.set(edge.id, edge);
    }
  }
}
