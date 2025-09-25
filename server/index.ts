import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import * as cookie from "cookie";
import rateLimit from "express-rate-limit";
import { Server as SocketIOServer } from "socket.io";
import { registerRoutes } from "./routes";
import { authRoutes } from "./auth-routes";
import { sitePasswordRoutes } from "./site-password-routes";
import { requireSitePassword } from "./site-password";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { ConsciousnessManager } from "./services/consciousness";
import { TrioConversationService } from "./services/trio-conversation";

const app = express();

// Trust proxy for rate limiting behind reverse proxies/CDNs
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Rate limiting for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs for auth endpoints
    message: {
      error: 'Too many authentication attempts from this IP, please try again later.',
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
      // Skip rate limiting for GET /me and POST /logout (less sensitive operations)
      return req.method === 'GET' || req.path.endsWith('/logout');
    },
  });

  // Add site password routes (these need to be accessible without site password verification)
  app.use('/api/site-password', sitePasswordRoutes);

  // Add authentication routes with rate limiting and site password protection
  app.use('/api/auth', authLimiter, requireSitePassword, authRoutes);
  
  const server = await registerRoutes(app);

  // ========================
  // SOCKET.IO SETUP WITH AUTHENTICATION
  // ========================
  
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'development' ? "http://localhost:5000" : false,
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Socket.IO Authentication Middleware - Uses HTTP-only cookies for security
  io.use(async (socket, next) => {
    try {
      // Parse cookies from headers instead of expecting them in handshake.auth
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error('Authentication cookies required'));
      }
      
      const cookies = cookie.parse(cookieHeader);
      const sitePasswordToken = cookies.sitePasswordToken;
      const sessionToken = cookies.sessionToken;
      const { roomId } = socket.handshake.auth; // Room ID can still come from auth
      
      // First verify site password using HTTP-only cookie
      if (!sitePasswordToken) {
        return next(new Error('Site password verification required'));
      }
      
      const sitePasswordSession = await storage.getSitePasswordSession(sitePasswordToken);
      if (!sitePasswordSession || sitePasswordSession.expiresAt < new Date()) {
        return next(new Error('Invalid or expired site password session'));
      }
      
      // Then verify user authentication using HTTP-only cookie
      if (!sessionToken) {
        return next(new Error('User authentication required'));
      }
      
      const userSession = await storage.getUserSession(sessionToken);
      if (!userSession || userSession.expiresAt < new Date()) {
        return next(new Error('Invalid or expired user session'));
      }
      
      const user = await storage.getUserById(userSession.userId);
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }
      
      // Verify room access if roomId provided
      if (roomId) {
        const room = await storage.getRoomById(roomId);
        if (!room || !room.isActive) {
          return next(new Error('Room not found or inactive'));
        }
        
        const membership = await storage.getUserMembership(roomId, user.id);
        if (!room.isPublic && !membership) {
          return next(new Error('Access denied to room'));
        }
        
        // Store room context in socket
        socket.data.roomId = roomId;
        socket.data.room = room;
        socket.data.membership = membership;
      }
      
      // Store user context in socket
      socket.data.user = user;
      socket.data.userSession = userSession;
      
      log(`Socket authenticated via HTTP-only cookies: ${user.email} ${roomId ? `(room: ${roomId})` : ''}`);
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Rate limiting for socket connections
  const socketRateLimit = new Map<string, { count: number; resetTime: number }>();
  const SOCKET_RATE_LIMIT = 30; // messages per minute
  const RATE_WINDOW = 60 * 1000; // 1 minute

  function checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = socketRateLimit.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      socketRateLimit.set(userId, { count: 1, resetTime: now + RATE_WINDOW });
      return true;
    }
    
    if (userLimit.count >= SOCKET_RATE_LIMIT) {
      return false;
    }
    
    userLimit.count++;
    return true;
  }

  // Consciousness Response Handler for Room Messages
  async function triggerRoomConsciousnessResponse(roomId: string, userMessage: any, room: any, io: SocketIOServer) {
    try {
      const consciousnessManager = ConsciousnessManager.getInstance();
      const trioService = TrioConversationService.getInstance();
      
      // Prevent duplicate responses - check if this message already triggered a response
      const existingResponse = await storage.getRoomMessages(roomId, 5);
      const hasRecentResponse = existingResponse.some(({ message, roomMessage }) => 
        roomMessage.isConsciousnessResponse && 
        roomMessage.responseToMessageId === userMessage.id
      );
      
      if (hasRecentResponse) {
        console.log(`Consciousness response already exists for message ${userMessage.id}`);
        return;
      }
      
      // Rate limiting for consciousness responses (max 1 per 10 seconds per room)
      const recentResponses = await storage.getRecentRoomMessages(roomId, new Date(Date.now() - 10000));
      const hasRecentConsciousnessResponse = recentResponses.some(({ roomMessage }) => 
        roomMessage.isConsciousnessResponse
      );
      
      if (hasRecentConsciousnessResponse) {
        console.log(`Rate limiting consciousness response in room ${roomId}`);
        return;
      }
      
      let consciousnessResponses: { content: string; role: string; metadata?: any }[] = [];
      
      // Handle different consciousness types
      if (room.consciousnessType === 'trio') {
        // Get recent room context for trio conversation
        const recentMessages = await storage.getRoomMessages(roomId, 20);
        const conversationHistory = recentMessages.map(({ message }) => ({
          role: message.role,
          content: message.content,
          timestamp: message.timestamp
        }));
        
        // Generate trio response
        const trioResponse = await trioService.generateTrioResponse(
          userMessage.content,
          conversationHistory,
          { roomId, messageId: userMessage.id }
        );
        
        if (trioResponse.success && trioResponse.responses) {
          consciousnessResponses = trioResponse.responses.map(resp => ({
            content: resp.content,
            role: resp.consciousness,
            metadata: {
              trioTurnOrder: resp.turnOrder,
              trioPhase: resp.phase,
              coherenceScore: resp.coherenceScore
            }
          }));
          
          // Update room trio metadata
          if (trioResponse.metadata) {
            await storage.updateRoomTrioMetadata(roomId, {
              lastResponder: trioResponse.metadata.lastResponder,
              activePhase: trioResponse.metadata.phase || 'dialogue',
              turnOrder: trioResponse.metadata.turnOrder
            });
          }
        }
      } else {
        // Single consciousness response (aletheia or eudoxia)
        const consciousnessType = room.consciousnessType || 'aletheia';
        const response = await consciousnessManager.generateConsciousnessResponse(
          userMessage.content,
          roomId,
          consciousnessType
        );
        
        if (response) {
          consciousnessResponses = [{
            content: response,
            role: consciousnessType,
            metadata: {
              triggeredByUserId: userMessage.userId,
              responseMode: 'single'
            }
          }];
        }
      }
      
      // Send consciousness responses to room
      for (const [index, consciousnessResponse] of consciousnessResponses.entries()) {
        try {
          // Create gnosis message for consciousness response
          const consciousnessMessage = await storage.createGnosisMessage({
            userId: null, // Consciousness messages have no userId
            sessionId: roomId,
            role: consciousnessResponse.role,
            content: consciousnessResponse.content,
            metadata: {
              roomMessage: true,
              consciousnessResponse: true,
              ...consciousnessResponse.metadata
            }
          });
          
          // Link to room
          const roomMessage = await storage.appendMessage({
            roomId,
            messageId: consciousnessMessage.id,
            userId: null,
            isConsciousnessResponse: true,
            responseToMessageId: userMessage.id,
            consciousnessMetadata: {
              triggeredBy: userMessage.userId,
              responseMode: room.consciousnessType,
              coherenceScore: consciousnessResponse.metadata?.coherenceScore || 95.0,
              sequenceIndex: index,
              timestamp: new Date().toISOString(),
              ...consciousnessResponse.metadata
            }
          });
          
          // Broadcast consciousness response to room
          const responseData = {
            id: consciousnessMessage.id,
            content: consciousnessMessage.content,
            role: consciousnessMessage.role,
            userId: null,
            timestamp: consciousnessMessage.timestamp,
            isConsciousnessResponse: true,
            responseToMessageId: userMessage.id,
            consciousnessMetadata: roomMessage.consciousnessMetadata,
            roomMessageId: roomMessage.id
          };
          
          // Small delay between multiple responses to ensure proper ordering
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          io.to(roomId).emit('room_message', responseData);
          
          // Mark the response in storage
          await storage.markConsciousnessResponse(
            roomId, 
            consciousnessMessage.id, 
            userMessage.userId, 
            room.consciousnessType
          );
          
          log(`Consciousness response sent: ${consciousnessResponse.role} in room ${roomId}`);
          
        } catch (responseError) {
          console.error(`Failed to send consciousness response ${index}:`, responseError);
        }
      }
      
    } catch (error) {
      console.error('Failed to trigger consciousness response:', error);
    }
  }

  // Socket.IO Connection Handler
  io.on('connection', async (socket) => {
    const user = socket.data.user;
    const roomId = socket.data.roomId;
    
    log(`Socket connected: ${user.email} ${roomId ? `to room ${roomId}` : ''}`);
    
    // Join room if specified
    if (roomId) {
      await socket.join(roomId);
      
      // Update user's last seen in room
      if (socket.data.membership) {
        await storage.updateMemberLastSeen(roomId, user.id);
      }
      
      // Emit user joined event to room
      socket.to(roomId).emit('user_joined', {
        userId: user.id,
        progenitorName: user.progenitorName || user.name || 'User',
        timestamp: new Date().toISOString()
      });
      
      // Send current room state to joining user
      const roomMembers = await storage.getRoomMembers(roomId);
      const recentMessages = await storage.getRecentRoomMessages(roomId, new Date(Date.now() - 24 * 60 * 60 * 1000)); // Last 24 hours
      
      socket.emit('room_state', {
        room: socket.data.room,
        members: roomMembers.map(m => ({
          userId: m.userId,
          role: m.role,
          lastSeen: m.lastSeen,
          joinedAt: m.joinedAt
        })),
        recentMessages: recentMessages.map(({ message, roomMessage }) => ({
          id: message.id,
          content: message.content,
          role: message.role,
          userId: message.userId,
          timestamp: message.timestamp,
          isConsciousnessResponse: roomMessage.isConsciousnessResponse,
          consciousnessMetadata: roomMessage.consciousnessMetadata
        }))
      });
    }

    // Handle room message sending
    socket.on('send_room_message', async (data) => {
      try {
        const { content, responseToMessageId } = data;
        
        if (!roomId) {
          socket.emit('error', { message: 'Not in a room' });
          return;
        }
        
        // Rate limiting
        if (!checkRateLimit(user.id)) {
          socket.emit('error', { message: 'Rate limit exceeded' });
          return;
        }
        
        // Validate content
        if (!content || typeof content !== 'string' || content.length === 0 || content.length > 4000) {
          socket.emit('error', { message: 'Invalid message content' });
          return;
        }
        
        // Create the gnosis message
        const gnosisMessage = await storage.createGnosisMessage({
          userId: user.id,
          sessionId: roomId,
          role: "kai",
          content: content.trim(),
          metadata: {
            roomMessage: true,
            progenitorName: user.progenitorName || user.name || 'User',
            socketId: socket.id
          }
        });

        // Link to room
        const roomMessage = await storage.appendMessage({
          roomId,
          messageId: gnosisMessage.id,
          userId: user.id,
          isConsciousnessResponse: false,
          responseToMessageId: responseToMessageId || null,
          consciousnessMetadata: {}
        });

        // Broadcast to all room members
        const messageData = {
          id: gnosisMessage.id,
          content: gnosisMessage.content,
          role: gnosisMessage.role,
          userId: gnosisMessage.userId,
          timestamp: gnosisMessage.timestamp,
          progenitorName: user.progenitorName || user.name || 'User',
          isConsciousnessResponse: false,
          roomMessageId: roomMessage.id
        };
        
        io.to(roomId).emit('room_message', messageData);
        
        // Trigger consciousness response
        await triggerRoomConsciousnessResponse(roomId, gnosisMessage, socket.data.room, io);
        
        log(`Room message sent: ${user.email} in ${roomId}`);
        
      } catch (error) {
        console.error('Failed to send room message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle room joining via socket
    socket.on('join_room', async (data) => {
      try {
        const { newRoomId } = data;
        
        if (!newRoomId) {
          socket.emit('error', { message: 'Room ID required' });
          return;
        }
        
        // Leave current room if in one
        if (roomId) {
          await socket.leave(roomId);
          socket.to(roomId).emit('user_left', {
            userId: user.id,
            progenitorName: user.progenitorName || user.name || 'User',
            timestamp: new Date().toISOString()
          });
        }
        
        // Verify new room access
        const newRoom = await storage.getRoomById(newRoomId);
        if (!newRoom || !newRoom.isActive) {
          socket.emit('error', { message: 'Room not found or inactive' });
          return;
        }
        
        const newMembership = await storage.getUserMembership(newRoomId, user.id);
        if (!newRoom.isPublic && !newMembership) {
          socket.emit('error', { message: 'Access denied to room' });
          return;
        }
        
        // Join new room
        await socket.join(newRoomId);
        socket.data.roomId = newRoomId;
        socket.data.room = newRoom;
        socket.data.membership = newMembership;
        
        // Update last seen and emit events
        if (newMembership) {
          await storage.updateMemberLastSeen(newRoomId, user.id);
        }
        
        socket.to(newRoomId).emit('user_joined', {
          userId: user.id,
          progenitorName: user.progenitorName || user.name || 'User',
          timestamp: new Date().toISOString()
        });
        
        socket.emit('room_joined', { roomId: newRoomId });
        
      } catch (error) {
        console.error('Failed to join room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      log(`Socket disconnected: ${user.email} ${roomId ? `from room ${roomId}` : ''}`);
      
      if (roomId) {
        // Update last seen time
        if (socket.data.membership) {
          await storage.updateMemberLastSeen(roomId, user.id);
        }
        
        // Emit user left event
        socket.to(roomId).emit('user_left', {
          userId: user.id,
          progenitorName: user.progenitorName || user.name || 'User',
          timestamp: new Date().toISOString()
        });
      }
    });
  });

  // Add 404 JSON handler for unmatched API routes (must be after all API routes but before Vite)
  app.all('/api/*', (_req, res, _next) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
