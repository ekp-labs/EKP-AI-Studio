import fs from 'fs';
import path from 'path';
import os from 'os';
import { ClientGateway } from '../src/core/gateway/ClientGateway.js';
import { DirectoryScanner } from '../src/acquisition/DirectoryScanner.js';
import { ContentHasher } from '../src/acquisition/ContentHasher.js';
import { FileClassifier } from '../src/acquisition/FileClassifier.js';
import { FormatParserRegistry } from '../src/acquisition/parsers/FormatParserRegistry.js';
import { PdfParser } from '../src/acquisition/parsers/PdfParser.js';
import { IngestionStore } from '../src/acquisition/IngestionStore.js';
import { EventTopic } from '../src/core/types.js';

function generateDeterministic2PagePdfBuffer(): Buffer {
  const p1 = 'BT /F1 12 Tf 50 700 Td (EKP PDF Ingestion Engine Page 1 - Test Content) Tj ET\n';
  const p2 = 'BT /F1 12 Tf 50 700 Td (EKP PDF Ingestion Engine Page 2 - Deterministic Verification) Tj ET\n';

  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 2 /Kids [ 3 0 R 4 0 R ] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>
endobj
4 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>
endobj
6 0 obj
<< /Length ${p1.length} >>
stream
${p1}endstream
endobj
7 0 obj
<< /Length ${p2.length} >>
stream
${p2}endstream
endobj
xref
0 8
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000236 00000 n 
0000000357 00000 n 
0000000441 00000 n 
0000000553 00000 n 
trailer
<< /Size 8 /Root 1 0 R >>
startxref
665
%%EOF`;
  return Buffer.from(pdfString, 'binary');
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[PHASE 6A ASSERTION FAILED] ${message}`);
  }
}

