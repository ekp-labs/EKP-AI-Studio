import { spawnSync } from 'child_process';
import path from 'path';

export async function runPersistenceTests(): Promise<boolean> {
  console.log('\n============================================================');
  console.log('EKP PERSISTENCE & RELOAD VERIFICATION SUITE');
  console.log('============================================================');

  const workerPath = path.resolve(process.cwd(), 'tests/process-persistence-worker.ts');
  const testDataDir = './data-test-' + Date.now();

  const isWin = process.platform === 'win32';
  const spawnOptions = {
    encoding: 'utf-8' as const,
    stdio: 'inherit' as const,
    shell: true,
  };
  const command = isWin ? 'npx.cmd' : 'npx';

  console.log('[Stage 1] Launching PROCESS A (Separate OS Process) to ingest and persist state...');
  const procA = spawnSync(command, ['tsx', workerPath, 'PROCESS_A', testDataDir], spawnOptions);

  if (procA.status !== 0) {
    console.error(`[Process A Failed] Exit code: ${procA.status}`);
    return false;
  }
  console.log('  ✓ PROCESS A completed successfully and terminated OS process.');

  console.log('\n[Stage 2] Launching PROCESS B (Separate OS Process) to load and verify persisted state...');
  const procB = spawnSync(command, ['tsx', workerPath, 'PROCESS_B', testDataDir], spawnOptions);

  if (procB.status !== 0) {
    console.error(`[Process B Failed] Exit code: ${procB.status}`);
    return false;
  }
  console.log('  ✓ PROCESS B successfully loaded and verified state across separate OS process lifetime!');

  console.log('\n============================================================');
  console.log('PERSISTENCE SUITE SUMMARY: PASS');
  console.log('============================================================\n');
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPersistenceTests().then((passed) => {
    if (!passed) process.exit(1);
  }).catch((err) => {
    console.error('Persistence tests failed:', err);
    process.exit(1);
  });
}
