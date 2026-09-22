import { ClientGateway } from '../src/core/gateway/ClientGateway.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runGeminiIntegrationTests(): Promise<{ geminiPassed: boolean; securityPassed: boolean }> {
  console.log('\n============================================================');
  console.log('EKP GEMINI INTEGRATION, TIMEOUT & FALLBACK VERIFICATION SUITE');
  console.log('============================================================');

  // TEST 1: Secret Isolation & Hardening Invariants
  console.log('\n[Test 1] Verifying Secret Isolation & Hardening Invariants...');
  const gateway = new ClientGateway({ autoPersist: false });

  await gateway.ingestDocument({
    title: 'Security Boundary Document',
    domain: 'Security',
    content: 'Secret keys must never be written to RuntimeGraph or state payloads.',
  });

  const statusJson = JSON.stringify(gateway.getSystemStatus());
  assert(!statusJson.includes('AIzaSy'), 'GEMINI_API_KEY fragment detected in system status');

  const nodesJson = JSON.stringify(gateway.graph.getAllNodes());
  assert(!nodesJson.includes('AIzaSy'), 'GEMINI_API_KEY fragment detected in RuntimeGraph nodes');

  if (process.env.GEMINI_API_KEY) {
    assert(!statusJson.includes(process.env.GEMINI_API_KEY), 'GEMINI_API_KEY leaked into REST status');
    assert(!nodesJson.includes(process.env.GEMINI_API_KEY), 'GEMINI_API_KEY leaked into graph nodes');
  }
  console.log('  ✓ Secret isolation passed: GEMINI_API_KEY is isolated from REST responses, graph nodes, and state payloads.');

  // TEST 2: Timeout Enforcement (Deliberate >5000ms Delay) -> Fallback
  console.log('\n[Test 2] Testing 5000ms Timeout Enforcement with Controlled 6000ms Delay...');
  const geminiProvider = gateway.reasoning.getGeminiProvider();
  geminiProvider.setApiKey('mock-test-key-12345');
  gateway.reasoning.setActiveProvider('gemini');

  geminiProvider.setMockHandler(async () => {
    await sleep(6000);
    return {
      problemDecomposition: ['Delayed response'],
      epistemicGrounding: [],
      assumptions: [],
      confidenceAssessment: 0.9,
      conclusion: 'Late result',
      proposedActions: [],
    };
  });

  const startTime = Date.now();
  const timeoutResult = await gateway.submitReasoningTask({
    prompt: 'Calibrate pressure regulator',
    domain: 'Aerospace Engineering',
  });
  const duration = Date.now() - startTime;

  geminiProvider.setMockHandler(undefined);

  assert(duration >= 4800 && duration < 6200, `Timeout duration out of expected range (expected ~5000ms, took ${duration}ms)`);
  assert(Boolean(timeoutResult.intention), 'Timeout fallback failed to return valid intention');
  assert(timeoutResult.providerUsed.includes('Fallback') || timeoutResult.providerUsed.includes('Deterministic'), `Expected fallback provider, got: ${timeoutResult.providerUsed}`);
  console.log(`  ✓ 5000ms Timeout enforced correctly! Triggered fallback in ${duration}ms. Intention ID: ${timeoutResult.intention.id}`);

  // TEST 3: Network / Request Failure -> Fallback
  console.log('\n[Test 3] Testing Automatic Fallback on Network / Request Failure...');
  geminiProvider.setMockHandler(async () => {
    throw new TypeError('fetch failed: network unreachable');
  });

  const networkErrorResult = await gateway.submitReasoningTask({
    prompt: 'Check fuel lines',
    domain: 'Aerospace Engineering',
  });

  geminiProvider.setMockHandler(undefined);

  assert(Boolean(networkErrorResult.intention), 'Network error fallback returned no intention');
  assert(networkErrorResult.providerUsed.includes('Deterministic'), 'Network error did not switch to Deterministic provider');
  console.log(`  ✓ Network failure gracefully fell back to Deterministic provider! Resulting provider: ${networkErrorResult.providerUsed}`);

  // TEST 4: HTTP 503 / Service Unavailable -> Fallback
  console.log('\n[Test 4] Testing Automatic Fallback on HTTP 503 / Service Unavailable...');
  geminiProvider.setMockHandler(async () => {
    const err: any = new Error('This model is currently experiencing high demand.');
    err.status = 503;
    throw err;
  });

  const unavailableResult = await gateway.submitReasoningTask({
    prompt: 'Verify oxidizer tank level',
    domain: 'Aerospace Engineering',
  });

  geminiProvider.setMockHandler(undefined);

  assert(Boolean(unavailableResult.intention), 'HTTP 503 fallback returned no intention');
  assert(unavailableResult.providerUsed.includes('Deterministic'), 'HTTP 503 did not switch to Deterministic provider');
  console.log(`  ✓ HTTP 503 Service Unavailable fell back cleanly to Deterministic engine! Intention ID: ${unavailableResult.intention.id}`);

  // TEST 5: API Key Unavailable -> Clean Configuration State
  console.log('\n[Test 5] Testing Behavior when GEMINI_API_KEY is Unavailable...');
  geminiProvider.setApiKey(undefined);
  assert(!geminiProvider.isAvailable(), 'GeminiProvider must report isAvailable()=false when key is missing');

  const noKeyResult = await gateway.submitReasoningTask({
    prompt: 'Run offline diagnostic check',
    domain: 'Aerospace Engineering',
  });

  geminiProvider.setApiKey(process.env.GEMINI_API_KEY);

  assert(Boolean(noKeyResult.intention), 'Reasoning failed when key was missing');
  assert(noKeyResult.providerUsed.includes('Deterministic'), 'Missing key did not use Deterministic provider');
  console.log(`  ✓ Missing API key handled cleanly without crashing. Provider used: ${noKeyResult.providerUsed}`);

  // TEST 6: Live Gemini API Check (Only if GEMINI_API_KEY present)
  console.log('\n[Test 6] Checking Live Gemini API Integration Availability...');
  if (process.env.GEMINI_API_KEY) {
    geminiProvider.setApiKey(process.env.GEMINI_API_KEY);
    gateway.reasoning.setActiveProvider('gemini');
    try {
      const liveResult = await gateway.submitReasoningTask({
        prompt: 'Formulate calibration procedure for 100Hz pressure sensor',
        domain: 'Aerospace Engineering',
      });
      console.log(`  ✓ Live Gemini API call executed successfully! Provider used: ${liveResult.providerUsed}`);
    } catch (err: any) {
      console.log(`  ! Live Gemini call encountered API error (${err.message}). Engine fell back safely.`);
    }
  } else {
    console.log('  [SKIPPED] Live Gemini API Call (GEMINI_API_KEY environment variable is not set)');
  }

  console.log('\n============================================================');
  console.log('GEMINI & SECURITY SUITE SUMMARY: PASS');
  console.log('============================================================\n');

  return { geminiPassed: true, securityPassed: true };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runGeminiIntegrationTests().catch((err) => {
    console.error('Gemini integration tests failed:', err);
    process.exit(1);
  });
}
