import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cron from 'node-cron';

import { logger } from './utils/logger';
import { packageRoutes } from './routes/packages';
import { authRoutes } from './routes/auth';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { AlertService } from './services/alertService';
import { WebSocketService } from './services/websocketService';

dotenv.config();

const app: Express = express();
const server = createServer(app);

// ✅ FIXED: Allow multiple origins for CORS
const allowedOrigins = [
  'http://localhost:5173',                              // Local development
  'http://localhost:3000',                              // Alternative local port
  'https://aamira-courier-tracker.vercel.app',          // Your Vercel production URL
  'https://aamira-courier-client.vercel.app',           // Alternative Vercel URL pattern
  process.env.CLIENT_URL                                // Environment variable override
].filter(Boolean); // Remove any undefined values

const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aamira-courier';

// Initialize services
const websocketService = new WebSocketService(io);
const alertService = new AlertService(websocketService);

// Middleware
app.use(helmet());

// ✅ FIXED: CORS configuration to allow multiple origins
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ]
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin')
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    allowedOrigins: allowedOrigins
  });
});

// Base route
app.get('/', (req, res) => {
  res.json({
    message: 'Aamira Courier API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/packages', authMiddleware, packageRoutes(websocketService));

// Error handling
app.use(errorHandler);

// WebSocket connection handling
websocketService.initialize();

// Start stuck package monitoring (every 5 minutes)
cron.schedule('*/5 * * * *', () => {
  logger.info('Running stuck package check...');
  alertService.checkStuckPackages();
});

// Database connection
mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    logger.info('Allowed CORS origins:', allowedOrigins);
    
    // Start server - bind to 0.0.0.0 for Render
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`WebSocket server initialized`);
    });
  })
  .catch((error) => {
    logger.error('Database connection failed:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

export default app;