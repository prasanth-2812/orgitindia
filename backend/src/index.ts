import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/authRoutes';
import messageRoutes from './routes/messageRoutes';
import groupRoutes from './routes/groupRoutes';
import taskRoutes from './routes/taskRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import notificationRoutes from './routes/notificationRoutes';
import organizationRoutes from './routes/organizationRoutes';
import documentTemplateRoutes from './routes/documentTemplateRoutes';
import documentRoutes from './routes/documentRoutes';
import documentInstanceRoutes from './routes/documentInstanceRoutes';
import complianceRoutes from './routes/complianceRoutes';
import taskMonitoringRoutes from './routes/taskMonitoringRoutes';
import superAdminDashboardRoutes from './routes/superAdminDashboardRoutes';
import userRoutes from './routes/userRoutes';
import platformSettingsRoutes from './routes/platformSettingsRoutes';
import chatUserRoutes from './routes/chatUserRoutes';
import conversationRoutes from './routes/conversationRoutes';
import contactRoutes from './routes/contactRoutes';
import { setupMessageHandlers } from './socket/messageHandlers';
import { setupTaskJobs } from './jobs/taskJobs';
import path from 'path';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow all origins for development (Expo, localhost, etc.)
      // In production, you should restrict this
      const allowedOrigins = process.env.SOCKET_CORS_ORIGIN?.split(',') || [
        'http://localhost:3001',
        'http://localhost:19006',
        'http://localhost:8081',
        'exp://localhost:8081',
        /^exp:\/\/.*/,
        /^http:\/\/.*/,
        /^https:\/\/.*/,
      ];

      // Check if origin matches any allowed pattern
      if (!origin || allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return origin === allowed || origin.startsWith(allowed);
        }
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return false;
      })) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all for now
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['polling', 'websocket'], // Try polling first (more reliable for mobile)
  allowEIO3: true, // Allow Engine.IO v3 clients
  pingTimeout: 60000, // Increase ping timeout
  pingInterval: 25000, // Increase ping interval
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:", "http://localhost:3000"],
      frameSrc: ["'self'", "blob:", "http://localhost:3000"],
      objectSrc: ["'self'", "blob:", "http://localhost:3000"],
      frameAncestors: ["'self'", "http://localhost:3001"],
      upgradeInsecureRequests: null,
    },
  },
  frameguard: false, // Allow iframes for PDF preview
}));

app.use(cors({
  origin: process.env.SOCKET_CORS_ORIGIN?.split(',') || ['http://localhost:3001', 'http://localhost:19006', 'exp://*', 'http://*'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Static files for PDF previews
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

import morgan from 'morgan';
app.use(morgan('dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/document-instances', documentInstanceRoutes);
app.use('/api/chat/users', chatUserRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/contacts', contactRoutes);

// Super Admin Routes
app.use('/api/super-admin/organizations', organizationRoutes);
app.use('/api/super-admin/document-templates', documentTemplateRoutes);
app.use('/api/super-admin/tasks', taskMonitoringRoutes);
app.use('/api/super-admin/dashboard', superAdminDashboardRoutes);
app.use('/api/super-admin/users', userRoutes);
app.use('/api/super-admin/settings', platformSettingsRoutes);
import adminRoutes from './routes/adminRoutes';
app.use('/api/admin', adminRoutes);

// Admin routes for departments, designations, and employees
import departmentRoutes from './routes/departmentRoutes';
import designationRoutes from './routes/designationRoutes';
import employeeRoutes from './routes/employeeRoutes';
app.use('/api/admin/departments', departmentRoutes);
app.use('/api/admin/designations', designationRoutes);
app.use('/api/admin/employees', employeeRoutes);

// Compliance Routes (accessible by both Super Admin and Admin)
app.use('/api/compliance', complianceRoutes);

// Make Socket.IO instance available to routes (matching message-backend pattern)
app.set('io', io);

// Setup Socket.io handlers
setupMessageHandlers(io);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Setup scheduled jobs
  setupTaskJobs();
});

export { io };

