// This script directly starts the server with environment variables set
import { spawn } from 'child_process';

// Set environment variables
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/igoodar';
process.env.SESSION_SECRET = 'local_development_secret';
process.env.PORT = '5001';
process.env.NODE_ENV = 'development';

console.log('Starting server with environment variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('SESSION_SECRET:', process.env.SESSION_SECRET);
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Run the server
const server = spawn('npx', ['tsx', 'server/index.ts'], { 
  stdio: 'inherit',
  env: process.env
});

// Handle server exit
server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});