import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import morgan from 'morgan';
import { Server } from 'socket.io';

import connectDB from './utils/index.js';
import { initEmailService } from './utils/emailService.js';
import routes from './routes/index.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { socketAuthMiddleware } from './socket/socketAuth.js';

// Load environment from default .env, then fallback to utils/.ENV if needed
dotenv.config();
if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  dotenv.config({ path: './utils/.ENV' });
}

// Connect to MongoDB
await (async () => {
  await connectDB();
  await initEmailService();
})();

const app = express();
const PORT = process.env.PORT || 8800;

// CORS configuration: allow localhost on any port and optional FRONTEND_URL
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);
      if (allowedOrigins.includes(origin) || isLocalhost) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use('/api', routes);

// Serve uploaded files statically
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic health route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Placeholder root
app.get('/', (req, res) => {
  res.send('API running');
});

const isOriginAllowed = (origin) => {
  if (!origin) return true;

  const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);
  return allowedOrigins.includes(origin) || isLocalhost;
};

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  },
});

io.use(socketAuthMiddleware);
setupSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
