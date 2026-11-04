const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Smart Job Portal (Full-Stack MERN Dev Environment)...\n');

const server = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'pipe',
  shell: true,
  env: { ...process.env, PORT: '5001' },
});

const client = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'client'),
  stdio: 'pipe',
  shell: true,
});

function prefixLog(prefix, data) {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      console.log(`${prefix} ${line}`);
    }
  });
}

server.stdout.on('data', data => prefixLog('\x1b[36m[Backend]\x1b[0m', data));
server.stderr.on('data', data => prefixLog('\x1b[31m[Backend Error]\x1b[0m', data));

client.stdout.on('data', data => prefixLog('\x1b[35m[Frontend]\x1b[0m', data));
client.stderr.on('data', data => prefixLog('\x1b[31m[Frontend Error]\x1b[0m', data));

function cleanup() {
  console.log('\n🛑 Shutting down services...');
  server.kill('SIGINT');
  client.kill('SIGINT');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
