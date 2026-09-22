import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ClientGateway } from './src/core/gateway/ClientGateway.js';
import { DirectoryScanner } from './src/acquisition/DirectoryScanner.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const gateway = new ClientGateway({
    autoPersist: true,
  });

  // Attempt initial load from persistence
  await gateway.loadFromPersistence().catch((err) => {
    console.warn('[Server] Initial persistence load notice:', err.message);
  });

  // REST API Routes
  app.get('/api/status', (req, res) => {
    try {
      const status = gateway.getSystemStatus();
      res.json({ success: true, status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/graph', (req, res) => {
    try {
      const nodes = gateway.graph.getAllNodes();
      const edges = gateway.graph.getAllEdges();
      res.json({ success: true, nodes, edges });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/knowledge', (req, res) => {
    try {
      const documents = gateway.library.getAllDocuments();
      const adus = gateway.library.getAllADUs();
      res.json({ success: true, documents, adus });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/search', (req, res) => {
    try {
      const q = String(req.query.q || '').toLowerCase().trim();
      if (!q) {
        res.json({ success: true, results: [] });
        return;
      }

      const allAdus = gateway.library.getAllADUs();
      const allDocs = gateway.library.getAllDocuments();
      const docMap = new Map(allDocs.map((d) => [d.id, d]));

      const matchedAdus = allAdus.filter((adu) => {
        const contentMatch = adu.content.toLowerCase().includes(q);
        const typeMatch = adu.type.toLowerCase().includes(q);
        const entityMatch = adu.entities?.some((e: string) => e.toLowerCase().includes(q));
        const doc = docMap.get(adu.documentId);
        const titleMatch = doc?.title.toLowerCase().includes(q);
        const domainMatch = doc?.domain.toLowerCase().includes(q);
        return contentMatch || typeMatch || entityMatch || titleMatch || domainMatch;
      });

      const results = matchedAdus.map((adu) => {
        const doc = docMap.get(adu.documentId);
        return {
          adu,
          documentTitle: doc?.title || 'Unknown Document',
          domain: doc?.domain || 'General',
          sourceUri: doc?.sourceUri || 'local',
        };
      });

      res.json({ success: true, count: results.length, results });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/ingest', async (req, res) => {
    try {
      const { title, domain, content, sourceUri } = req.body;
      const doc = await gateway.ingestDocument({ title, domain, content, sourceUri });
      res.json({ success: true, document: doc });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/reasoning', async (req, res) => {
    try {
      const { prompt, domain } = req.body;
      const result = await gateway.submitReasoningTask({ prompt, domain });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/approval', async (req, res) => {
    try {
      const { intentionId, actionId, approved, reviewerNotes } = req.body;
      const actionResult = await gateway.processActionApproval({
        intentionId,
        actionId,
        approved,
        reviewerNotes,
      });
      res.json({ success: true, actionResult });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- Phase 6A: Local Knowledge Ingestion Engine API ---

  app.get('/api/ingestion/config', (req, res) => {
    try {
      const config = gateway.acquisition.getStore().getConfig();
      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/ingestion/config/add', (req, res) => {
    try {
      const { path: dirPath, recursive, namespace } = req.body;
      if (!dirPath) {
        res.status(400).json({ success: false, error: 'Directory path is required' });
        return;
      }

      // Strict server-side validation
      const authCheck = DirectoryScanner.validateAuthorizedPath(dirPath, dirPath);
      if (!authCheck.valid) {
        res.status(403).json({ success: false, error: authCheck.reason });
        return;
      }

      const added = gateway.acquisition.getStore().addAuthorizedDirectory({
        path: dirPath,
        enabled: true,
        recursive: recursive ?? true,
        namespace: namespace || 'Default',
      });

      res.json({ success: true, directory: added });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/ingestion/config/remove', (req, res) => {
    try {
      const { idOrPath } = req.body;
      const removed = gateway.acquisition.getStore().removeAuthorizedDirectory(idOrPath);
      res.json({ success: true, removed });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/ingestion/config/toggle', (req, res) => {
    try {
      const { enabled } = req.body;
      const updated = gateway.acquisition.getStore().updateConfig({ enabled });
      res.json({ success: true, config: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/ingestion/scan', async (req, res) => {
    try {
      const summary = await gateway.acquisition.startScan();
      res.json({ success: true, summary });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/ingestion/watcher', (req, res) => {
    try {
      const { action } = req.body; // 'start' | 'stop' | 'pause' | 'resume'
      if (action === 'start') gateway.acquisition.startWatcher();
      else if (action === 'stop') gateway.acquisition.stopWatcher();
      else if (action === 'pause') gateway.acquisition.pauseWatcher();
      else if (action === 'resume') gateway.acquisition.resumeWatcher();

      res.json({ success: true, watcherStatus: gateway.acquisition.getWatcherStatus() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/ingestion/status', (req, res) => {
    try {
      const status = gateway.acquisition.getAggregateStatus();
      res.json({ success: true, status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite or Static fallback
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EKP Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Start Error]', err);
  process.exit(1);
});
