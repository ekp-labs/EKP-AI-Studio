import { RuntimeGraph } from './RuntimeGraph.js';
import { GraphNode, GraphEdge, GraphNodeType, GraphEdgeType } from '../types.js';

export class GraphQueries {
  private graph: RuntimeGraph;

  constructor(graph: RuntimeGraph) {
    this.graph = graph;
  }

  public findNodesByType(type: GraphNodeType): GraphNode[] {
    return this.graph.getAllNodes().filter((n) => n.type === type);
  }

  public findEdgesByType(type: GraphEdgeType): GraphEdge[] {
    return this.graph.getAllEdges().filter((e) => e.type === type);
  }

  public getAncestors(nodeId: string, depth = 3): GraphNode[] {
    const visited = new Set<string>();
    const ancestors: GraphNode[] = [];

    const traverse = (currentId: string, currentDepth: number) => {
      if (currentDepth > depth || visited.has(currentId)) return;
      visited.add(currentId);

      const edges = this.graph.getEdgesForNode(currentId);
      for (const edge of edges) {
        if (edge.targetId === currentId && edge.sourceId !== currentId) {
          const sourceNode = this.graph.getNode(edge.sourceId);
          if (sourceNode && !visited.has(sourceNode.id)) {
            ancestors.push(sourceNode);
            traverse(sourceNode.id, currentDepth + 1);
          }
        }
      }
    };

    traverse(nodeId, 1);
    return ancestors;
  }
}
