const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

let mcProcess = null;
let logs = [];

app.use(cors());
app.use(express.json());

// Serve index.html and static files from current directory
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/status', (req, res) => {
  res.json({ running: !!mcProcess });
});

app.get('/logs', (req, res) => {
  res.json({ logs });
});

app.post('/start', (req, res) => {
  if (mcProcess) return res.json({ success: false, message: 'Server is already running' });

  const jarFile = 'paper-1.21.5-114.jar';
  const serverPath = path.join(__dirname);

  // Check if the jar file exists before starting
  if (!fs.existsSync(path.join(serverPath, jarFile))) {
    return res.json({ success: false, message: `Jar file not found: ${jarFile}` });
  }

  mcProcess = spawn('java', ['-Xmx10G', '-Xms10G', '-jar', jarFile, 'nogui'], {
    cwd: serverPath,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  logs.push(`[INFO] Starting server with ${jarFile}\n`);

  mcProcess.stdout.on('data', data => {
    logs.push(data.toString());
    if (logs.length > 100) logs.shift();
  });

  mcProcess.stderr.on('data', data => {
    logs.push(`[ERROR] ${data.toString()}`);
  });

  mcProcess.on('exit', code => {
    logs.push(`[INFO] Server stopped with code ${code}\n`);
    mcProcess = null;
  });

  res.json({ success: true, message: 'Server started' });
});

app.post('/stop', (req, res) => {
  if (!mcProcess) return res.json({ success: false, message: 'Server is not running' });

  mcProcess.stdin.write('stop\n');
  res.json({ success: true, message: 'Server stopping' });
});

app.post('/command', (req, res) => {
  const { command } = req.body;
  if (!mcProcess) return res.json({ success: false, message: 'Server is not running' });
  if (!command) return res.json({ success: false, message: 'No command provided' });

  mcProcess.stdin.write(`${command}\n`);
  res.json({ success: true, message: `Command sent: ${command}` });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
