import { ClientGateway } from '../src/core/gateway/ClientGateway.js';
import { EventBus } from '../src/core/kernel/EventBus.js';
import { RuntimeGraph } from '../src/core/graph/RuntimeGraph.js';
import { CognitiveMemory } from '../src/core/memory/CognitiveMemory.js';
import { MarkdownAST } from '../src/core/ingestion/MarkdownAST.js';
import { ADUExtractor } from '../src/core/ingestion/ADUExtractor.js';
import { IntentionValidator } from '../src/core/reasoning/IntentionContracts.js';
import { AgentEngine } from '../src/core/agent/AgentEngine.js';
import {
  EventTopic,
  GraphNodeType,
  GraphEdgeType,
  EpistemicStatus,
  IntentionStatus,
  DocumentRecord,
} from '../src/core/types.js';
import { runGeminiIntegrationTests } from './gemini-integration.test.js';
import { runPersistenceTests } from './persistence.test.js';
import { runPhase6AIngestionTests } from './phase6a-ingestion.test.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

async function runCanonicalInvariants(): Promise<{ passed: number; total: number }> {
  console.log('\n============================================================');
  console.log('EKP CANONICAL ARCHITECTURAL TEST SUITE');
  console.log('Validating 16 Core Epistemic Invariants');
  console.log('============================================================\n');

  let passed = 0;
  const total = 16;

  // -------------------------------------------------------------------------
  // Invariant 1: EventBus can publish and subscribe to explicit topics
  // -------------------------------------------------------------------------
  try {
    const bus = new EventBus();
    let docReceived = false;
    let nodeReceived = false;

    const unsubDoc = bus.subscribe(EventTopic.DOCUMENT_INGESTED, (data) => {
      docReceived = data.title === 'Test Doc';
    });
    const unsubNode = bus.subscribe(EventTopic.NODE_CREATED, (data) => {
      nodeReceived = data.id === 'node_1';
    });

    bus.publish(EventTopic.DOCUMENT_INGESTED, { title: 'Test Doc' });
    bus.publish(EventTopic.NODE_CREATED, { id: 'node_1' });

    assert(docReceived, 'EventBus failed to trigger subscriber for DOCUMENT_INGESTED');
    assert(nodeReceived, 'EventBus failed to trigger subscriber for NODE_CREATED');

    unsubDoc();
    docReceived = false;
    bus.publish(EventTopic.DOCUMENT_INGESTED, { title: 'Test Doc' });
    assert(!docReceived, 'EventBus failed to unsubscribe callback');

    console.log('  [PASS] Test 1: EventBus can publish and subscribe to explicit topics');
    passed++;
  } catch (err: any) {
    console.error('  [FAIL] Test 1: EventBus test failed:', err.message);
  }

  // -------------------------------------------------------------------------
  // Invariant 2: RuntimeGraph can create nodes and relationships
  // -------------------------------------------------------------------------
  try {
    const graph = new RuntimeGraph();
    const docNode = graph.addNode({
      id: 'doc_node_1',
      label: 'Document Node 1',
      type: GraphNodeType.DOCUMENT,
      properties: { domain: 'Aerospace' },
    });
    const aduNode = graph.addNode({
      id: 'adu_node_1',
      label: 'ADU Node 1',
      type: GraphNodeType.ADU,
      properties: { content: '100Hz Calibration' },
    });

    const edge = graph.addEdge({
      id: 'edge_1',
      sourceId: aduNode.id,
      targetId: docNode.id,
      type: GraphEdgeType.EXTRACTED_FROM,
      weight: 1.0,
      properties: {},
    });

    assert(graph.getNode('doc_node_1')?.type === GraphNodeType.DOCUMENT, 'RuntimeGraph failed to retrieve created doc node');
    assert(graph.getEdge('edge_1')?.sourceId === 'adu_node_1', 'RuntimeGraph failed to retrieve created edge');
    assert(graph.getEdgesForNode('adu_node_1').length === 1, 'RuntimeGraph failed getEdgesForNode');
    assert(docNode.version === 1, 'Initial node version must be 1');

    console.log('  [PASS] Test 2: RuntimeGraph can create nodes and relationships');
    passed++;
  } catch (err: any) {
    console.error('  [FAIL] Test 2: RuntimeGraph test failed:', err.message);
  }

  // -------------------------------------------------------------------------
  // Invariant 3: RuntimeGraph strictly preserves node and edge provenance
  // -------------------------------------------------------------------------
  try {
    const graph = new RuntimeGraph();
    const node = graph.addNode({
      id: 'prov_node_1',
      label: 'Provenanced Node',
      type: GraphNodeType.CONCEPT,
      properties: {},
      provenance: {
        sourceUri: 'spec://v1.0',
        sourceTitle: 'Pressure Manual',
        extractedAt: 1700000000000,
        extractionStage: 'STAGE_1',
        startLine: 12,
        endLine: 24,
      },
    });

    const targetNode = graph.addNode({
      id: 'prov_node_2',
      label: 'Target Node',
      type: GraphNodeType.CONCEPT,
      properties: {},
    });

    const edge = graph.addEdge({
      id: 'prov_edge_1',
      sourceId: node.id,
      targetId: targetNode.id,
      type: GraphEdgeType.SUBSTANTIATES,
      weight: 0.9,
      properties: {},
      provenance: {
        sourceUri: 'spec://v1.0',
        sourceTitle: 'Pressure Manual',
        extractedAt: 1700000000000,
        extractionStage: 'STAGE_EDGE',
        startLine: 12,
        endLine: 24,
      },
    });

    const retrievedNode = graph.getNode('prov_node_1');
    assert(Boolean(retrievedNode?.provenance), 'Node provenance record missing');
    assert(retrievedNode!.provenance!.sourceUri === 'spec://v1.0', 'Node provenance sourceUri mismatch');
    assert(retrievedNode!.provenance!.startLine === 12, 'Node provenance startLine mismatch');
    assert(retrievedNode!.provenance!.endLine === 24, 'Node provenance endLine mismatch');

    const retrievedEdge = graph.getEdge('prov_edge_1');
    assert(Boolean(retrievedEdge?.provenance), 'Edge provenance record missing');
    assert(retrievedEdge!.provenance!.extractionStage === 'STAGE_EDGE', 'Edge provenance extractionStage mismatch');

    console.log('  [PASS] Test 3: RuntimeGraph strictly preserves node and edge provenance');
    passed++;
  } catch (err: any) {
    console.error('  [FAIL] Test 3: RuntimeGraph provenance test failed:', err.message);
  }

  // -------------------------------------------------------------------------
  // Invariant 4: RuntimeGraph supports controlled versioned state mutation
  // -------------------------------------------------------------------------
  try {
    const graph = new RuntimeGraph();
    const initialNode = graph.addNode({
      id: 'mut_node_1',
      label: 'Initial Label',
      type: GraphNodeType.CONCEPT,
      properties: { state: 'RAW' },
    });
    assert(initialNode.version === 1, 'Initial node version must be 1');

    const updatedNode1 = graph.updateNode('mut_node_1', {
      label: 'Updated Label V2',
      properties: { state: 'VERIFIED' },
    });
    assert(updatedNode1.version === 2, 'Updated node version must be 2');
    assert(updatedNode1.label === 'Updated Label V2', 'Node label not updated');
    assert(updatedNode1.properties.state === 'VERIFIED', 'Node properties not updated');

    const updatedNode2 = graph.updateNode('mut_node_1', {
      label: 'Updated Label V3',
    });
    assert(updatedNode2.version === 3, 'Updated node version must be 3');
    assert(updatedNode2.createdAt === initialNode.createdAt, 'createdAt must remain immutable');

    console.log('  [PASS] Test 4: RuntimeGraph supports controlled versioned state mutation');
    passed++;
  } catch (err: any) {
    console.error('  [FAIL] Test 4: Versioned mutation test failed:', err.message);
  }

  // -------------------------------------------------------------------------
  // Invariant 5: CognitiveMemory consolidates knowledge and calculates epistemic status
  // -------------------------------------------------------------------------
  try {
    const bus = new EventBus();
    const memory = new CognitiveMemory(bus);

    let statusChangedEventFired = false;
    bus.subscribe(EventTopic.EPISTEMIC_STATUS_CHANGED, (unit) => {
      if (unit.id && unit.status === EpistemicStatus.CONTRADICTED) {
        statusChangedEventFired = true;
      }
    });

    const unbackedUnit = memory.registerUnit('Unbacked Hypothesis', []);
    assert(unbackedUnit.status === EpistemicStatus.UNSUBSTANTIATED, 'Unit without ADUs must be UNSUBSTANTIATED');
    assert(unbackedUnit.confidence === 0.5, 'Unsubstantiated confidence must be 0.5');

    const backedUnit = memory.registerUnit('Supported Claim', ['adu_100']);
    assert(backedUnit.status === EpistemicStatus.CORROBORATED, 'Unit with ADUs must be CORROBORATED');
    assert(backedUnit.confidence === 0.85, 'Corroborated confidence must be 0.85');

    const updatedUnit = memory.updateEpistemicStatus(backedUnit.id, EpistemicStatus.CONTRADICTED);
    assert(updatedUnit.status === EpistemicStatus.CONTRADICTED, 'Epistemic status not updated');
    assert(statusChangedEventFired, 'EPISTEMIC_STATUS_CHANGED event not published on update');

    console.log('  [PASS] Test 5: CognitiveMemory consolidates knowledge and calculates epistemic status');
    passed++;
  } catch (err: any) {
    console.error('  [FAIL] Test 5: CognitiveMemory test failed:', err.message);
  }

  // -------------------------------------------------------------------------
  // Invariant 6: Markdown can be transformed into structured AST blocks with line ranges
  // -------------------------------------------------------------------------
  try {
    const mdText = `# Section Header\n\nThis is a paragraph statement on line 3.\n\n- List item 1 on line 5\n- List item 2 on line 6`;
    const blocks = MarkdownAST.parse(mdText);

    assert(blocks.length === 4, `Expected 4 AST blocks, got ${blocks.length}`);
    assert(blocks[0].type === 'heading' && blocks[0].level === 1, 'AST block 0 must be heading level 1');
    assert(blocks[0].startLine === 1 && blocks[0].endLine === 1, 'AST heading line range mismatch');
    assert(blocks[1].type === 'paragraph' && blocks[1].content.includes('paragraph statement'), 'AST block 1 must be paragraph');
    assert(blocks[1].startLine === 3 && blocks[1].endLine === 3, 'AST paragraph line range mismatch');
    assert(blocks[2].type === 'list_item' && blocks[2].content.includes('List item 1'), 'AST block 2 must be list item 1');
    assert(blocks[3].type === 'list_item' && blocks[3].content.includes('List item 2'), 'AST block 3 must be list item 2');

    console.log('  [PASS] Test 6: Markdown transformed into structured AST blocks with line ranges');
    passed++;
  } catch (err: any) {
    console.error('  [FAIL] Test 6: MarkdownAST test failed:', err.message);
  }

  // -------------------------------------------------------------------------
  // Invariant 7: ADUs retain source document provenance and line numbers
  // -------------------------------------------------------------------------
  try {
    const docRecord: DocumentRecord = {
      id: 'doc_spec_99',
      title: 'Safety Valve Operational Spec',
      domain: 'Aerospace',
      sourceUri: 'file:///specs/valve.md',
      content: '# Pressure Requirements\n- Calibration frequency must be kept under 100Hz.\n- Requires safety inspection.',
      ingestedAt: Date.now(),
    };

    const adus = ADUExtractor.extractFromDocument(docRecord);
    assert(adus.length >= 2, `Expected at least 2 ADUs, got ${adus.length}`);

    const reqAdu = adus.find((a) => a.content.includes('100Hz'));
    assert(Boolean(reqAdu), 'Requirement ADU not extracted');
    assert(reqAdu!.type === 'REQUIREMENT', `Expected type REQUIREMENT, got ${reqAdu!.type}`);
    assert(reqAdu!.documentId === 'doc_spec_99', 'ADU documentId mismatch');
    assert(reqAdu!.provenance.sourceUri === 'file:///specs/valve.md', 'ADU provenance sourceUri mismatch');
    assert(reqAdu!.provenance.sourceTitle === 'Safety Valve Operational Spec', 'ADU provenance sourceTitle mismatch');
    assert(typeof reqAdu!.startLine === 'number' && reqAdu!.startLine > 0, 'ADU startLine invalid');
    assert(typeof reqAdu!.endLine === 'number' && reqAdu!.endLine >= reqAdu!.startLine, 'ADU endLine invalid');

    console.log('  [PASS] Test 7: ADUs retain source document provenance and line numbers');
    passed++;
  } catch (err: any) {
    console.error('  [FAIL] Test 7: ADUExtractor test failed:', err.message);
  }

  // -------------------------------------------------------------------------
  // Invariant 8: KnowledgeRetrieval ranks relevance and assembles context with lineage
  // -------------------------------------------------------------------------
  try {
    const gateway = new ClientGateway({ autoPersist: false });
    await gateway.ingestDocument({
      title: 'Aerospace Valve Manual',
      domain: 'Aerospace',
      content: '# Calibration\nCalibration frequency must be kept under 100Hz for high pressure valves.',
    });
    await gateway.ingestDocument({
      title: 'Software UI Standards',
      domain: 'Software',
      content: '# Layout Rules\nButtons should have padding.',
    });

    const context = gateway.retrieval.retrieve('Calibration frequency 100Hz', 'Aerospace');
    assert(context.items.length >= 1, 'Knowledge retrieval returned zero items');
    assert(context.items[0].relevanceScore > 0.5, 'Top context item relevance score too low');
    assert(context.items[0].adu.content.includes('100Hz'), 'Top retrieved item content mismatch');
    assert(Boolean(context.items[0].adu.provenance.sourceTitle), 'Retrieved context lineage missing provenance sourceTitle');

    console.log('  [PASS] Test 8: KnowledgeRetrieval ranks relevance and assembles context with lineage');
    passed++;
  } catch (err: any) {
    console.error('  [FAIL] Test 8: KnowledgeRetrieval test failed:', err.message);
  }

  // -------------------------------------------------------------------------
  // Invariant 9: LLMReasoning produces a structured intention grounded in context
  // -------------------------------------------------------------------------
  try {
    const gateway = new ClientGateway({ autoPersist: false });
    await gateway.ingestDocument({
      title: 'Pressure Specs',
      domain: 'Aerospace',
      content: '# Rules\n- Calibrate regulator under 100Hz.',
    });

    const reasoning = await gateway.submitReasoningTask({
      prompt: 'Calibrate pressure regulator to 100Hz',
      domain: 'Aerospace',
    });

    const int = reasoning.intention;
    assert(Boolean(int && int.id), 'Reasoning failed to return valid Intention object');
    assert(Array.isArray(int.cognitiveAnalysis.problemDecomposition), 'Problem decomposition must be an array');
    assert(typeof int.cognitiveAnalysis.confidenceAssessment === 'number', 'Confidence assessment missing');
    assert(int.proposedActions.length > 0, 'Intention proposedActions must not be empty');
    assert(Boolean(int.proposedActions[0].toolName), 'Proposed action toolName missing');

    console.log('  [PASS] Test 9: LLMReasoning produces a structured intention grounded in context');
    passed++;
  } catch (err: any) {
    console.error('  [FAIL] Test 9: LLMReasoning test failed:', err.message);
  }

  // -------------------------------------------------------------------------
  // Invariant 10: IntentionValidator strictly rejects invalid or malformed intentions
  // -------------------------------------------------------------------------
  try {
    let rejectedNull = false;
    try {
      IntentionValidator.validateAndFormulate(null, 'task_1', 'domain');
    } catch {
      rejectedNull = true;
    }
    assert(rejectedNull, 'IntentionValidator failed to reject null output');

    let rejectedString = false;
    try {
      IntentionValidator.validateAndFormulate('invalid string output', 'task_1', 'domain');
    } catch {
      rejectedString = true;
    }
    assert(rejectedString, 'IntentionValidator failed to reject non-object string output');

    const normalized = IntentionValidator.validateAndFormulate(
      {
        problemDecomposition: 'Single string line',
        confidenceAssessment: 1.8,
      },
      'task_2',
      'domain'
    );
    assert(Array.isArray(normalized.cognitiveAnalysis.problemDecomposition), 'IntentionValidator failed to normalize problemDecomposition');
    assert(normalized.cognitiveAnalysis.confidenceAssessment <= 1.0, 'IntentionValidator failed to clamp confidence <= 1.0');

    console.log('  [PASS] Test 10: IntentionValidator strictly rejects invalid or malformed intentions');
    passed++;
  } catch (err: any) {
    console.error('  [FAIL] Test 10: IntentionValidator test failed:', err.message);
  }

  // -------------------------------------------------------------------------
  // Invariant 11: AgentEngine enforces tool contracts and registered permissions
  // -------------------------------------------------------------------------
  try {
    const graph = new RuntimeGraph();
    const agent = new AgentEngine(graph);

    agent.registerTool({
      name: 'restricted_system_tool',
      requiredPermission: 'EXECUTE_RESTRICTED',
    });

    const intention = IntentionValidator.validateAndFormulate(
      {
        proposedActions: [
          {
            id: 'act_perm_1',
            toolName: 'restricted_system_tool',
            parameters: {},
            isConsequential: true,
          },
        ],
      },
      'task_perm',
      'Aerospace'
    );

    let permissionBlocked = false;
    try {
      await agent.processApproval(intention, 'act_perm_1', true);
    } catch (err: any) {
      if (err.message.includes('Unauthorized tool execution')) {
        permissionBlocked = true;
      }
    }
    assert(permissionBlocked, 'AgentEngine failed to block execution of tool missing required permission');

    agent.grantPermission('EXECUTE_RESTRICTED');
    const result = await agent.processApproval(intention, 'act_perm_1', true);
    assert(result.status === IntentionStatus.EXECUTED, 'AgentEngine failed to execute tool after permission granted');

    console.log('  [PASS] Test 11: AgentEngine enforces tool contracts and registered permissions');
    passed++;
  } catch (err: any) {
    console.error('  [FAIL] Test 11: Tool contracts & permission test failed:', err.message);
  }

  // -------------------------------------------------------------------------
  // Invariant 12: Unauthorized tools cannot be executed by AgentEngine
  // -------------------------------------------------------------------------
  try {
    const graph = new RuntimeGraph();
    const agent = new AgentEngine(graph);

    agent.restrictTool('prohibited_destructive_cmd');

    const intention = IntentionValidator.validateAndFormulate(
      {
        proposedActions: [
          {
            id: 'act_forbidden_1',
            toolName: 'prohibited_destructive_cmd',
            parameters: {},
            isConsequential: true,
          },
        ],
      },
      'task_unauth',
      'Security'
    );

    let unauthorizedBlocked = false;
    try {
      await agent.processApproval(intention, 'act_forbidden_1', true);
    } catch (err: any) {
      if (err.message.includes('Unauthorized tool execution')) {
        unauthorizedBlocked = true;
      }
    }
    assert(unauthorizedBlocked, 'AgentEngine failed to block execution of restricted/unauthorized tool');

    console.log('  [PASS] Test 12: Unauthorized tools cannot be executed by AgentEngine');
    passed++;
  } catch (err: any) {
    console.error('  [FAIL] Test 12: Unauthorized tool test failed:', err.message);
  }

  // -------------------------------------------------------------------------
  // Invariant 13: Consequential actions are paused awaiting human approval
  // -------------------------------------------------------------------------
  try {
    const gateway = new ClientGateway({ autoPersist: false });
    const reasoning = await gateway.submitReasoningTask({
      prompt: 'Calibrate pressure regulator to 100Hz',
      domain: 'Aerospace',
    });

    const intention = reasoning.intention;
    assert(intention.status === IntentionStatus.AWAITING_APPROVAL, 'Consequential intention must be initialized to AWAITING_APPROVAL');

    const rejectedResult = await gateway.processActionApproval({
      intentionId: intention.id,
      actionId: intention.proposedActions[0].id,
      approved: false,
      reviewerNotes: 'Safety boundary check failed',
    });

    assert(rejectedResult.status === IntentionStatus.REJECTED, 'Action disapproval failed to set REJECTED status');
    assert(gateway.agent.getAuditLogs().some((log) => log.status === 'REJECTED'), 'Audit log missing REJECTED record');

    console.log('  [PASS] Test 13: Consequential actions are paused awaiting human approval');
    passed++;
  } catch (err: any) {
    console.error('  [FAIL] Test 13: Human approval gating test failed:', err.message);
  }

  // -------------------------------------------------------------------------
  // Invariant 14: LLM Reasoning cannot directly mutate RuntimeGraph without governed execution
  // -------------------------------------------------------------------------
  try {
    const gateway = new ClientGateway({ autoPersist: false });
    const initialNodeCount = gateway.graph.getAllNodes().length;

    await gateway.submitReasoningTask({
      prompt: 'Propose safety override procedure',
      domain: 'Aerospace',
    });

    const nodeCountAfterReasoning = gateway.graph.getAllNodes().length;
    assert(nodeCountAfterReasoning === initialNodeCount, 'LLM Reasoning mutated RuntimeGraph directly without governed execution!');

    console.log('  [PASS] Test 14: LLM Reasoning cannot directly mutate RuntimeGraph without governed execution');
    passed++;
  } catch (err: any) {
    console.error('  [FAIL] Test 14: Graph mutability isolation test failed:', err.message);
  }

  // -------------------------------------------------------------------------
  // Invariant 15: Executed action creates traceable ACTION and RESULT nodes in RuntimeGraph
  // -------------------------------------------------------------------------
  try {
    const gateway = new ClientGateway({ autoPersist: false });
    const reasoning = await gateway.submitReasoningTask({
      prompt: 'Calibrate pressure regulator',
      domain: 'Aerospace',
    });

    const initialNodes = gateway.graph.getAllNodes().length;
    await gateway.processActionApproval({
      intentionId: reasoning.intention.id,
      actionId: reasoning.intention.proposedActions[0].id,
      approved: true,
      reviewerNotes: 'Approved for execution',
    });

    const nodesAfter = gateway.graph.getAllNodes();
    assert(nodesAfter.length === initialNodes + 2, `Expected node count to increase by 2, got ${nodesAfter.length - initialNodes}`);

    const actionNode = nodesAfter.find((n) => n.type === GraphNodeType.ACTION);
    assert(Boolean(actionNode), 'ACTION node missing from RuntimeGraph');
    assert(actionNode!.properties.approvedBy === 'HUMAN_GOVERNOR', 'ACTION node missing approvedBy metadata');

    const resultNode = nodesAfter.find((n) => n.type === GraphNodeType.RESULT);
    assert(Boolean(resultNode), 'RESULT node missing from RuntimeGraph');

    const edges = gateway.graph.getEdgesForNode(actionNode!.id);
    const producesEdge = edges.find((e) => e.type === GraphEdgeType.PRODUCES);
    assert(Boolean(producesEdge), 'PRODUCES edge connecting ACTION -> RESULT node missing');
    assert(producesEdge!.targetId === resultNode!.id, 'PRODUCES edge target mismatch');

    console.log('  [PASS] Test 15: Executed action creates traceable ACTION and RESULT nodes in RuntimeGraph');
    passed++;
  } catch (err: any) {
    console.error('  [FAIL] Test 15: Action & Result node creation test failed:', err.message);
  }

  // -------------------------------------------------------------------------
  // Invariant 16: Full End-to-End Pipeline: Traceability from Source Document to Executed Action State
  // -------------------------------------------------------------------------
  try {
    const gateway = new ClientGateway({ autoPersist: false });

    // Step 1: Ingest Document
    const doc = await gateway.ingestDocument({
      title: 'E2E Aerospace Protocol',
      domain: 'Aerospace',
      content: '# Sensor Calibration\nCalibration frequency must be kept under 100Hz.',
      sourceUri: 'file:///e2e/protocol.md',
    });

    // Step 2: Knowledge Retrieval
    const context = gateway.retrieval.retrieve('Calibration frequency 100Hz', 'Aerospace');
    assert(context.items.length >= 1, 'E2E retrieval failed');

    // Step 3: Governed Reasoning
    const reasoning = await gateway.submitReasoningTask({
      prompt: 'Calibrate pressure regulator to 100Hz',
      domain: 'Aerospace',
    });
    assert(reasoning.intention.status === IntentionStatus.AWAITING_APPROVAL, 'E2E intention status invalid');

    // Step 4: Governed Execution
    const actionResult = await gateway.processActionApproval({
      intentionId: reasoning.intention.id,
      actionId: reasoning.intention.proposedActions[0].id,
      approved: true,
      reviewerNotes: 'E2E Approval',
    });
    assert(actionResult.status === IntentionStatus.EXECUTED, 'E2E execution failed');

    // Step 5: Complete Traceability Audit
    const allNodes = gateway.graph.getAllNodes();
    const docNode = allNodes.find((n) => n.type === GraphNodeType.DOCUMENT);
    const aduNode = allNodes.find((n) => n.type === GraphNodeType.ADU);
    const actNode = allNodes.find((n) => n.type === GraphNodeType.ACTION);
    const resNode = allNodes.find((n) => n.type === GraphNodeType.RESULT);

    assert(Boolean(docNode && aduNode && actNode && resNode), 'E2E graph node chain incomplete');
    assert(docNode!.label === 'E2E Aerospace Protocol', 'E2E doc node title mismatch');
    assert(aduNode!.provenance?.sourceUri === 'file:///e2e/protocol.md', 'E2E ADU provenance sourceUri broken');
    assert(Boolean(actNode!.provenance?.sourceUri && actNode!.provenance.sourceUri.includes(reasoning.intention.id)), 'E2E ACTION node provenance link broken');
    assert(Boolean(resNode!.provenance?.sourceUri && resNode!.provenance.sourceUri.includes(actNode!.id)), 'E2E RESULT node provenance link broken');

    console.log('  [PASS] Test 16: Full End-to-End Pipeline: Traceability from Source Document to Executed Action State');
    passed++;
  } catch (err: any) {
    console.error('  [FAIL] Test 16: End-to-end pipeline test failed:', err.message);
  }

  console.log('\n============================================================');
  console.log(`CORE INVARIANTS TEST SUMMARY: ${passed}/${total} PASSED (${total - passed} FAILED)`);
  console.log('============================================================\n');

  return { passed, total };
}

async function main() {
  const invariantsResult = await runCanonicalInvariants();
  const phase6aPassed = await runPhase6AIngestionTests();
  const geminiResult = await runGeminiIntegrationTests();
  const persistencePassed = await runPersistenceTests();

  console.log('============================================================');
  console.log('EKP SYSTEM TEST SUITE OVERALL SUMMARY');
  console.log('============================================================');
  console.log(`Canonical Invariants : ${invariantsResult.passed}/${invariantsResult.total} PASSED`);
  console.log(`Phase 6A Local Engine: ${phase6aPassed ? 'PASS' : 'FAIL'}`);
  console.log(`Persistence Suite    : ${persistencePassed ? 'PASS' : 'FAIL'}`);
  console.log(`Gemini Integration   : ${geminiResult.geminiPassed ? 'PASS' : 'FAIL'}`);
  console.log(`Security Boundary    : ${geminiResult.securityPassed ? 'PASS' : 'FAIL'}`);
  console.log('============================================================\n');

  if (
    invariantsResult.passed !== 16 ||
    !phase6aPassed ||
    !persistencePassed ||
    !geminiResult.geminiPassed ||
    !geminiResult.securityPassed
  ) {
    console.error('TEST SUITE FAILED!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
