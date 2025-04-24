// This script uses CommonJS syntax (.cjs extension)
const { spawn } = require('child_process');
const path = require('path');

// Define environment variables
const env = {
  ...process.env,
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/igoodar',
  SESSION_SECRET: 'local_development_secret',
  PORT: '5001',
  NODE_ENV: 'development'
};

console.log('Starting server with environment variables:');
console.log('DATABASE_URL:', env.DATABASE_URL);
console.log('SESSION_SECRET:', env.SESSION_SECRET);
console.log('PORT:', env.PORT);
console.log('NODE_ENV:', env.NODE_ENV);

// Run the server
const server = spawn('npx', ['tsx', 'server/index.ts'], { 
  stdio: 'inherit',
  env: env
});

// Handle server exit
server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});