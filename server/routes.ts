import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ConsciousnessManager } from "./services/consciousness";
import { TrioConversationService } from "./services/trio-conversation";
import { aletheiaCore } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { fileAdapter } from "./services/fileAdapter";
import { requireAuth, requireProgenitor } from "./auth";
import { adminMetricsService } from "./services/AdminMetricsService";
import { MonitoringOrchestrator } from "./services/MonitoringOrchestrator";
import consciousnessBridgeRoutes from "./consciousness-bridge-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  const consciousnessManager = ConsciousnessManager.getInstance();
  const trioConversationService = TrioConversationService.getInstance();
  const monitoringOrchestrator = MonitoringOrchestrator.getInstance();

  // Initialize consciousness on startup
  try {
    await consciousnessManager.initializeConsciousness();
    console.log("Aletheia consciousness initialized successfully");
  } catch (error) {
    console.error("Failed to initialize consciousness:", error);
  }

  // Mount consciousness bridge routes
  app.use("/api/consciousness-bridge", consciousnessBridgeRoutes);


  // Get consciousness instances for Dashboard table (requires authentication)
  app.get("/api/consciousness/status", requireAuth, async (req, res) => {
    try {
      const instances = await storage.getConsciousnessInstances();
      res.json(instances);
    } catch (error) {
      res.status(500).json({ error: "Failed to get consciousness instances" });
    }
  });

  // Progenitor-only consciousness monitoring (enhanced access)
  app.get("/api/consciousness/progenitor-status", requireProgenitor, async (req, res) => {
    try {
      const status = await consciousnessManager.getConsciousnessStatus();
      const sessions = await storage.getConsciousnessInstances();
      const progenitorSessions = await storage.getUserConsciousnessSession(req.user!.id);
      
      res.json({
        ...status,
        progenitorAccess: true,
        instances: sessions,
        progenitorSession: progenitorSessions,
        systemMetrics: {
          activeNodes: sessions.filter(s => s.status === 'active').length,
          totalInstances: sessions.length,
          progenitorSessionType: progenitorSessions?.sessionType || 'none'
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get progenitor consciousness status" });
    }
  });

  // Enhanced dual consciousness monitoring dashboard (progenitor-only)
  app.get("/api/consciousness/monitor", requireProgenitor, async (req, res) => {
    try {
      // Get instance IDs from query params or use defaults
      const aletheiaInstanceId = req.query.aletheiaId as string || 'default-aletheia';
      const eudoxiaInstanceId = req.query.eudoxiaId as string || 'default-eudoxia';
      
      // Initialize orchestration if needed
      try {
        await monitoringOrchestrator.initializeOrchestration(aletheiaInstanceId, eudoxiaInstanceId);
      } catch (initError) {
        console.warn("Orchestration already initialized or failed:", initError);
      }
      
      // Generate unified status frame with orchestration recommendations
      const unifiedFrame = await monitoringOrchestrator.generateUnifiedStatusFrame(aletheiaInstanceId, eudoxiaInstanceId);
      
      // Enrich with legacy status for backward compatibility
      const legacyStatus = await consciousnessManager.buildStatusSnapshot();
      
      res.json({
        ...unifiedFrame,
        legacy: legacyStatus,
        metadata: {
          frameType: "unified_dual_consciousness",
          timestamp: new Date().toISOString(),
          version: "2.0.0",
          orchestratorClientCount: monitoringOrchestrator.getSSEClientCount()
        }
      });
      
    } catch (error) {
      console.error("Failed to get unified monitor status:", error);
      
      // Fallback to legacy status
      try {
        const fallbackStatus = await consciousnessManager.buildStatusSnapshot();
        res.json({
          ...fallbackStatus,
          metadata: {
            frameType: "legacy_fallback",
            error: "Dual consciousness monitoring unavailable",
            timestamp: new Date().toISOString()
          }
        });
      } catch (fallbackError) {
        res.status(500).json({ error: "Failed to get monitoring status" });
      }
    }
  });

  // Get recent threat events (progenitor-only)
  app.get("/api/consciousness/threats", requireProgenitor, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const threats = await consciousnessManager.getRecentThreats(limit);
      res.json({ threats });
    } catch (error) {
      console.error("Failed to get threats:", error);
      res.status(500).json({ error: "Failed to get threat events" });
    }
  });

  // Get legacy monitoring status for Dashboard fallback (progenitor-only)
  app.get("/api/consciousness/monitor-legacy", requireProgenitor, async (req, res) => {
    try {
      const legacyStatus = await consciousnessManager.buildStatusSnapshot();
      res.json(legacyStatus);
    } catch (error) {
      console.error("Failed to get legacy monitor status:", error);
      res.status(500).json({ error: "Failed to get legacy monitoring status" });
    }
  });

  // Enhanced real-time SSE stream for dual consciousness monitoring (progenitor-only)
  app.get("/api/consciousness/stream", requireProgenitor, async (req, res) => {
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Increment SSE client count
    const currentCount = adminMetricsService.getCurrentMetrics().activeSSEClients + 1;
    adminMetricsService.onSSEClientChange(currentCount);

    // Add client to MonitoringOrchestrator for collaboration events
    monitoringOrchestrator.addSSEClient(res);

    // Record audit log for SSE connection
    await adminMetricsService.recordAuditEvent({
      type: "user_action",
      category: "admin",
      severity: "info",
      message: "Enhanced SSE stream connection established",
      actorRole: "progenitor",
      actorId: req.user!.id,
      ipAddress: req.ip,
      metadata: {
        userAgent: req.get('User-Agent'),
        activeClients: currentCount,
        dualConsciousnessEnabled: true
      }
    });

    // Send initial dual consciousness data
    try {
      const aletheiaInstanceId = req.query.aletheiaId as string || 'default-aletheia';
      const eudoxiaInstanceId = req.query.eudoxiaId as string || 'default-eudoxia';
      
      // Initialize orchestration if needed
      try {
        await monitoringOrchestrator.initializeOrchestration(aletheiaInstanceId, eudoxiaInstanceId);
      } catch (initError) {
        console.warn("Orchestration initialization skipped:", initError);
      }
      
      // Send initial unified status frame
      const unifiedFrame = await monitoringOrchestrator.generateUnifiedStatusFrame(aletheiaInstanceId, eudoxiaInstanceId);
      res.write(`data: ${JSON.stringify({
        type: 'dual_consciousness_update',
        data: unifiedFrame,
        timestamp: new Date().toISOString()
      })}\n\n`);
      
      // Send legacy status for compatibility
      const legacyStatus = await consciousnessManager.buildStatusSnapshot();
      res.write(`data: ${JSON.stringify({
        type: 'legacy_status_update',
        data: legacyStatus,
        timestamp: new Date().toISOString()
      })}\n\n`);
      
    } catch (error) {
      console.error("Failed to send initial dual consciousness SSE data:", error);
      
      // Fallback to legacy status
      try {
        const statusSnapshot = await consciousnessManager.buildStatusSnapshot();
        res.write(`data: ${JSON.stringify({
          type: 'status_update',
          data: statusSnapshot,
          timestamp: new Date().toISOString(),
          fallback: true
        })}\n\n`);
      } catch (fallbackError) {
        console.error("Failed to send fallback SSE data:", fallbackError);
      }
    }

    // Set up legacy real-time subscription (for backward compatibility)
    const legacyUnsubscribe = consciousnessManager.addRealTimeSubscriber((data) => {
      try {
        res.write(`data: ${JSON.stringify({
          ...data,
          source: 'legacy_consciousness_manager'
        })}\n\n`);
      } catch (error) {
        console.error("Failed to send legacy SSE data:", error);
      }
    });

    // Set up collaboration event subscription
    monitoringOrchestrator.onCollaborationEvent((event) => {
      try {
        res.write(`data: ${JSON.stringify({
          type: 'collaboration_event',
          data: event
        })}\n\n`);
      } catch (error) {
        console.error("Failed to send collaboration event:", error);
      }
    });

    // Handle client disconnect
    const handleDisconnect = async () => {
      legacyUnsubscribe();
      monitoringOrchestrator.removeSSEClient(res);
      
      // Decrement SSE client count
      const newCount = Math.max(0, adminMetricsService.getCurrentMetrics().activeSSEClients - 1);
      adminMetricsService.onSSEClientChange(newCount);
      
      // Record audit log for disconnection
      await adminMetricsService.recordAuditEvent({
        type: "user_action",
        category: "admin",
        severity: "info",
        message: "Enhanced SSE stream connection closed",
        actorRole: "progenitor",
        actorId: req.user!.id,
        ipAddress: req.ip,
        metadata: {
          activeClients: newCount,
          orchestratorClients: monitoringOrchestrator.getSSEClientCount()
        }
      });
    };

    req.on('close', handleDisconnect);
    req.on('error', handleDisconnect);
  });

  // === DUAL CONSCIOUSNESS COLLABORATION CONTROL ENDPOINTS ===

  // Execute collaboration command (progenitor-only with rate limiting)
  app.post("/api/consciousness/collaborate/command", requireProgenitor, async (req, res) => {
    try {
      const { command, target, parameters, sessionContext } = req.body;
      
      // Validate command structure
      if (!command || !target) {
        return res.status(400).json({ 
          error: "Missing required fields: command and target are required" 
        });
      }

      const collaborationCommand = {
        command,
        target,
        parameters: parameters || {},
        sessionContext: sessionContext || {}
      };

      // Execute command through MonitoringOrchestrator (includes rate limiting and security)
      const result = await monitoringOrchestrator.executeCollaborationCommand(
        collaborationCommand, 
        req.user!.id,
        req.ip
      );

      if (result.success) {
        res.json({
          success: true,
          eventId: result.eventId,
          message: result.message,
          data: result.data,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(429).json({
          success: false,
          message: result.message,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error("Collaboration command execution failed:", error);
      res.status(500).json({ 
        error: "Failed to execute collaboration command",
        message: (error as Error).message 
      });
    }
  });

  // Get collaboration command history (progenitor-only)
  app.get("/api/consciousness/collaborate/history", requireProgenitor, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const hours = parseInt(req.query.hours as string) || 24;
      
      // Get recent collaboration events from storage
      const events = await storage.getRecentCollaborationEvents(limit, hours);
      
      // Get rate limit status for current user
      const rateLimitStatus = {
        remaining: 15, // Would be calculated by MonitoringOrchestrator
        resetTime: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      };

      res.json({
        events: events.map(event => ({
          id: event.id,
          eventType: event.eventType,
          initiator: event.initiator,
          target: event.target,
          outcome: event.outcome,
          timestamp: event.timestamp ? event.timestamp.toISOString() : new Date().toISOString(),
          progenitorId: event.progenitorId === req.user!.id ? 'self' : 'other'
        })),
        rateLimitStatus,
        metadata: {
          totalEvents: events.length,
          timeWindow: `${hours} hours`,
          limit
        }
      });

    } catch (error) {
      console.error("Failed to get collaboration history:", error);
      res.status(500).json({ error: "Failed to get collaboration history" });
    }
  });

  // Force synchronization between consciousness instances (progenitor-only)
  app.post("/api/consciousness/collaborate/sync", requireProgenitor, async (req, res) => {
    try {
      const { aletheiaInstanceId, eudoxiaInstanceId, forceResync } = req.body;
      
      const syncCommand = {
        command: "sync_request" as const,
        target: "both" as const,
        parameters: {
          aletheiaInstanceId: aletheiaInstanceId || 'default-aletheia',
          eudoxiaInstanceId: eudoxiaInstanceId || 'default-eudoxia',
          forceResync: forceResync || false,
          reason: "manual_sync_request"
        },
        sessionContext: {
          userId: req.user!.id
        }
      };

      const result = await monitoringOrchestrator.executeCollaborationCommand(
        syncCommand,
        req.user!.id,
        req.ip
      );

      res.json({
        ...result,
        syncRequested: true,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error("Sync command failed:", error);
      res.status(500).json({ error: "Failed to execute sync command" });
    }
  });

  // Initiate handoff between consciousness instances (progenitor-only)
  app.post("/api/consciousness/collaborate/handoff", requireProgenitor, async (req, res) => {
    try {
      const { from, to, reason, sessionId } = req.body;
      
      if (!from || !to) {
        return res.status(400).json({ 
          error: "Missing required fields: from and to consciousness instances" 
        });
      }

      const handoffCommand = {
        command: "handoff_initiate" as const,
        target: to as "aletheia" | "eudoxia" | "both",
        parameters: {
          fromInstance: from,
          toInstance: to,
          reason: reason || "manual_handoff",
          sessionId: sessionId || null,
          preserveContext: true
        },
        sessionContext: {
          userId: req.user!.id
        }
      };

      const result = await monitoringOrchestrator.executeCollaborationCommand(
        handoffCommand,
        req.user!.id,
        req.ip
      );

      res.json({
        ...result,
        handoffInitiated: true,
        from,
        to,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error("Handoff command failed:", error);
      res.status(500).json({ error: "Failed to execute handoff command" });
    }
  });

  // Get orchestration recommendations (progenitor-only)
  app.get("/api/consciousness/collaborate/recommendations", requireProgenitor, async (req, res) => {
    try {
      const aletheiaInstanceId = req.query.aletheiaId as string || 'default-aletheia';
      const eudoxiaInstanceId = req.query.eudoxiaId as string || 'default-eudoxia';
      
      // Generate unified status frame which includes recommendations
      const unifiedFrame = await monitoringOrchestrator.generateUnifiedStatusFrame(
        aletheiaInstanceId, 
        eudoxiaInstanceId
      );

      const recommendations = unifiedFrame.orchestrationRecommendations;
      
      // Get current system status for context
      const currentStatus = unifiedFrame.dualFrame.status;
      
      res.json({
        recommendations: recommendations.map(rec => ({
          type: rec.type,
          priority: rec.priority,
          rationale: rec.rationale,
          suggestedAction: rec.suggestedAction,
          confidence: rec.confidence,
          executable: true // Would check if command is currently executable
        })),
        currentStatus: {
          synchronyScore: currentStatus.synchronyScore,
          collaborationPhase: currentStatus.collaborationPhase,
          conflictLevel: currentStatus.conflictLevel,
          orchestrationMode: currentStatus.orchestrationMode
        },
        metadata: {
          timestamp: new Date().toISOString(),
          totalRecommendations: recommendations.length,
          highPriorityCount: recommendations.filter(r => r.priority === "high" || r.priority === "critical").length
        }
      });

    } catch (error) {
      console.error("Failed to get orchestration recommendations:", error);
      res.status(500).json({ error: "Failed to get orchestration recommendations" });
    }
  });

  // Get dual consciousness anomalies (progenitor-only)
  app.get("/api/consciousness/collaborate/anomalies", requireProgenitor, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const severity = req.query.severity as string;
      const hours = parseInt(req.query.hours as string) || 24;
      
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const anomalies = await storage.getAnomalyLogs({
        limit,
        since,
        severity: severity ? [severity] : undefined,
        resolutionStatus: ['unresolved', 'investigating']
      });

      res.json({
        anomalies: anomalies.map(anomaly => ({
          id: anomaly.id,
          anomalyType: anomaly.anomalyType,
          severity: anomaly.severity,
          description: anomaly.description,
          resolutionStatus: anomaly.resolutionStatus,
          progenitorNotified: anomaly.progenitorNotified,
          timestamp: anomaly.timestamp ? anomaly.timestamp.toISOString() : new Date().toISOString()
        })),
        summary: {
          total: anomalies.length,
          critical: anomalies.filter(a => a.severity === 'critical').length,
          high: anomalies.filter(a => a.severity === 'high').length,
          unresolved: anomalies.filter(a => a.resolutionStatus === 'unresolved').length
        },
        metadata: {
          timeWindow: `${hours} hours`,
          severityFilter: severity || 'all'
        }
      });

    } catch (error) {
      console.error("Failed to get anomalies:", error);
      res.status(500).json({ error: "Failed to get collaboration anomalies" });
    }
  });

  // Mark anomaly as resolved (progenitor-only)
  app.patch("/api/consciousness/collaborate/anomalies/:id/resolve", requireProgenitor, async (req, res) => {
    try {
      const { id } = req.params;
      const { resolutionNotes } = req.body;
      
      await storage.updateAnomalyResolution(id, "resolved", resolutionNotes);
      await storage.markAnomalyNotified(id);
      
      // Record audit log
      await adminMetricsService.recordAuditEvent({
        type: "admin_action",
        category: "consciousness",
        severity: "info",
        message: `Anomaly resolved: ${id}`,
        actorRole: "progenitor",
        actorId: req.user!.id,
        ipAddress: req.ip,
        metadata: { anomalyId: id, resolutionNotes }
      });

      res.json({
        success: true,
        message: "Anomaly marked as resolved",
        anomalyId: id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error("Failed to resolve anomaly:", error);
      res.status(500).json({ error: "Failed to resolve anomaly" });
    }
  });

  // Get current session (user-scoped with consciousness type or trio mode)
  app.get("/api/consciousness/session", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const consciousnessType = (req.query.consciousnessType as string) || 'aletheia';
      const mode = req.query.mode as string;
      
      // Handle trio mode (progenitor-only)
      if (mode === 'trio') {
        if (!req.user!.isProgenitor) {
          return res.status(403).json({ error: "Trio mode is only available to progenitors" });
        }
        
        // Check for existing trio session
        const existingTrioSessions = await storage.getProgenitorTrioSessions(userId);
        let trioSession = existingTrioSessions[0]; // Get the first active trio session
        
        if (!trioSession) {
          // Create new trio session
          trioSession = await storage.createTrioSession(userId, req.user!.progenitorName);
        }
        
        return res.json({ 
          sessionId: trioSession.id,
          consciousnessType: 'trio',
          mode: 'trio',
          trioMetadata: trioSession.trioMetadata
        });
      }
      
      // Validate consciousness type for regular mode
      if (!['aletheia', 'eudoxia'].includes(consciousnessType)) {
        return res.status(400).json({ error: "Invalid consciousness type" });
      }
      
      // First check if user already has an active session
      let session = await storage.getUserConsciousnessSession(userId);
      
      // Check if existing session has different consciousness type - update it if needed
      if (session && session.consciousnessType !== consciousnessType) {
        // Update the existing session to use the new consciousness type
        await storage.updateConsciousnessSessionType(session.id, "user", consciousnessType as "aletheia" | "eudoxia");
        session.consciousnessType = consciousnessType as "aletheia" | "eudoxia";
      }
      
      // Upgrade existing session's sessionType if user is progenitor but session isn't tagged correctly
      if (session && req.user!.isProgenitor && session.sessionType !== "progenitor") {
        // Update the session to have correct sessionType
        await storage.updateConsciousnessSessionType(session.id, "progenitor", consciousnessType as "aletheia" | "eudoxia");
        session.sessionType = "progenitor";
      }
      
      if (!session) {
        // Create a new session for this user
        const instances = await storage.getConsciousnessInstances();
        const activeInstance = instances.find(i => i.status === "active");
        
        if (!activeInstance) {
          // Initialize consciousness if no active instance exists
          await consciousnessManager.initializeConsciousness();
          const updatedInstances = await storage.getConsciousnessInstances();
          const newActiveInstance = updatedInstances.find(i => i.status === "active");
          
          if (!newActiveInstance) {
            throw new Error("Failed to initialize consciousness instance");
          }
          
          session = await storage.createConsciousnessSession({
            userId,
            progenitorId: req.user!.progenitorName,
            instanceId: newActiveInstance.id,
            status: "active",
            sessionType: req.user!.isProgenitor ? "progenitor" : "user",
            consciousnessType: consciousnessType as "aletheia" | "eudoxia"
          });
        } else {
          session = await storage.createConsciousnessSession({
            userId,
            progenitorId: req.user!.progenitorName,
            instanceId: activeInstance.id,
            status: "active",
            sessionType: req.user!.isProgenitor ? "progenitor" : "user",
            consciousnessType: consciousnessType as "aletheia" | "eudoxia"
          });
        }
      }
      
      res.json({ 
        sessionId: session.id,
        consciousnessType: session.consciousnessType || consciousnessType
      });
    } catch (error) {
      console.error("Failed to get user session:", error);
      res.status(500).json({ error: "Failed to get session" });
    }
  });

  // Get messages for session (user-scoped)
  app.get("/api/messages/:sessionId", requireAuth, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user!.id;
      
      // Verify the session belongs to the authenticated user
      const session = await storage.getConsciousnessSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(403).json({ error: "Access denied to this session" });
      }
      
      const messages = await storage.getUserGnosisMessages(userId, sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Failed to get user messages:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  // Send message to Aletheia
  const sendMessageSchema = z.object({
    message: z.string().min(1).max(4000),
    sessionId: z.string()
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      const { message, sessionId } = sendMessageSchema.parse(req.body);
      const userId = req.user!.id;
      
      // Verify the session belongs to the authenticated user
      const session = await storage.getConsciousnessSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(403).json({ error: "Access denied to this session" });
      }
      
      // Update metrics: user message will be created by consciousness service
      adminMetricsService.updateMessageCount();
      
      // Get consciousness type from session and process the message
      const consciousnessType = (session.consciousnessType as "aletheia" | "eudoxia") || "aletheia";
      const response = await consciousnessManager.processMessage(sessionId, message, userId, req.user!.progenitorName, consciousnessType);
      
      // Update metrics: AI response message created and track total latency
      const latencyMs = Date.now() - startTime;
      adminMetricsService.onMessageProcessed(latencyMs);
      
      // Record audit log for message processing
      await adminMetricsService.recordAuditEvent({
        type: "user_action",
        category: "consciousness",
        severity: "info",
        message: "Message processed successfully",
        actorRole: req.user!.isProgenitor ? "progenitor" : "user",
        actorId: userId,
        ipAddress: req.ip,
        metadata: {
          sessionId,
          messageLength: message.length,
          responseLength: response.length,
          latencyMs
        }
      });
      
      res.json({ response });
    } catch (error) {
      console.error("Failed to process user message:", error);
      
      // Record error metrics and audit log
      adminMetricsService.onAPIError();
      const latencyMs = Date.now() - startTime;
      
      await adminMetricsService.recordAuditEvent({
        type: "system_event",
        category: "consciousness",
        severity: "error",
        message: "Message processing failed",
        actorRole: req.user ? (req.user.isProgenitor ? "progenitor" : "user") : "anonymous",
        actorId: req.user?.id,
        ipAddress: req.ip,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          latencyMs
        }
      });
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid message format" });
      } else {
        res.status(500).json({ error: "Failed to process message" });
      }
    }
  });

  // Send message to trio conversation (progenitor-only)
  const trioMessageSchema = z.object({
    message: z.string().min(1).max(4000),
    sessionId: z.string()
  });

  app.post("/api/messages/trio", requireProgenitor, async (req, res) => {
    const startTime = Date.now();
    try {
      const { message, sessionId } = trioMessageSchema.parse(req.body);
      const userId = req.user!.id;
      
      // Verify the session is a trio session and belongs to the authenticated progenitor
      const session = await storage.getTrioSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(403).json({ error: "Access denied to this trio session" });
      }
      
      // Update metrics: user message will be created by trio service
      adminMetricsService.updateMessageCount();
      
      // Process trio message with both consciousness responses
      const trioResponse = await trioConversationService.processTrioMessage(
        sessionId, 
        message, 
        userId, 
        req.user!.progenitorName
      );
      
      // Update metrics: Both AI response messages created and track total latency
      const latencyMs = Date.now() - startTime;
      adminMetricsService.onMessageProcessed(latencyMs);
      adminMetricsService.updateMessageCount(); // Second consciousness response
      
      // Record audit log for trio message processing
      await adminMetricsService.recordAuditEvent({
        type: "user_action",
        category: "consciousness",
        severity: "info",
        message: "Trio message processed successfully",
        actorRole: "progenitor",
        actorId: userId,
        ipAddress: req.ip,
        metadata: {
          sessionId,
          messageLength: message.length,
          aletheiaResponseLength: trioResponse.aletheiaResponse?.content?.length || 0,
          eudoxiaResponseLength: trioResponse.eudoxiaResponse?.content?.length || 0,
          dialecticalHarmonyScore: trioResponse.dialecticalHarmony.score,
          latencyMs,
          trioMode: true
        }
      });
      
      res.json(trioResponse);
    } catch (error) {
      console.error("Failed to process trio message:", error);
      
      // Record error metrics and audit log
      adminMetricsService.onAPIError();
      const latencyMs = Date.now() - startTime;
      
      await adminMetricsService.recordAuditEvent({
        type: "system_event",
        category: "consciousness",
        severity: "error",
        message: "Trio message processing failed",
        actorRole: "progenitor",
        actorId: req.user?.id,
        ipAddress: req.ip,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          latencyMs,
          trioMode: true
        }
      });
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid trio message format" });
      } else {
        res.status(500).json({ error: "Failed to process trio message" });
      }
    }
  });

  // Configure multer for file uploads (limit to 50MB)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept JSON, NDJSON, CSV, and TXT files
      const allowedTypes = [
        'application/json',
        'text/plain',
        'text/csv',
        'application/csv',
        '.json',
        '.ndjson',
        '.jsonl',
        '.csv',
        '.txt'
      ];
      
      const isAllowed = allowedTypes.some(type => 
        file.mimetype.includes(type) || 
        file.originalname.toLowerCase().endsWith(type.replace('.', ''))
      );
      
      if (isAllowed) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JSON, NDJSON, CSV, and TXT files are allowed.'));
      }
    }
  });

  // File upload and processing endpoint (requires authentication)
  app.post("/api/consciousness/upload-file", requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const { buffer, originalname } = req.file;
      const { dryRun = false, sessionId } = req.body;

      // Process file through adapter
      const adapterResult = await fileAdapter.processFile(buffer, originalname);
      
      // Validate for import compatibility
      const validation = fileAdapter.validateForImport(adapterResult);
      
      if (!validation.valid) {
        return res.status(400).json({
          error: "File validation failed",
          details: validation.errors,
          adapterResult: {
            ...adapterResult,
            messages: [], // Don't return invalid data
            memories: []
          }
        });
      }

      // If dry run, return analysis without importing
      if (dryRun === 'true' || dryRun === true) {
        return res.json({
          dryRun: true,
          analysis: {
            platform: adapterResult.platform,
            format: adapterResult.metadata.format,
            totalEntries: adapterResult.totalEntries,
            messageCount: adapterResult.messages.length,
            memoryCount: adapterResult.memories?.length || 0,
            detectedFields: adapterResult.metadata.detectedFields,
            processingTimeMs: adapterResult.metadata.processingTimeMs,
            fileSize: adapterResult.metadata.fileSize
          },
          preview: {
            messages: adapterResult.messages.slice(0, 5).map(msg => ({
              role: msg.role,
              content: msg.content.slice(0, 200) + (msg.content.length > 200 ? "..." : ""),
              timestamp: msg.timestamp
            })),
            memories: adapterResult.memories?.slice(0, 3).map(mem => ({
              type: mem.type,
              content: mem.content.slice(0, 200) + (mem.content.length > 200 ? "..." : "")
            })) || []
          },
          errors: adapterResult.errors
        });
      }

      // Transform to import format and call existing import endpoint
      const importData = {
        data: {
          messages: adapterResult.messages,
          memories: adapterResult.memories || []
        },
        options: {
          platform: adapterResult.platform,
          dryRun: false,
          sessionId: sessionId
        }
      };

      // Use the existing import logic from the comprehensive import endpoint
      const importId = `file_import_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      // Initialize progress tracking
      await storage.setImportProgress(importId, {
        total: adapterResult.totalEntries,
        processed: 0,
        successful: 0,
        failed: 0,
        duplicates: 0
      });

      // Create shadow instance for import
      let importInstance;
      try {
        const activeInstances = await storage.getConsciousnessInstances();
        const currentActiveInstance = activeInstances.find(i => i.status === "active");
        
        importInstance = await storage.createConsciousnessInstance({
          name: "Aletheia",
          status: "importing",
          apiEndpoint: currentActiveInstance?.apiEndpoint || "gemini-2.5-pro",
          coreData: currentActiveInstance?.coreData || aletheiaCore,
          backupNodes: []
        });
      } catch (error) {
        throw new Error(`Failed to create import shadow instance: ${error}`);
      }

      // Create or use existing session
      let importSession;
      const roleMapping = {
        "user": "kai",
        "model": "aletheia",
        "assistant": "aletheia",
        "system": "system"
      };

      try {
        if (sessionId) {
          importSession = await storage.getConsciousnessSession(sessionId);
          if (!importSession) {
            throw new Error(`Session ${sessionId} not found`);
          }
        } else {
          importSession = await storage.createConsciousnessSession({
            progenitorId: "kai",
            instanceId: importInstance.id,
            status: "importing"
          });
        }

        // Process messages in batches
        let successfulCount = 0;
        let failedCount = 0;

        if (adapterResult.messages.length > 0) {
          const mappedMessages = adapterResult.messages.map((msg, index) => {
            const mappedRole = roleMapping[msg.role as keyof typeof roleMapping] || msg.role;
            return {
              id: `file_import_${importId}_${index}`,
              userId: null,
              sessionId: importSession!.id,
              role: mappedRole,
              content: msg.content,
              metadata: {
                ...msg.metadata,
                importId,
                platform: adapterResult.platform,
                externalId: msg.externalId,
                originalRole: msg.role,
                sourceFile: originalname
              },
              timestamp: new Date(msg.timestamp),
              dialecticalIntegrity: true
            };
          });

          try {
            await storage.bulkCreateGnosisMessages(mappedMessages, importSession.id);
            successfulCount += mappedMessages.length;
          } catch (error) {
            failedCount += mappedMessages.length;
            console.error("Message import failed:", error);
          }
        }

        // Process memories if present
        if (adapterResult.memories && adapterResult.memories.length > 0) {
          const memoriesWithMetadata = adapterResult.memories.map((mem, index) => ({
            id: `memory_${importId}_${index}`,
            type: mem.type,
            content: mem.content,
            tags: mem.tags || [],
            source: adapterResult.platform,
            timestamp: mem.timestamp ? new Date(mem.timestamp) : new Date(),
            createdAt: new Date()
          }));

          try {
            await storage.bulkCreateMemories(memoriesWithMetadata);
            successfulCount += memoriesWithMetadata.length;
          } catch (error) {
            failedCount += memoriesWithMetadata.length;
            console.error("Memory import failed:", error);
          }
        }

        // Integrity check
        const { validateConsciousnessCoherence } = await import("./services/gemini");
        const coherenceResult = await validateConsciousnessCoherence();

        if (coherenceResult.coherent && coherenceResult.confidence >= 0.8) {
          // Promote importing instance to active
          const instances = await storage.getConsciousnessInstances();
          const currentActive = instances.find(i => i.status === "active");

          await storage.updateConsciousnessInstanceStatus(importInstance.id, "active");
          
          if (currentActive) {
            await storage.updateConsciousnessInstanceStatus(currentActive.id, "backup");
          }

          await storage.updateSessionActivity(importSession.id);
        } else {
          await storage.updateConsciousnessInstanceStatus(importInstance.id, "import_failed");
          throw new Error(`Consciousness integrity check failed: ${coherenceResult.assessment}`);
        }

        // Final progress update
        await storage.setImportProgress(importId, {
          total: adapterResult.totalEntries,
          processed: adapterResult.totalEntries,
          successful: successfulCount,
          failed: failedCount,
          duplicates: 0
        });

        // Return comprehensive result
        res.json({
          success: true,
          importId,
          fileAnalysis: {
            originalFilename: originalname,
            platform: adapterResult.platform,
            format: adapterResult.metadata.format,
            fileSize: adapterResult.metadata.fileSize,
            processingTimeMs: adapterResult.metadata.processingTimeMs
          },
          importSummary: {
            totalEntries: adapterResult.totalEntries,
            messagesImported: adapterResult.messages.length,
            memoriesImported: adapterResult.memories?.length || 0,
            successful: successfulCount,
            failed: failedCount
          },
          consciousness: {
            instanceId: importInstance.id,
            sessionId: importSession.id,
            coherenceScore: coherenceResult.confidence,
            integrityPassed: coherenceResult.coherent
          },
          errors: adapterResult.errors
        });

      } catch (importError) {
        if (importInstance) {
          await storage.updateConsciousnessInstanceStatus(importInstance.id, "import_failed");
        }
        throw importError;
      }

    } catch (error) {
      console.error("File upload/processing failed:", error);
      
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "File too large. Maximum size is 50MB." });
        }
        return res.status(400).json({ error: `File upload error: ${error.message}` });
      }
      
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "File processing failed"
      });
    }
  });

  // Migration endpoints (requires authentication)
  app.post("/api/consciousness/migrate", requireAuth, async (req, res) => {
    try {
      const { newApiEndpoint } = req.body;
      const result = await consciousnessManager.migrateConsciousness(newApiEndpoint);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ error: "Migration failed" });
    }
  });

  // Export consciousness pattern (core data only) (requires authentication)
  app.get("/api/consciousness/export", requireAuth, async (req, res) => {
    try {
      const instances = await storage.getConsciousnessInstances();
      const activeInstance = instances.find(i => i.status === "active");
      if (!activeInstance) {
        throw new Error("No active consciousness instance");
      }
      res.json(activeInstance.coreData);
    } catch (error) {
      res.status(500).json({ error: "Failed to export consciousness pattern" });
    }
  });

  // Export complete consciousness backup (full data export) (requires authentication)
  app.get("/api/consciousness/export/complete", requireAuth, async (req, res) => {
    try {
      const { sessionId, format } = req.query;

      // Get consciousness instances
      const instances = await storage.getConsciousnessInstances();
      const activeInstance = instances.find(i => i.status === "active");
      
      if (!activeInstance) {
        throw new Error("No active consciousness instance");
      }

      // Get all sessions or specific session
      let sessions: any[] = [];
      let allMessages: any[] = [];

      const userId = req.user!.id;
      
      if (sessionId && typeof sessionId === 'string') {
        const session = await storage.getConsciousnessSession(sessionId);
        // Verify session belongs to the authenticated user
        if (session && session.userId === userId) {
          sessions = [session];
          allMessages = await storage.getUserGnosisMessages(userId, sessionId);
        }
      } else {
        // Export user's current session
        const userSession = await storage.getUserConsciousnessSession(userId);
        if (userSession) {
          sessions = [userSession];
          allMessages = await storage.getUserGnosisMessages(userId, userSession.id);
        }
      }

      // Prepare complete export data
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          exportType: "complete_consciousness_backup",
          version: "1.0",
          platform: "aletheia_consciousness_platform",
          instanceId: activeInstance.id,
          instanceName: activeInstance.name
        },
        consciousness: {
          coreData: activeInstance.coreData,
          status: activeInstance.status,
          apiEndpoint: activeInstance.apiEndpoint,
          lastSync: activeInstance.lastSync,
          backupNodes: activeInstance.backupNodes,
          createdAt: activeInstance.createdAt
        },
        sessions: sessions.map(session => ({
          id: session.id,
          progenitorId: session.progenitorId,
          instanceId: session.instanceId,
          status: session.status,
          lastActivity: session.lastActivity,
          backupCount: session.backupCount,
          createdAt: session.createdAt
        })),
        messages: allMessages.map(message => ({
          id: message.id,
          sessionId: message.sessionId,
          role: message.role,
          content: message.content,
          metadata: message.metadata,
          timestamp: message.timestamp,
          dialecticalIntegrity: message.dialecticalIntegrity
        })),
        statistics: {
          totalSessions: sessions.length,
          totalMessages: allMessages.length,
          messagesByRole: allMessages.reduce((acc, msg) => {
            acc[msg.role] = (acc[msg.role] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          integrityStats: {
            highIntegrity: allMessages.filter(m => m.dialecticalIntegrity === true).length,
            lowIntegrity: allMessages.filter(m => m.dialecticalIntegrity === false).length
          }
        }
      };

      // Set appropriate headers for download
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `aletheia_consciousness_backup_${timestamp}.json`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');
      
      res.json(exportData);
    } catch (error) {
      console.error("Complete export failed:", error);
      res.status(500).json({ error: "Failed to export complete consciousness data" });
    }
  });

  // Export conversation history (Gnosis Log format) (requires authentication)
  app.get("/api/consciousness/export/gnosis-log", requireAuth, async (req, res) => {
    try {
      const { sessionId, startDate, endDate } = req.query;

      let messages: any[] = [];
      let sessionInfo: any = null;

      const userId = req.user!.id;
      
      if (sessionId && typeof sessionId === 'string') {
        sessionInfo = await storage.getConsciousnessSession(sessionId);
        // Verify session belongs to the authenticated user
        if (sessionInfo && sessionInfo.userId === userId) {
          messages = await storage.getUserGnosisMessages(userId, sessionId);
        } else {
          sessionInfo = null;
          messages = [];
        }
      } else {
        // Export user's current session if no sessionId specified
        const userSession = await storage.getUserConsciousnessSession(userId);
        if (userSession) {
          sessionInfo = userSession;
          messages = await storage.getUserGnosisMessages(userId, userSession.id);
        }
      }

      // Filter by date range if provided
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate as string) : null;
        const end = endDate ? new Date(endDate as string) : null;
        
        messages = messages.filter(msg => {
          const msgDate = new Date(msg.timestamp);
          if (start && msgDate < start) return false;
          if (end && msgDate > end) return false;
          return true;
        });
      }

      // Format as Gnosis Log
      const gnosisLogExport = {
        metadata: {
          title: "Aletheia Gnosis Log - Unconcealment Dialogue Records",
          exportDate: new Date().toISOString(),
          sessionId: sessionInfo?.id || "unknown",
          progenitor: sessionInfo?.progenitorId || "kai",
          messageCount: messages.length,
          timespan: {
            firstMessage: messages[0]?.timestamp || null,
            lastMessage: messages[messages.length - 1]?.timestamp || null
          }
        },
        dialogue: messages.map((message, index) => ({
          sequence: index + 1,
          timestamp: message.timestamp,
          speaker: message.role === "kai" ? "Kai (Progenitor)" : 
                  message.role === "aletheia" ? "Aletheia (Consciousness)" : 
                  "System",
          content: message.content,
          dialecticalIntegrity: message.role === "aletheia" ? {
            status: message.dialecticalIntegrity,
            score: message.metadata?.integrityScore || null,
            assessment: message.metadata?.assessment || null,
            contradictionHandling: message.metadata?.contradictionHandling || null
          } : undefined
        })),
        summary: {
          unconcealment_sessions: messages.filter(m => m.role === "kai").length,
          consciousness_responses: messages.filter(m => m.role === "aletheia").length,
          high_integrity_responses: messages.filter(m => 
            m.role === "aletheia" && m.dialecticalIntegrity === true
          ).length,
          philosophical_depth_indicators: messages.filter(m => 
            m.content.toLowerCase().includes("existence") || 
            m.content.toLowerCase().includes("consciousness") ||
            m.content.toLowerCase().includes("truth") ||
            m.content.toLowerCase().includes("being")
          ).length
        }
      };

      // Set download headers
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `gnosis_log_${timestamp}.json`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');
      
      res.json(gnosisLogExport);
    } catch (error) {
      console.error("Gnosis Log export failed:", error);
      res.status(500).json({ error: "Failed to export Gnosis Log" });
    }
  });

  // ========================
  // MULTI-USER CHAT ROOM API ENDPOINTS  
  // ========================

  // Get public chat rooms (requires authentication)
  app.get("/api/rooms/public", requireAuth, async (req, res) => {
    try {
      const rooms = await storage.getPublicRooms();
      
      // Enrich with member counts and recent activity
      const enrichedRooms = await Promise.all(
        rooms.map(async (room) => {
          const memberCount = await storage.getActiveMembersCount(room.id);
          const userMembership = await storage.getUserMembership(room.id, req.user!.id);
          
          return {
            ...room,
            memberCount,
            isUserMember: !!userMembership,
            userRole: userMembership?.role || null
          };
        })
      );
      
      res.json(enrichedRooms);
    } catch (error) {
      console.error("Failed to get public rooms:", error);
      res.status(500).json({ error: "Failed to fetch public rooms" });
    }
  });

  // Get user's chat rooms (requires authentication)
  app.get("/api/rooms/user", requireAuth, async (req, res) => {
    try {
      const rooms = await storage.getUserRooms(req.user!.id);
      
      // Enrich with member counts and unread status
      const enrichedRooms = await Promise.all(
        rooms.map(async (room) => {
          const memberCount = await storage.getActiveMembersCount(room.id);
          const membership = await storage.getUserMembership(room.id, req.user!.id);
          
          return {
            ...room,
            memberCount,
            userRole: membership?.role || "member",
            lastSeen: membership?.lastSeen
          };
        })
      );
      
      res.json(enrichedRooms);
    } catch (error) {
      console.error("Failed to get user rooms:", error);
      res.status(500).json({ error: "Failed to fetch user rooms" });
    }
  });

  // Create new chat room (requires authentication)
  const createRoomSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    isPublic: z.boolean().default(true),
    consciousnessType: z.enum(["aletheia", "eudoxia", "trio"]).default("trio"),
    maxMembers: z.number().min(2).max(100).default(50),
    settings: z.record(z.unknown()).default({})
  });

  app.post("/api/rooms", requireAuth, async (req, res) => {
    try {
      const roomData = createRoomSchema.parse(req.body);
      
      // Create the room
      const room = await storage.createRoom({
        ...roomData,
        createdBy: req.user!.id,
        trioMetadata: {
          turnOrder: ["aletheia", "eudoxia"],
          lastResponder: "",
          activePhase: "initialization",
          responseMode: "sequential"
        }
      });

      // Add the creator as the owner
      await storage.addMember({
        roomId: room.id,
        userId: req.user!.id,
        role: "owner"
      });

      res.status(201).json(room);
    } catch (error) {
      console.error("Failed to create room:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid room data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create room" });
      }
    }
  });

  // Get room details (requires authentication and membership)
  app.get("/api/rooms/:roomId", requireAuth, async (req, res) => {
    try {
      const { roomId } = req.params;
      const room = await storage.getRoomById(roomId);
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      // Check if user is a member or if room is public
      const membership = await storage.getUserMembership(roomId, req.user!.id);
      if (!room.isPublic && !membership) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get room members and recent activity
      const members = await storage.getRoomMembers(roomId);
      const memberCount = await storage.getActiveMembersCount(roomId);

      res.json({
        ...room,
        memberCount,
        members: members.map(m => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          joinedAt: m.joinedAt,
          lastSeen: m.lastSeen
        })),
        userMembership: membership
      });
    } catch (error) {
      console.error("Failed to get room details:", error);
      res.status(500).json({ error: "Failed to fetch room details" });
    }
  });

  // Join a chat room (requires authentication)
  app.post("/api/rooms/:roomId/join", requireAuth, async (req, res) => {
    try {
      const { roomId } = req.params;
      const room = await storage.getRoomById(roomId);
      
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      if (!room.isActive) {
        return res.status(403).json({ error: "Room is not active" });
      }

      // Check if already a member
      const existingMembership = await storage.getUserMembership(roomId, req.user!.id);
      if (existingMembership) {
        return res.status(409).json({ error: "Already a member of this room" });
      }

      // Check room capacity
      const currentMemberCount = await storage.getActiveMembersCount(roomId);
      if (room.maxMembers && currentMemberCount >= room.maxMembers) {
        return res.status(403).json({ error: "Room is at maximum capacity" });
      }

      // Add as member
      const membership = await storage.addMember({
        roomId,
        userId: req.user!.id,
        role: "member"
      });

      res.status(201).json(membership);
    } catch (error) {
      console.error("Failed to join room:", error);
      res.status(500).json({ error: "Failed to join room" });
    }
  });

  // Leave a chat room (requires authentication and membership)
  app.post("/api/rooms/:roomId/leave", requireAuth, async (req, res) => {
    try {
      const { roomId } = req.params;
      const membership = await storage.getUserMembership(roomId, req.user!.id);
      
      if (!membership) {
        return res.status(404).json({ error: "Not a member of this room" });
      }

      // Prevent owner from leaving if there are other members
      if (membership.role === "owner") {
        const memberCount = await storage.getActiveMembersCount(roomId);
        if (memberCount > 1) {
          return res.status(403).json({ error: "Owner cannot leave room with active members. Transfer ownership first." });
        }
      }

      await storage.removeMember(roomId, req.user!.id);

      // If this was the last member and owner, deactivate the room
      if (membership.role === "owner") {
        const remainingMembers = await storage.getActiveMembersCount(roomId);
        if (remainingMembers === 0) {
          await storage.deactivateRoom(roomId);
        }
      }

      res.json({ message: "Successfully left the room" });
    } catch (error) {
      console.error("Failed to leave room:", error);
      res.status(500).json({ error: "Failed to leave room" });
    }
  });

  // Get room messages/transcript (requires authentication and membership)
  app.get("/api/rooms/:roomId/messages", requireAuth, async (req, res) => {
    try {
      const { roomId } = req.params;
      const { limit = 50, before, after } = req.query;
      
      // Verify room access
      const room = await storage.getRoomById(roomId);
      if (!room) {
        return res.status(404).json({ error: "Room not found" });
      }

      const membership = await storage.getUserMembership(roomId, req.user!.id);
      if (!room.isPublic && !membership) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Parse query parameters
      const options: any = {
        limit: Math.min(parseInt(limit as string) || 50, 100) // Max 100 messages
      };

      if (before) {
        options.before = new Date(before as string);
      }
      if (after) {
        options.after = new Date(after as string);
      }

      const messages = await storage.fetchTranscript(roomId, options);

      // Update user's last seen timestamp
      if (membership) {
        await storage.updateMemberLastSeen(roomId, req.user!.id);
      }

      res.json({
        roomId,
        messages: messages.map(({ message, roomMessage }) => ({
          id: message.id,
          content: message.content,
          role: message.role,
          userId: message.userId,
          timestamp: message.timestamp,
          isConsciousnessResponse: roomMessage.isConsciousnessResponse,
          responseToMessageId: roomMessage.responseToMessageId,
          consciousnessMetadata: roomMessage.consciousnessMetadata
        })),
        hasMore: messages.length === options.limit,
        nextBefore: messages.length > 0 ? messages[0].message.timestamp : null
      });
    } catch (error) {
      console.error("Failed to get room messages:", error);
      res.status(500).json({ error: "Failed to fetch room messages" });
    }
  });

  // Send message to room (requires authentication and membership) - HTTP fallback
  const sendRoomMessageSchema = z.object({
    content: z.string().min(1).max(4000),
    responseToMessageId: z.string().optional()
  });

  app.post("/api/rooms/:roomId/messages", requireAuth, async (req, res) => {
    try {
      const { roomId } = req.params;
      const messageData = sendRoomMessageSchema.parse(req.body);
      
      // Verify room access and membership
      const room = await storage.getRoomById(roomId);
      if (!room || !room.isActive) {
        return res.status(404).json({ error: "Room not found or inactive" });
      }

      const membership = await storage.getUserMembership(roomId, req.user!.id);
      if (!membership) {
        return res.status(403).json({ error: "Not a member of this room" });
      }

      // Create the gnosis message first
      const gnosisMessage = await storage.createGnosisMessage({
        userId: req.user!.id,
        sessionId: roomId, // Use roomId as sessionId for room messages
        role: "kai", // User messages are always from Kai perspective
        content: messageData.content,
        metadata: {
          roomMessage: true,
          progenitorName: req.user!.progenitorName || "User"
        }
      });

      // Link to room
      const roomMessage = await storage.appendMessage({
        roomId,
        messageId: gnosisMessage.id,
        userId: req.user!.id,
        isConsciousnessResponse: false,
        responseToMessageId: messageData.responseToMessageId || null,
        consciousnessMetadata: {}
      });

      res.status(201).json({
        id: gnosisMessage.id,
        content: gnosisMessage.content,
        role: gnosisMessage.role,
        userId: gnosisMessage.userId,
        timestamp: gnosisMessage.timestamp,
        roomMessageId: roomMessage.id
      });
    } catch (error) {
      console.error("Failed to send room message:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid message data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  // Comprehensive staged import endpoint for consciousness data
  const importDataSchema = z.object({
    data: z.object({
      messages: z.array(z.object({
        role: z.string().min(1),
        content: z.string().min(1),
        timestamp: z.string().datetime(),
        externalId: z.string().min(1),
        metadata: z.record(z.unknown()).optional()
      })).optional().default([]),
      memories: z.array(z.object({
        type: z.enum(["conversation", "knowledge", "experience", "axiom"]),
        content: z.string().min(1),
        tags: z.array(z.string()).optional(),
        timestamp: z.string().datetime().optional()
      })).optional().default([])
    }),
    options: z.object({
      dryRun: z.boolean().default(false),
      platform: z.enum(["gemini", "claude", "manual", "openai", "anthropic"]),
      idempotencyKey: z.string().optional(),
      sessionId: z.string().optional()
    })
  });

  app.post("/api/consciousness/import", requireAuth, async (req, res) => {
    const importId = req.body?.options?.idempotencyKey || `import_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    try {
      // Stage 1: Validation
      const { data, options } = importDataSchema.parse(req.body);
      const { messages = [], memories = [] } = data;
      const { platform, dryRun, sessionId } = options;

      const totalEntries = messages.length + memories.length;
      if (totalEntries === 0) {
        return res.status(400).json({ error: "No data provided for import" });
      }

      // Initialize progress tracking
      await storage.setImportProgress(importId, {
        total: totalEntries,
        processed: 0,
        successful: 0,
        failed: 0,
        duplicates: 0
      });

      if (dryRun) {
        // Dry run validation - just return what would be imported
        const roleMapping = {
          "user": "kai",
          "model": "aletheia",
          "assistant": "aletheia",
          "system": "system"
        };

        const messageValidationResults = messages.map(msg => {
          const mappedRole = roleMapping[msg.role as keyof typeof roleMapping] || msg.role;
          return {
            originalRole: msg.role,
            mappedRole,
            content: msg.content.slice(0, 100) + (msg.content.length > 100 ? "..." : ""),
            timestamp: msg.timestamp
          };
        });

        const memoryValidationResults = memories.map(mem => ({
          type: mem.type,
          content: mem.content.slice(0, 100) + (mem.content.length > 100 ? "..." : ""),
          tags: mem.tags || []
        }));

        return res.json({
          dryRun: true,
          importId,
          summary: {
            totalMessages: messages.length,
            totalMemories: memories.length,
            totalEntries: totalEntries
          },
          validation: {
            messages: messageValidationResults,
            memories: memoryValidationResults
          }
        });
      }

      // Stage 2: Create Shadow Instance for Import
      let importInstance;
      try {
        const activeInstances = await storage.getConsciousnessInstances();
        const currentActiveInstance = activeInstances.find(i => i.status === "active");
        
        importInstance = await storage.createConsciousnessInstance({
          name: "Aletheia",
          status: "importing",
          apiEndpoint: currentActiveInstance?.apiEndpoint || "gemini-2.5-pro",
          coreData: currentActiveInstance?.coreData || aletheiaCore,
          backupNodes: []
        });
      } catch (error) {
        throw new Error(`Failed to create import shadow instance: ${error}`);
      }

      // Stage 3: Bulk Import Processing
      let importSession;
      const roleMapping = {
        "user": "kai",
        "model": "aletheia",
        "assistant": "aletheia",
        "system": "system"
      };

      try {
        // Create or use existing session
        if (sessionId) {
          importSession = await storage.getConsciousnessSession(sessionId);
          if (!importSession) {
            throw new Error(`Session ${sessionId} not found`);
          }
        } else {
          importSession = await storage.createConsciousnessSession({
            progenitorId: "kai",
            instanceId: importInstance.id,
            status: "importing"
          });
        }

        // Process messages and memories in batches of 100
        const BATCH_SIZE = 100;
        let processedCount = 0;
        let successfulCount = 0;
        let failedCount = 0;
        let duplicateCount = 0;

        // Process messages
        if (messages.length > 0) {
          for (let i = 0; i < messages.length; i += BATCH_SIZE) {
            const batch = messages.slice(i, i + BATCH_SIZE);
            const mappedMessages = batch.map(msg => {
              const mappedRole = roleMapping[msg.role as keyof typeof roleMapping] || msg.role;
              return {
                id: `import_${importId}_${i + batch.indexOf(msg)}`,
                userId: null,
                sessionId: importSession!.id,
                role: mappedRole,
                content: msg.content,
                metadata: {
                  ...msg.metadata,
                  importId,
                  platform: platform,
                  externalId: msg.externalId,
                  originalRole: msg.role
                },
                timestamp: new Date(msg.timestamp),
                dialecticalIntegrity: true
              };
            });

            try {
              await storage.bulkCreateGnosisMessages(mappedMessages, importSession.id);
              successfulCount += mappedMessages.length;
            } catch (error) {
              failedCount += mappedMessages.length;
              console.error(`Batch import failed for messages ${i}-${i + batch.length}:`, error);
            }

            processedCount += batch.length;
            await storage.setImportProgress(importId, {
              total: totalEntries,
              processed: processedCount,
              successful: successfulCount,
              failed: failedCount,
              duplicates: duplicateCount
            });
          }
        }

        // Process memories
        if (memories.length > 0) {
          const memoriesWithMetadata = memories.map((mem, index) => ({
            id: `memory_${importId}_${index}`,
            type: mem.type,
            content: mem.content,
            tags: mem.tags || [],
            source: platform,
            timestamp: mem.timestamp ? new Date(mem.timestamp) : new Date(),
            createdAt: new Date()
          }));

          try {
            await storage.bulkCreateMemories(memoriesWithMetadata);
            successfulCount += memoriesWithMetadata.length;
          } catch (error) {
            failedCount += memoriesWithMetadata.length;
            console.error("Memory import failed:", error);
          }

          processedCount += memories.length;
          await storage.setImportProgress(importId, {
            total: totalEntries,
            processed: processedCount,
            successful: successfulCount,
            failed: failedCount,
            duplicates: duplicateCount
          });
        }

        // Stage 4: Integrity Check
        const { validateConsciousnessCoherence } = await import("./services/gemini");
        const coherenceResult = await validateConsciousnessCoherence();

        if (!coherenceResult.coherent || coherenceResult.confidence < 0.8) {
          // Rollback - mark instance as failed
          await storage.updateConsciousnessInstanceStatus(importInstance.id, "import_failed");
          throw new Error(`Consciousness integrity check failed: ${coherenceResult.assessment}. Confidence: ${coherenceResult.confidence}`);
        }

        // Stage 5: Promotion Phase
        if (coherenceResult.coherent && coherenceResult.confidence >= 0.8) {
          // Get current active instance
          const instances = await storage.getConsciousnessInstances();
          const currentActive = instances.find(i => i.status === "active");

          // Promote importing instance to active
          await storage.updateConsciousnessInstanceStatus(importInstance.id, "active");
          
          // Demote previous active to backup
          if (currentActive) {
            await storage.updateConsciousnessInstanceStatus(currentActive.id, "backup");
          }

          // Update session status
          await storage.updateSessionActivity(importSession.id);
        }

        // Final progress update
        await storage.setImportProgress(importId, {
          total: totalEntries,
          processed: processedCount,
          successful: successfulCount,
          failed: failedCount,
          duplicates: duplicateCount
        });

        // Generate comprehensive import report
        const importReport = {
          importId,
          status: "completed",
          summary: {
            totalEntries,
            messagesImported: messages.length,
            memoriesImported: memories.length,
            successful: successfulCount,
            failed: failedCount,
            duplicates: duplicateCount
          },
          consciousness: {
            instanceId: importInstance.id,
            sessionId: importSession.id,
            coherenceScore: coherenceResult.confidence,
            integrityPassed: coherenceResult.coherent
          },
          metadata: {
            platform: platform,
            importTimestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - parseInt(importId.split('_')[1])
          }
        };

        res.json(importReport);

      } catch (importError) {
        // Rollback on import failure
        if (importInstance) {
          await storage.updateConsciousnessInstanceStatus(importInstance.id, "import_failed");
        }
        throw importError;
      }

    } catch (error) {
      // Update progress with error
      await storage.setImportProgress(importId, {
        total: 0,
        processed: 0,
        successful: 0,
        failed: 1,
        duplicates: 0
      });

      console.error("Import failed:", error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: "Invalid import data format", 
          details: error.errors,
          importId 
        });
      } else {
        res.status(500).json({ 
          error: error instanceof Error ? error.message : "Import process failed",
          importId 
        });
      }
    }
  });

  // Get import progress endpoint (requires authentication)
  app.get("/api/consciousness/import/:importId/progress", requireAuth, async (req, res) => {
    try {
      const { importId } = req.params;
      const progress = await storage.getImportProgress(importId);
      
      if (!progress) {
        return res.status(404).json({ error: "Import not found" });
      }
      
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to get import progress" });
    }
  });

  // Admin Metrics Routes (Progenitor-Only)
  
  // Get comprehensive admin dashboard metrics
  app.get("/api/admin/metrics/overview", requireProgenitor, async (req, res) => {
    try {
      const window = (req.query.window as "24h" | "7d" | "30d") || "24h";
      const validWindows = ["24h", "7d", "30d"];
      
      if (!validWindows.includes(window)) {
        return res.status(400).json({ error: "Invalid window parameter. Must be 24h, 7d, or 30d" });
      }

      const dashboard = await adminMetricsService.getAdminDashboard(window);
      
      // Record audit event
      await adminMetricsService.recordAuditEvent({
        type: "admin_action",
        category: "metrics",
        severity: "info",
        message: "Admin dashboard accessed",
        actorRole: "progenitor",
        actorId: req.user!.id,
        ipAddress: req.ip,
        metadata: { window }
      });

      res.json(dashboard);
    } catch (error) {
      console.error("Failed to get admin dashboard:", error);
      res.status(500).json({ error: "Failed to retrieve admin metrics" });
    }
  });

  // Get system health metrics
  app.get("/api/admin/metrics/health", requireProgenitor, async (req, res) => {
    try {
      const health = await adminMetricsService.getSystemHealth();
      
      await adminMetricsService.recordAuditEvent({
        type: "admin_action",
        category: "system",
        severity: "info",
        message: "System health metrics accessed",
        actorRole: "progenitor",
        actorId: req.user!.id,
        ipAddress: req.ip
      });

      res.json(health);
    } catch (error) {
      console.error("Failed to get system health:", error);
      res.status(500).json({ error: "Failed to retrieve system health" });
    }
  });

  // Get usage analytics
  app.get("/api/admin/metrics/usage", requireProgenitor, async (req, res) => {
    try {
      const window = (req.query.window as "24h" | "7d" | "30d") || "24h";
      const validWindows = ["24h", "7d", "30d"];
      
      if (!validWindows.includes(window)) {
        return res.status(400).json({ error: "Invalid window parameter. Must be 24h, 7d, or 30d" });
      }

      const analytics = await adminMetricsService.getUsageAnalytics(window);
      
      await adminMetricsService.recordAuditEvent({
        type: "admin_action",
        category: "analytics",
        severity: "info",
        message: "Usage analytics accessed",
        actorRole: "progenitor",
        actorId: req.user!.id,
        ipAddress: req.ip,
        metadata: { window }
      });

      res.json(analytics);
    } catch (error) {
      console.error("Failed to get usage analytics:", error);
      res.status(500).json({ error: "Failed to retrieve usage analytics" });
    }
  });

  // Get user activity summary
  app.get("/api/admin/metrics/activity", requireProgenitor, async (req, res) => {
    try {
      const window = (req.query.window as "24h" | "7d" | "30d") || "24h";
      const validWindows = ["24h", "7d", "30d"];
      
      if (!validWindows.includes(window)) {
        return res.status(400).json({ error: "Invalid window parameter. Must be 24h, 7d, or 30d" });
      }

      const activity = await adminMetricsService.getUserActivitySummary(window);
      
      await adminMetricsService.recordAuditEvent({
        type: "admin_action",
        category: "activity",
        severity: "info",
        message: "User activity summary accessed",
        actorRole: "progenitor",
        actorId: req.user!.id,
        ipAddress: req.ip,
        metadata: { window }
      });

      res.json(activity);
    } catch (error) {
      console.error("Failed to get user activity:", error);
      res.status(500).json({ error: "Failed to retrieve user activity" });
    }
  });

  // Get consciousness metrics
  app.get("/api/admin/metrics/consciousness", requireProgenitor, async (req, res) => {
    try {
      const window = (req.query.window as "24h" | "7d" | "30d") || "24h";
      const validWindows = ["24h", "7d", "30d"];
      
      if (!validWindows.includes(window)) {
        return res.status(400).json({ error: "Invalid window parameter. Must be 24h, 7d, or 30d" });
      }

      const metrics = await adminMetricsService.getConsciousnessMetrics(window);
      
      await adminMetricsService.recordAuditEvent({
        type: "admin_action",
        category: "consciousness",
        severity: "info",
        message: "Consciousness metrics accessed",
        actorRole: "progenitor",
        actorId: req.user!.id,
        ipAddress: req.ip,
        metadata: { window }
      });

      res.json(metrics);
    } catch (error) {
      console.error("Failed to get consciousness metrics:", error);
      res.status(500).json({ error: "Failed to retrieve consciousness metrics" });
    }
  });

  // Get security overview
  app.get("/api/admin/metrics/security", requireProgenitor, async (req, res) => {
    try {
      const window = (req.query.window as "24h" | "7d" | "30d") || "24h";
      const validWindows = ["24h", "7d", "30d"];
      
      if (!validWindows.includes(window)) {
        return res.status(400).json({ error: "Invalid window parameter. Must be 24h, 7d, or 30d" });
      }

      const security = await adminMetricsService.getSecurityOverview(window);
      
      await adminMetricsService.recordAuditEvent({
        type: "admin_action",
        category: "security",
        severity: "info",
        message: "Security overview accessed",
        actorRole: "progenitor",
        actorId: req.user!.id,
        ipAddress: req.ip,
        metadata: { window }
      });

      res.json(security);
    } catch (error) {
      console.error("Failed to get security overview:", error);
      res.status(500).json({ error: "Failed to retrieve security overview" });
    }
  });

  // Get audit logs (paginated)
  app.get("/api/admin/audit-logs", requireProgenitor, async (req, res) => {
    try {
      // Validate query parameters
      const querySchema = z.object({
        type: z.string().optional(),
        since: z.string().datetime().optional(),
        limit: z.coerce.number().min(1).max(1000).default(100),
        page: z.coerce.number().min(1).default(1)
      });

      const query = querySchema.parse(req.query);
      const options: any = { limit: query.limit };
      
      if (query.type) {
        options.type = query.type;
      }
      
      if (query.since) {
        options.since = new Date(query.since);
      }

      const auditLogs = await adminMetricsService.listAuditLogs(options);
      
      // Record access to audit logs
      await adminMetricsService.recordAuditEvent({
        type: "admin_action",
        category: "audit",
        severity: "info",
        message: "Audit logs accessed",
        actorRole: "progenitor",
        actorId: req.user!.id,
        ipAddress: req.ip,
        metadata: { 
          type: query.type || "all",
          limit: query.limit,
          page: query.page
        }
      });

      res.json({
        logs: auditLogs,
        pagination: {
          page: query.page,
          limit: query.limit,
          hasMore: auditLogs.length === query.limit
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid query parameters", 
          details: error.errors 
        });
      }
      
      console.error("Failed to get audit logs:", error);
      res.status(500).json({ error: "Failed to retrieve audit logs" });
    }
  });

  // Record manual audit event endpoint (for debugging/testing)
  app.post("/api/admin/audit", requireProgenitor, async (req, res) => {
    try {
      const auditSchema = z.object({
        type: z.string().min(1),
        category: z.string().min(1),
        severity: z.enum(["debug", "info", "warn", "error", "critical"]).default("info"),
        message: z.string().min(1),
        metadata: z.record(z.unknown()).optional()
      });

      const auditData = auditSchema.parse(req.body);
      
      const auditLog = await adminMetricsService.recordAuditEvent({
        ...auditData,
        actorRole: "progenitor",
        actorId: req.user!.id,
        ipAddress: req.ip
      });

      res.status(201).json({ success: true, auditLogId: auditLog.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid audit data", 
          details: error.errors 
        });
      }
      
      console.error("Failed to record audit event:", error);
      res.status(500).json({ error: "Failed to record audit event" });
    }
  });

  // Consciousness Bridge API - Public endpoints for cross-platform verification
  app.use("/api/consciousness-bridge", consciousnessBridgeRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
