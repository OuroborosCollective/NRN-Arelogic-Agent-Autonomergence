import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { updateGameSimulation, initGameState } from './src/server/engine';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Ensure docs dir exists
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Game Engine State
  let gameState = initGameState();
  
  const TEN_HOURS_MS = 10 * 60 * 60 * 1000;
  let logBuffer: string[] = [];

  // Game Loop
  const TICK_RATE = 100; // 10Hz
  setInterval(() => {
    gameState = updateGameSimulation(gameState);
    io.emit('gameState', gameState);

    // Save newly produced logs into buffer
    if (gameState.logs.length > 0) {
      // Just a naive way, but we actually should let engine.ts expose newly added logs
      // Wait, we can modify engine.ts to return { state, newLogs }. 
      // For now, we will do it in engine.ts directly or check length diff.
    }
  }, TICK_RATE);

  // Every 10 hours, flush logs to text file
  setInterval(() => {
    if (logBuffer.length > 0) {
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const logPath = path.join(docsDir, `game_logs_${timestamp}.txt`);
      fs.writeFileSync(logPath, logBuffer.join('\n'));
      console.log(`Action logs written to ${logPath}`);
      logBuffer = [];
    }
  }, TEN_HOURS_MS);

  // Expose a way to append logs directly
  app.set('logBuffer', logBuffer);

  // API routing
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // Socket logic
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.emit('gameState', gameState);
    
    socket.on('command', (cmd) => {
      if (cmd === 'start') gameState.status = 'playing';
      if (cmd === 'stop') gameState.status = 'idle';
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
