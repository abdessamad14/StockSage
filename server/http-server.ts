import express from 'express';
import { offlineApiRouter } from './offline-api';

const app = express();

// Explicitly disable HTTPS and force HTTP
app.disable('x-powered-by');

// Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add offline API routes
app.use('/api/offline', offlineApiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'HTTP Server is running' });
});

const PORT = 5003;
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 HTTP Backend server running on port ${PORT}`);
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api/offline`);
});

// Ensure HTTP only
server.on('clientError', (err, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});
