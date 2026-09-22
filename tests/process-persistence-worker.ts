import { ClientGateway } from '../src/core/gateway/ClientGateway.js';
import { FileStorageAdapter } from '../src/core/persistence/FileStorageAdapter.js';
import { GraphNodeType, GraphEdgeType } from '../src/core/types.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[PROCESS ASSERTION FAILED] ${message}`);
    process.exit(1);
  }
}

const mode = process.argv[2];
const testDataDir = process.argv[3] || './data-test';

const adapter = new FileStorageAdapter(testDataDir);

async function run() {
  if (mode === 'PROCESS_A') {
    const gateway = new ClientGateway({ persistenceAdapter: adapter, autoPersist: true });

    // Ingest controlled document
    const doc = await gateway.ingestDocument({
      title: 'Process Persistence Test Spec',
      domain: 'Aerospace',
      content: '# Spec Rules\n- Calibration frequency must be kept under 100Hz.\n- Requires safety inspection.',
    });

    // Reasoning task
    const reasoning = await gateway.submitReasoningTask({
      prompt: 'Calibrate pressure regulator to 100Hz',
      domain: 'Aerospace',
    });

    // Register a memory unit
    const adus = gateway.library.getAllADUs();
    gateway.memory.registerUnit('Calibration frequency requirement', adus.map((a) => a.id));

    // Governed action approval
    if (reasoning.intention.proposedActions.length > 0) {
      await gateway.processActionApproval({
        intentionId: reasoning.intention.id,
        actionId: reasoning.intention.proposedActions[0].id,
        approved: true,
        reviewerNotes: 'Approved in Process A',
      });
    }

    await gateway.saveToPersistence();
    console.log('[PROCESS_A] Persisted state successfully (Document, ADUs, Graph, Memory, AuditLogs).');
    process.exit(0);
  } else if (mode === 'PROCESS_B') {
    const gateway = new ClientGateway({ persistenceAdapter: adapter, autoPersist: false });
    await gateway.loadFromPersistence();

    // 1. Verify document
    const docs = gateway.library.getAllDocuments();
    assert(docs.length >= 1, 'Documents count must be >= 1');
    const targetDoc = docs.find((d) => d.title === 'Process Persistence Test Spec');
    assert(Boolean(targetDoc), 'Target document "Process Persistence Test Spec" not found');
    assert(targetDoc!.domain === 'Aerospace', 'Document domain mismatch');

    // 2. Verify ADUs
    const adus = gateway.library.getAllADUs();
    assert(adus.length >= 1, 'ADUs count must be >= 1');
    const docAdus = adus.filter((a) => a.documentId === targetDoc!.id);
    assert(docAdus.length >= 1, 'Extracted ADUs for target document not found');
    assert(typeof docAdus[0].startLine === 'number' && typeof docAdus[0].endLine === 'number', 'ADU line ranges missing');

    // 3. Verify Graph Nodes
    const nodes = gateway.graph.getAllNodes();
    assert(nodes.length >= 2, 'Graph nodes count must be >= 2');
    const docNode = nodes.find((n) => n.type === GraphNodeType.DOCUMENT);
    assert(Boolean(docNode), 'DOCUMENT graph node missing');
    const actionNode = nodes.find((n) => n.type === GraphNodeType.ACTION);
    assert(Boolean(actionNode), 'ACTION graph node missing');
    const resultNode = nodes.find((n) => n.type === GraphNodeType.RESULT);
    assert(Boolean(resultNode), 'RESULT graph node missing');

    // 4. Verify Graph Edges
    const edges = gateway.graph.getAllEdges();
    assert(edges.length >= 1, 'Graph edges count must be >= 1');
    const producesEdge = edges.find((e) => e.type === GraphEdgeType.PRODUCES);
    assert(Boolean(producesEdge), 'PRODUCES graph edge missing');
    assert(producesEdge!.sourceId === actionNode!.id && producesEdge!.targetId === resultNode!.id, 'PRODUCES edge connections invalid');

    // 5. Verify Memory
    const memoryUnits = gateway.memory.getAllUnits();
    assert(memoryUnits.length >= 1, 'Cognitive memory units count must be >= 1');
    assert(memoryUnits[0].concept === 'Calibration frequency requirement', 'Memory unit concept mismatch');

    // 6. Verify Audit State
    const auditLogs = gateway.agent.getAuditLogs();
    assert(auditLogs.length >= 1, 'Audit log records count must be >= 1');
    assert(auditLogs[0].status === 'EXECUTED' && auditLogs[0].approved === true, 'Audit log status invalid');

    // 7. Verify Provenance
    assert(Boolean(docNode!.provenance && docNode!.provenance.sourceUri), 'Document graph node provenance missing');
    assert(docAdus[0].provenance.sourceTitle === 'Process Persistence Test Spec', 'ADU provenance sourceTitle mismatch');

    // 8. Verify Retrieval
    const retrieved = gateway.retrieval.retrieve('Calibration frequency', 'Aerospace');
    assert(retrieved.items.length >= 1, 'Knowledge retrieval failed on restored state');
    assert(retrieved.items[0].adu.content.includes('100Hz'), 'Retrieved ADU content mismatch');

    // 9. Verify Lineage
    const actionEdges = gateway.graph.getEdgesForNode(actionNode!.id);
    assert(actionEdges.length >= 1, 'Lineage edge for action node missing');

    console.log('[PROCESS_B] Restored and verified ALL state (Documents, ADUs, Nodes, Edges, Memory, Audit, Provenance, Retrieval, Lineage) successfully across separate OS process!');
    process.exit(0);
  } else {
    console.error('Unknown process mode:', mode);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Worker error:', err);
  process.exit(1);
});