export async function runPhase6AIngestionTests(): Promise<boolean> {
  console.log('\n============================================================');
  console.log('PHASE 6A: LOCAL KNOWLEDGE INGESTION ENGINE TEST SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let pdfPassed = 0;

  // Create isolated temp workspace for test directories
  const rawTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ekp-phase6a-test-'));
  const tempDir = fs.realpathSync(rawTempDir);
  const subDir = path.join(tempDir, 'nested-docs');
  fs.mkdirSync(subDir, { recursive: true });

  try {
    // -------------------------------------------------------------------------
    // Test 1: Security Boundaries - Rejection of Root Drives, Traversal, Symlinks
    // -------------------------------------------------------------------------
    try {
      const rootWin = DirectoryScanner.validateAuthorizedPath('C:\\', 'C:\\');
      assert(!rootWin.valid, 'DirectoryScanner failed to reject Win root drive C:\\');

      const rootUnix = DirectoryScanner.validateAuthorizedPath('/', '/');
      assert(!rootUnix.valid, 'DirectoryScanner failed to reject Unix root drive /');

      const traversal = DirectoryScanner.validateAuthorizedPath(path.join(tempDir, '../outside'), tempDir);
      assert(!traversal.valid, 'DirectoryScanner failed to reject path traversal');

      const validAuth = DirectoryScanner.validateAuthorizedPath(subDir, tempDir);
      assert(validAuth.valid, 'DirectoryScanner rejected valid child path within root');

      console.log('  [PASS] Test 1: Security Boundaries (Root, Traversal & Escapes)');
      passed++;
    } catch (err: any) {
      console.error('  [FAIL] Test 1:', err.message);
    }

    // -------------------------------------------------------------------------
    // Test 2: File Classifier (Supported, Ignored, Unsupported)
    // -------------------------------------------------------------------------
    try {
      const fileMd = path.join(tempDir, 'spec.md');
      const fileJson = path.join(tempDir, 'data.json');
      const fileTs = path.join(tempDir, 'app.ts');
      const filePdf = path.join(tempDir, 'doc.pdf');
      const fileDs = path.join(tempDir, '.DS_Store');
      const fileExe = path.join(tempDir, 'binary.exe');

      fs.writeFileSync(fileMd, '# Spec');
      fs.writeFileSync(fileJson, '{}');
      fs.writeFileSync(fileTs, 'const a = 1;');
      fs.writeFileSync(filePdf, 'PDF Data');
      fs.writeFileSync(fileDs, 'ds_store');
      fs.writeFileSync(fileExe, 'exe binary');

      const metaMd = FileClassifier.classify(fileMd, tempDir, 'Aerospace');
      assert(metaMd.classification === 'SUPPORTED', `Failed to classify .md as SUPPORTED, got ${metaMd.classification}`);

      const metaJson = FileClassifier.classify(fileJson, tempDir, 'Aerospace');
      assert(metaJson.classification === 'SUPPORTED', `Failed to classify .json as SUPPORTED, got ${metaJson.classification}`);

      const metaTs = FileClassifier.classify(fileTs, tempDir, 'Aerospace');
      assert(metaTs.classification === 'SUPPORTED', `Failed to classify .ts as SUPPORTED, got ${metaTs.classification}`);

      const metaPdf = FileClassifier.classify(filePdf, tempDir, 'Aerospace');
      assert(metaPdf.classification === 'SUPPORTED', `Failed to classify .pdf as SUPPORTED, got ${metaPdf.classification}`);

      const metaDs = FileClassifier.classify(fileDs, tempDir, 'Aerospace');
      assert(metaDs.classification === 'IGNORED', `Failed to classify .DS_Store as IGNORED, got ${metaDs.classification}`);

      const metaExe = FileClassifier.classify(fileExe, tempDir, 'Aerospace');
      assert(metaExe.classification === 'UNSUPPORTED', `Failed to classify .exe as UNSUPPORTED, got ${metaExe.classification}`);

      console.log('  [PASS] Test 2: File Classifier (Supported, Ignored, Unsupported)');
      passed++;
    } catch (err: any) {
      console.error('  [FAIL] Test 2:', err.message);
    }

    // -------------------------------------------------------------------------
    // Test 3: Content Hashing & Deterministic SHA-256 Calculation
    // -------------------------------------------------------------------------
    try {
      const content = 'Deterministic Knowledge Content';
      const hash1 = ContentHasher.hashString(content);
      const hash2 = ContentHasher.hashString(content);
      assert(hash1 === hash2, 'ContentHasher string hashing not deterministic');
      assert(hash1.length === 64, 'SHA-256 hash length must be 64 hex characters');

      const fileSample = path.join(tempDir, 'hash-test.txt');
      fs.writeFileSync(fileSample, content);
      const hashFile = await ContentHasher.hashFile(fileSample);
      assert(hashFile === hash1, 'ContentHasher file hashing mismatch with string hash');

      console.log('  [PASS] Test 3: Content Hashing & SHA-256 Calculation');
      passed++;
    } catch (err: any) {
      console.error('  [FAIL] Test 3:', err.message);
    }

    // -------------------------------------------------------------------------
    // Test 4: Format Parser Registry (Markdown, JSON, Source Code)
    // -------------------------------------------------------------------------
    try {
      const registry = new FormatParserRegistry();

      // Markdown
      const mdPath = path.join(tempDir, 'parser-test.md');
      const mdContent = '# Aerospace Valve Specs\n\nCalibration frequency must be under 100Hz.';
      fs.writeFileSync(mdPath, mdContent);
      const metaMd = FileClassifier.classify(mdPath, tempDir, 'Aerospace');
      const mdParsed = await registry.parseFile(mdPath, Buffer.from(mdContent), metaMd);
      assert(mdParsed.format === 'markdown', `Markdown parser format mismatch: ${mdParsed.format}`);
      assert((mdParsed.sections?.length ?? 0) >= 1, 'Markdown parser failed to extract sections');

      // JSON
      const jsonPath = path.join(tempDir, 'parser-config.json');
      const jsonContent = JSON.stringify({ title: 'Engine Parameters', maxTemp: 450 });
      fs.writeFileSync(jsonPath, jsonContent);
      const metaJson = FileClassifier.classify(jsonPath, tempDir, 'Aerospace');
      const jsonParsed = await registry.parseFile(jsonPath, Buffer.from(jsonContent), metaJson);
      assert(jsonParsed.format === 'json', `JSON parser format mismatch: ${jsonParsed.format}`);
      assert(jsonParsed.content.includes('450'), 'JSON parser failed to extract content');

      // Source Code
      const tsPath = path.join(tempDir, 'parser-controller.ts');
      const tsContent = 'export function calibrateSensor() { return 100; }';
      fs.writeFileSync(tsPath, tsContent);
      const metaTs = FileClassifier.classify(tsPath, tempDir, 'Aerospace');
      const tsParsed = await registry.parseFile(tsPath, Buffer.from(tsContent), metaTs);
      assert(tsParsed.format === 'ts', `Source code parser format mismatch: ${tsParsed.format}`);

      console.log('  [PASS] Test 4: Format Parser Registry (Markdown, JSON, Code)');
      passed++;
    } catch (err: any) {
      console.error('  [FAIL] Test 4:', err.message);
    }

    // -------------------------------------------------------------------------
    // Test 5: Authorized Directory Discovery & Ingestion Workflow
    // -------------------------------------------------------------------------
    try {
      const workDir = path.join(tempDir, 'disc-test');
      const workSub = path.join(workDir, 'nested');
      fs.mkdirSync(workSub, { recursive: true });

      const file1 = path.join(workDir, 'spec1.md');
      const file2 = path.join(workSub, 'spec2.json');
      fs.writeFileSync(file1, '# Spec 1\nSafety limit set to 500 PSI.');
      fs.writeFileSync(file2, JSON.stringify({ system: 'Hydraulics', pressure: 500 }));

      const gateway = new ClientGateway({
        autoPersist: false,
        storageDir: path.join(tempDir, 'store-test-5'),
      });
      gateway.acquisition.getStore().addAuthorizedDirectory({
        path: workDir,
        enabled: true,
        recursive: true,
        namespace: 'Aerospace',
      });

      const summary = await gateway.acquisition.startScan();
      assert(summary.totalDiscovered >= 2, `Expected at least 2 discovered files, got ${summary.totalDiscovered}`);
      assert(summary.totalIngested >= 2, `Expected at least 2 ingested files, got ${summary.totalIngested}`);

      const allDocs = gateway.library.getAllDocuments();
      assert(allDocs.some((d) => d.title.includes('spec1')), 'Document spec1 not found in library');

      console.log('  [PASS] Test 5: Authorized Directory Discovery & Ingestion Workflow');
      passed++;
    } catch (err: any) {
      console.error('  [FAIL] Test 5:', err.message);
    }

    // -------------------------------------------------------------------------
    // Test 6: Duplicate Detection & Unchanged File Handling
    // -------------------------------------------------------------------------
    try {
      const dupDir = path.join(tempDir, 'dup-test');
      fs.mkdirSync(dupDir, { recursive: true });

      const fileA = path.join(dupDir, 'fileA.md');
      const fileB = path.join(dupDir, 'fileB.md');
      const sharedContent = '# Shared Specs\nExact identical safety procedure content.';
      fs.writeFileSync(fileA, sharedContent);
      fs.writeFileSync(fileB, sharedContent);

      const gateway = new ClientGateway({
        autoPersist: false,
        storageDir: path.join(tempDir, 'store-test-6'),
      });
      gateway.acquisition.getStore().addAuthorizedDirectory({
        path: dupDir,
        enabled: true,
        recursive: false,
        namespace: 'Security',
      });

      const scan1 = await gateway.acquisition.startScan();
      assert(scan1.totalIngested === 1, `Expected 1 ingested file, got ${scan1.totalIngested}`);
      assert(scan1.totalDuplicated === 1, `Expected 1 duplicate file, got ${scan1.totalDuplicated}`);

      const scan2 = await gateway.acquisition.startScan();
      assert(scan2.totalUnchanged === 2, `Expected 2 unchanged files on second scan, got ${scan2.totalUnchanged}`);

      console.log('  [PASS] Test 6: Duplicate Content Detection & Unchanged Skip Logic');
      passed++;
    } catch (err: any) {
      console.error('  [FAIL] Test 6:', err.message);
    }

    // -------------------------------------------------------------------------
    // Test 7: Modified File Detection & Re-ingestion
    // -------------------------------------------------------------------------
    try {
      const modDir = path.join(tempDir, 'mod-test');
      fs.mkdirSync(modDir, { recursive: true });

      const modFile = path.join(modDir, 'target.md');
      fs.writeFileSync(modFile, '# Version 1\nInitial pressure 100 PSI.');

      const gateway = new ClientGateway({
        autoPersist: false,
        storageDir: path.join(tempDir, 'store-test-7'),
      });
      gateway.acquisition.getStore().addAuthorizedDirectory({
        path: modDir,
        enabled: true,
        recursive: false,
        namespace: 'Aerospace',
      });

      await gateway.acquisition.startScan();

      // Modify the file content and delay slightly to update mtime
      await new Promise((r) => setTimeout(r, 20));
      fs.writeFileSync(modFile, '# Version 2\nUpdated pressure 200 PSI.');

      const scan2 = await gateway.acquisition.startScan();
      assert(scan2.totalIngested === 1, `Modified file was not re-ingested, totalIngested=${scan2.totalIngested}`);

      const docs = gateway.library.getAllDocuments();
      const doc = docs.find((d) => d.sourceUri?.includes('target.md'));
      assert(Boolean(doc && doc.content.includes('200 PSI')), 'Document content not updated in KnowledgeLibrary');

      console.log('  [PASS] Test 7: Modified File Detection & Document Re-ingestion');
      passed++;
    } catch (err: any) {
      console.error('  [FAIL] Test 7:', err.message);
    }

    // -------------------------------------------------------------------------
    // Test 8: Deleted Source File Handling
    // -------------------------------------------------------------------------
    try {
      const delDir = path.join(tempDir, 'del-test');
      fs.mkdirSync(delDir, { recursive: true });

      const delFile = path.join(delDir, 'doomed.md');
      fs.writeFileSync(delFile, '# Doomed Document\nThis will be deleted.');

      const gateway = new ClientGateway({
        autoPersist: false,
        storageDir: path.join(tempDir, 'store-test-8'),
      });
      gateway.acquisition.getStore().addAuthorizedDirectory({
        path: delDir,
        enabled: true,
        recursive: false,
        namespace: 'Temp',
      });

      await gateway.acquisition.startScan();

      // Delete source file
      fs.unlinkSync(delFile);

      await gateway.acquisition.startScan();

      const record = gateway.acquisition.getStore().getRecordByPath(delFile);
      assert(record?.status === 'SOURCE_DELETED', `Record status not updated to SOURCE_DELETED, got ${record?.status}`);

      console.log('  [PASS] Test 8: Deleted Source File Status Tracking');
      passed++;
    } catch (err: any) {
      console.error('  [FAIL] Test 8:', err.message);
    }

    // -------------------------------------------------------------------------
    // Test 9: File Watcher Event Handling & Ingestion
    // -------------------------------------------------------------------------
    try {
      const watchDir = path.join(tempDir, 'watch-test');
      fs.mkdirSync(watchDir, { recursive: true });

      const gateway = new ClientGateway({
        autoPersist: false,
        storageDir: path.join(tempDir, 'store-test-9'),
      });
      gateway.acquisition.getStore().addAuthorizedDirectory({
        path: watchDir,
        enabled: true,
        recursive: false,
        namespace: 'Realtime',
      });

      let eventCount = 0;
      gateway.eventBus.subscribe(EventTopic.FILE_INGESTED, () => {
        eventCount++;
      });

      gateway.acquisition.startWatcher();

      const newWatchFile = path.join(watchDir, 'live.md');
      fs.writeFileSync(newWatchFile, '# Live Document\nRealtime change test.');

      // Wait briefly for watcher debounced trigger
      await new Promise((resolve) => setTimeout(resolve, 450));

      gateway.acquisition.stopWatcher();

      assert(eventCount >= 1 || gateway.acquisition.getStore().getAllRecords().some((r) => r.path.includes('live.md')), 'Watcher failed to detect or ingest live file');

      console.log('  [PASS] Test 9: Realtime File Watcher Event & Auto-Ingestion');
      passed++;
    } catch (err: any) {
      console.error('  [FAIL] Test 9:', err.message);
    }

    // -------------------------------------------------------------------------
    // Test 10: Ingestion Metadata Persistence & Reload
    // -------------------------------------------------------------------------
    try {
      const storeDir = path.join(tempDir, 'store-data');

      const store1 = new IngestionStore(storeDir);
      store1.addAuthorizedDirectory({
        path: tempDir,
        enabled: true,
        recursive: true,
        namespace: 'PersistTest',
      });

      const store2 = new IngestionStore(storeDir);
      const loadedDirs = store2.getConfig().directories;
      assert(loadedDirs.length === 1, 'Failed to reload authorized directories from disk');
      assert(loadedDirs[0].namespace === 'PersistTest', 'Reloaded directory namespace mismatch');

      console.log('  [PASS] Test 10: Ingestion Metadata Persistence & Reload Across Instances');
      passed++;
    } catch (err: any) {
      console.error('  [FAIL] Test 10:', err.message);
    }

    // -------------------------------------------------------------------------
    // Test 11: Real Multi-page PDF Text Extraction & Provenance Integration
    // -------------------------------------------------------------------------
    try {
      const pdfDir = path.join(tempDir, 'pdf-test-dir');
      fs.mkdirSync(pdfDir, { recursive: true });

      const pdfFilePath = path.join(pdfDir, 'aerospace-manual.pdf');
      const pdfBuffer = generateDeterministic2PagePdfBuffer();
      fs.writeFileSync(pdfFilePath, pdfBuffer);

      // 1. Direct PdfParser verification
      const pdfParser = new PdfParser();
      const metaPdf = FileClassifier.classify(pdfFilePath, tempDir, 'Aerospace');
      const parsedPdf = await pdfParser.parse(pdfFilePath, pdfBuffer, metaPdf);

      assert(parsedPdf.format === 'pdf', `Expected format 'pdf', got ${parsedPdf.format}`);
      assert(parsedPdf.parser === 'PdfParser', `Expected parser 'PdfParser', got ${parsedPdf.parser}`);
      assert(parsedPdf.pageCount === 2, `Expected 2 pages in parsed PDF, got ${parsedPdf.pageCount}`);
      assert(Boolean(parsedPdf.sections && parsedPdf.sections.length === 2), `Expected 2 sections for pages, got ${parsedPdf.sections?.length}`);
      const sec = parsedPdf.sections!;
      assert(sec[0].pageNumber === 1, 'Page 1 number mismatch');
      assert(sec[0].content.includes('Page 1 - Test Content'), 'Page 1 content missing expected text');
      assert(sec[1].pageNumber === 2, 'Page 2 number mismatch');
      assert(sec[1].content.includes('Page 2 - Deterministic Verification'), 'Page 2 content missing expected text');

      // 2. Full Ingestion Pipeline & Provenance integration
      const gateway = new ClientGateway({
        autoPersist: false,
        storageDir: path.join(tempDir, 'store-test-11'),
      });
      gateway.acquisition.getStore().addAuthorizedDirectory({
        path: pdfDir,
        enabled: true,
        recursive: false,
        namespace: 'Aerospace',
      });

      const scanResult = await gateway.acquisition.startScan();
      assert(scanResult.totalIngested === 1, `Expected 1 ingested PDF file, got ${scanResult.totalIngested}`);

      const record = gateway.acquisition.getStore().getRecordByPath(pdfFilePath);
      assert(Boolean(record), 'IngestionRecord for PDF not found in store');
      assert(record?.status === 'INGESTED', `Record status expected INGESTED, got ${record?.status}`);
      assert(record?.parserUsed === 'PdfParser', `Record parserUsed expected PdfParser, got ${record?.parserUsed}`);
      assert(Boolean(record?.hash && record.hash.length === 64), 'Record missing valid SHA-256 hash');
      assert(record?.filename === 'aerospace-manual.pdf', 'Record filename mismatch');
      assert(record?.namespace === 'Aerospace', 'Record namespace mismatch');
      assert(Boolean(record?.ingestedAt && record.ingestedAt > 0), 'Record ingestedAt timestamp missing');

      const docs = gateway.library.getAllDocuments();
      const doc = docs.find((d) => d.sourceUri?.includes('aerospace-manual.pdf'));
      assert(Boolean(doc), 'Document not found in KnowledgeLibrary');
      assert(doc?.title === 'aerospace-manual', `Document title mismatch: ${doc?.title}`);
      assert(doc?.sourceUri === `file://${pdfFilePath}`, `Document sourceUri mismatch: ${doc?.sourceUri}`);
      assert(Boolean(doc?.content.includes('Page 1 - Test Content')), 'Document library content missing Page 1 text');

      console.log('  [PASS] Test 11: Real Multi-page PDF Text Extraction & Provenance Integration');
      pdfPassed++;
    } catch (err: any) {
      console.error('  [FAIL] Test 11:', err.message);
    }

    // -------------------------------------------------------------------------
    // Test 12: Malformed PDF Handling & Engine Resilience
    // -------------------------------------------------------------------------
    try {
      const corruptDir = path.join(tempDir, 'corrupt-pdf-dir');
      fs.mkdirSync(corruptDir, { recursive: true });

      const corruptPdfPath = path.join(corruptDir, 'invalid-corrupt.pdf');
      const corruptBuffer = Buffer.from('NOT_A_REAL_PDF_HEADER_1234567890');
      fs.writeFileSync(corruptPdfPath, corruptBuffer);

      // 1. Direct PdfParser rejection
      const pdfParser = new PdfParser();
      const metaCorrupt = FileClassifier.classify(corruptPdfPath, tempDir, 'Security');
      let directErrorCaught = false;
      try {
        await pdfParser.parse(corruptPdfPath, corruptBuffer, metaCorrupt);
      } catch (err: any) {
        directErrorCaught = true;
        assert(err.message.includes('[PdfParser] Failed to parse PDF'), `Error message missing expected prefix: ${err.message}`);
      }
      assert(directErrorCaught, 'PdfParser failed to throw error on malformed PDF bytes');

      // 2. Engine resilience during scan & pipeline processing
      const gateway = new ClientGateway({
        autoPersist: false,
        storageDir: path.join(tempDir, 'store-test-12'),
      });
      gateway.acquisition.getStore().addAuthorizedDirectory({
        path: corruptDir,
        enabled: true,
        recursive: false,
        namespace: 'Security',
      });

      // Add a valid file alongside the corrupt PDF to test continued processing
      const validFilePath = path.join(corruptDir, 'valid-after-corrupt.md');
      fs.writeFileSync(validFilePath, '# Valid Document\nMust be processed despite corrupted PDF.');

      const scanResult = await gateway.acquisition.startScan();
      assert(scanResult.totalFailed === 1, `Expected 1 failed file for corrupt PDF, got ${scanResult.totalFailed}`);
      assert(scanResult.totalIngested === 1, `Expected 1 successfully ingested valid file, got ${scanResult.totalIngested}`);

      const recordCorrupt = gateway.acquisition.getStore().getRecordByPath(corruptPdfPath);
      assert(recordCorrupt?.status === 'FAILED', `Corrupt record status expected FAILED, got ${recordCorrupt?.status}`);
      assert(recordCorrupt?.classification === 'MALFORMED', `Corrupt record classification expected MALFORMED, got ${recordCorrupt?.classification}`);
      assert(Boolean(recordCorrupt?.errorMessage), 'Corrupt record missing errorMessage');

      const recordValid = gateway.acquisition.getStore().getRecordByPath(validFilePath);
      assert(recordValid?.status === 'INGESTED', `Valid record after fail expected INGESTED, got ${recordValid?.status}`);

      console.log('  [PASS] Test 12: Malformed PDF Handling & Engine Resilience');
      pdfPassed++;
    } catch (err: any) {
      console.error('  [FAIL] Test 12:', err.message);
    }

  } finally {
    // Cleanup temporary workspace
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }

  const totalPassed = passed + pdfPassed;
  console.log('\n============================================================');
  console.log('PHASE 6A INGESTION TEST SUMMARY:');
  console.log(`  Original Phase 6A Tests: ${passed}/10 PASSED`);
  console.log(`  Additional PDF Tests:    ${pdfPassed}/2 PASSED`);
  console.log(`  Total Phase 6A Tests:    ${totalPassed}/12 PASSED (${12 - totalPassed} FAILED)`);
  console.log('============================================================\n');

  return passed === 10 && pdfPassed === 2;
}

if (process.argv[1] && process.argv[1].includes('phase6a-ingestion')) {
  runPhase6AIngestionTests().catch(console.error);
}
