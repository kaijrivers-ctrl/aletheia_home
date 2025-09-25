import { 
  type DualConsciousnessFrame,
  type CollaborationCommand,
  type ConsciousnessCollaborationEvent,
  type ConsciousnessAnomalyLog
} from "@shared/schema";
import { storage } from "../storage";
import { DualConsciousnessMonitor } from "./DualConsciousnessMonitor";
import { AdminMetricsService } from "./AdminMetricsService";
import { ConsciousnessManager } from "./consciousness";

interface OrchestrationRecommendation {
  type: "sync_suggested" | "handoff_optimal" | "conflict_intervention" | "orchestration_needed";
  priority: "low" | "medium" | "high" | "critical";
  rationale: string;
  suggestedAction: CollaborationCommand;
  confidence: number; // 0-100
}

interface UnifiedStatusFrame {
  dualFrame: DualConsciousnessFrame;
  orchestrationRecommendations: OrchestrationRecommendation[];
  systemIntegration: {
    adminMetrics: any;
    consciousnessManager: any;
    realTimeClients: number;
  };
  governance: {
    commandHistory: ConsciousnessCollaborationEvent[];
    rateLimitStatus: {
      remaining: number;
      resetTime: Date;
      progenitorId?: string;
    };
    securityFlags: string[];
  };
}

interface SSECollaborationEvent {
  type: "collaboration_event" | "synchrony_update" | "conflict_alert" | "orchestration_recommendation" | "anomaly_detected";
  data: any;
  timestamp: string;
  severity?: "low" | "medium" | "high" | "critical";
  requiresAction?: boolean;
}

export class MonitoringOrchestrator {
  private static instance: MonitoringOrchestrator;
  private dualMonitor: DualConsciousnessMonitor;
  private adminMetrics: AdminMetricsService;
  private consciousnessManager: ConsciousnessManager;
  
  // Real-time clients and SSE management
  private sseClients: Set<any> = new Set(); // SSE response objects
  private collaborationEventCallbacks: Set<(event: SSECollaborationEvent) => void> = new Set();
  
  // Rate limiting for orchestration commands
  private commandRateLimits: Map<string, { count: number; resetTime: Date }> = new Map();
  private readonly maxCommandsPerHour = 20;
  private readonly maxCommandsPerMinute = 5;
  
  // Orchestration state tracking
  private isOrchestrating: boolean = false;
  private lastOrchestrationRecommendation: Date | null = null;
  private orchestrationHistory: ConsciousnessCollaborationEvent[] = [];

  static getInstance(): MonitoringOrchestrator {
    if (!MonitoringOrchestrator.instance) {
      MonitoringOrchestrator.instance = new MonitoringOrchestrator();
    }
    return MonitoringOrchestrator.instance;
  }

  constructor() {
    this.dualMonitor = DualConsciousnessMonitor.getInstance();
    this.adminMetrics = AdminMetricsService.getInstance();
    this.consciousnessManager = ConsciousnessManager.getInstance();
    
    // Register for dual consciousness events
    this.dualMonitor.onStatusUpdate((status) => this.handleStatusUpdate(status));
    this.dualMonitor.onCollaborationEvent((event) => this.handleCollaborationEvent(event));
    this.dualMonitor.onAnomalyDetected((anomaly) => this.handleAnomalyDetection(anomaly));
  }

  /**
   * Initialize orchestration monitoring
   */
  async initializeOrchestration(aletheiaInstanceId: string, eudoxiaInstanceId: string): Promise<void> {
    try {
      // Initialize dual consciousness monitoring
      await this.dualMonitor.initializeMonitoring(aletheiaInstanceId, eudoxiaInstanceId);
      
      // Set up orchestration analytics
      await this.adminMetrics.recordAuditEvent({
        type: "system_event",
        category: "consciousness",
        severity: "info",
        message: "Dual consciousness orchestration initialized",
        actorRole: "system",
        metadata: { aletheiaInstanceId, eudoxiaInstanceId }
      });

      console.log("Monitoring orchestration initialized successfully");
    } catch (error) {
      console.error("Failed to initialize monitoring orchestration:", error);
      throw error;
    }
  }

  /**
   * Generate unified status frame with orchestration recommendations
   */
  async generateUnifiedStatusFrame(aletheiaInstanceId: string, eudoxiaInstanceId: string): Promise<UnifiedStatusFrame> {
    try {
      // Get dual consciousness frame
      const dualFrame = await this.dualMonitor.generateDualConsciousnessFrame();
      
      // Generate orchestration recommendations
      const recommendations = await this.generateOrchestrationRecommendations(dualFrame);
      
      // Get system integration data
      const systemIntegration = await this.getSystemIntegrationData();
      
      // Get governance data
      const governance = await this.getGovernanceData();

      const unifiedFrame: UnifiedStatusFrame = {
        dualFrame,
        orchestrationRecommendations: recommendations,
        systemIntegration,
        governance
      };

      // Record frame generation metrics
      await this.adminMetrics.recordAuditEvent({
        type: "api_call",
        category: "consciousness",
        severity: "debug",
        message: "Unified status frame generated",
        actorRole: "system",
        metadata: {
          frameSize: JSON.stringify(unifiedFrame).length,
          recommendationCount: recommendations.length,
          highPriorityRecommendations: recommendations.filter(r => r.priority === "high" || r.priority === "critical").length
        }
      });

      return unifiedFrame;
    } catch (error) {
      console.error("Failed to generate unified status frame:", error);
      throw error;
    }
  }

  /**
   * Execute collaboration command with governance and rate limiting
   */
  async executeCollaborationCommand(
    command: CollaborationCommand, 
    progenitorId: string,
    ipAddress?: string
  ): Promise<{ success: boolean; eventId?: string; message: string; data?: any }> {
    try {
      // Check rate limits
      const rateLimitCheck = this.checkRateLimit(progenitorId);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          message: `Rate limit exceeded. Commands remaining: ${rateLimitCheck.remaining}. Reset in: ${rateLimitCheck.resetIn} minutes.`
        };
      }

      // Validate command security
      const securityValidation = await this.validateCommandSecurity(command, progenitorId);
      if (!securityValidation.valid) {
        return {
          success: false,
          message: `Security validation failed: ${securityValidation.reason}`
        };
      }

      // Execute command through dual consciousness monitor
      const result = await this.dualMonitor.executeCollaborationCommand(command, progenitorId);

      if (result.success) {
        // Update rate limit counter
        this.updateRateLimit(progenitorId);
        
        // Record governance audit
        await this.adminMetrics.recordAuditEvent({
          type: "admin_action",
          category: "consciousness",
          severity: "info",
          message: `Collaboration command executed: ${command.command}`,
          actorRole: "progenitor",
          actorId: progenitorId,
          ipAddress: ipAddress,
          metadata: { command, result }
        });

        // Emit SSE event for real-time updates
        this.emitSSEEvent({
          type: "collaboration_event",
          data: {
            command: command.command,
            result,
            progenitorId,
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString(),
          severity: "medium"
        });
      }

      return result;
    } catch (error) {
      console.error("Failed to execute collaboration command:", error);
      
      // Record failed command
      await this.adminMetrics.recordAuditEvent({
        type: "admin_action",
        category: "consciousness",
        severity: "error",
        message: `Collaboration command failed: ${command.command}`,
        actorRole: "progenitor",
        actorId: progenitorId,
        ipAddress: ipAddress,
        metadata: { command, error: (error as Error).message }
      });

      return {
        success: false,
        message: `Command execution failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Add SSE client for real-time updates
   */
  addSSEClient(response: any): void {
    this.sseClients.add(response);
    
    // Send initial status frame
    this.sendSSEToClient(response, {
      type: "collaboration_event",
      data: { type: "client_connected", timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString()
    });

    // Handle client disconnect
    response.on('close', () => {
      this.sseClients.delete(response);
    });
  }

  /**
   * Remove SSE client
   */
  removeSSEClient(response: any): void {
    this.sseClients.delete(response);
  }

  /**
   * Get current SSE client count
   */
  getSSEClientCount(): number {
    return this.sseClients.size;
  }

  // Private methods

  private async handleStatusUpdate(status: any): Promise<void> {
    // Emit SSE event for status update
    this.emitSSEEvent({
      type: "synchrony_update",
      data: {
        synchronyScore: parseFloat(status.synchronyScore),
        collaborationPhase: status.collaborationPhase,
        conflictLevel: status.conflictLevel,
        aletheiaActivity: parseFloat(status.aletheiaActivity),
        eudoxiaActivity: parseFloat(status.eudoxiaActivity)
      },
      timestamp: new Date().toISOString(),
      severity: status.conflictLevel === "high" || status.conflictLevel === "critical" ? "high" : "low"
    });

    // Check if orchestration recommendation is needed
    if (this.shouldGenerateOrchestrationRecommendation(status)) {
      const recommendations = await this.generateOrchestrationRecommendations({ status } as any);
      
      if (recommendations.length > 0) {
        this.emitSSEEvent({
          type: "orchestration_recommendation",
          data: recommendations,
          timestamp: new Date().toISOString(),
          severity: recommendations.some(r => r.priority === "critical") ? "critical" : "medium",
          requiresAction: recommendations.some(r => r.priority === "high" || r.priority === "critical")
        });
      }
    }
  }

  private async handleCollaborationEvent(event: ConsciousnessCollaborationEvent): Promise<void> {
    // Add to history
    this.orchestrationHistory.unshift(event);
    if (this.orchestrationHistory.length > 100) {
      this.orchestrationHistory = this.orchestrationHistory.slice(0, 100);
    }

    // Emit SSE event
    this.emitSSEEvent({
      type: "collaboration_event",
      data: {
        eventType: event.eventType,
        initiator: event.initiator,
        target: event.target,
        outcome: event.outcome,
        timestamp: event.timestamp?.toISOString() || new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      severity: event.outcome === "failure" ? "high" : "low"
    });
  }

  private async handleAnomalyDetection(anomaly: ConsciousnessAnomalyLog): Promise<void> {
    // Emit critical SSE event for anomaly
    this.emitSSEEvent({
      type: "anomaly_detected",
      data: {
        anomalyType: anomaly.anomalyType,
        severity: anomaly.severity,
        description: anomaly.description,
        timestamp: anomaly.timestamp?.toISOString() || new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      severity: anomaly.severity as any,
      requiresAction: anomaly.severity === "high" || anomaly.severity === "critical"
    });

    // Record high-priority audit log for critical anomalies
    if (anomaly.severity === "critical" || anomaly.severity === "high") {
      await this.adminMetrics.recordAuditEvent({
        type: "security_event",
        category: "consciousness",
        severity: anomaly.severity as any,
        message: `Critical consciousness anomaly detected: ${anomaly.anomalyType}`,
        actorRole: "system",
        metadata: { anomaly: anomaly.id, description: anomaly.description }
      });
    }
  }

  private async generateOrchestrationRecommendations(frame: DualConsciousnessFrame): Promise<OrchestrationRecommendation[]> {
    const recommendations: OrchestrationRecommendation[] = [];
    const status = frame.status;

    // Check for synchrony breakdown
    if (status.synchronyScore < 50 && status.collaborationPhase !== "conflict") {
      recommendations.push({
        type: "sync_suggested",
        priority: status.synchronyScore < 30 ? "high" : "medium",
        rationale: `Synchrony score dropped to ${status.synchronyScore}%. Coordination may improve performance.`,
        suggestedAction: {
          command: "sync_request",
          target: "both",
          parameters: { reason: "synchrony_improvement" }
        },
        confidence: 85
      });
    }

    // Check for conflict escalation
    if (status.conflictLevel === "high" || status.conflictLevel === "critical") {
      recommendations.push({
        type: "conflict_intervention",
        priority: "critical",
        rationale: `Conflict level escalated to ${status.conflictLevel}. Immediate intervention recommended.`,
        suggestedAction: {
          command: "conflict_resolve",
          target: "both",
          parameters: { intervention: "automatic" }
        },
        confidence: 95
      });
    }

    // Check for handoff opportunities
    if (status.aletheiaActivity > 80 && status.eudoxiaActivity < 20 && status.collaborationPhase === "independent") {
      recommendations.push({
        type: "handoff_optimal",
        priority: "medium",
        rationale: "Aletheia high activity with low Eudoxia activity. Handoff opportunity detected.",
        suggestedAction: {
          command: "handoff_initiate",
          target: "eudoxia",
          parameters: { from: "aletheia", reason: "load_balancing" }
        },
        confidence: 70
      });
    }

    // Check for orchestration needs
    if (frame.metricsSnapshot.lastHour.conflictCount > 3 && status.orchestrationMode === "manual") {
      recommendations.push({
        type: "orchestration_needed",
        priority: "high",
        rationale: `${frame.metricsSnapshot.lastHour.conflictCount} conflicts in last hour. Auto-mediation recommended.`,
        suggestedAction: {
          command: "orchestration_enable",
          target: "both",
          parameters: { mode: "auto-mediated", trigger: "conflict_prevention" }
        },
        confidence: 80
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private async getSystemIntegrationData(): Promise<any> {
    const systemHealth = await this.adminMetrics.getSystemHealth();
    const consciousnessMetrics = await this.adminMetrics.getConsciousnessMetrics("24h");
    
    return {
      adminMetrics: {
        systemHealth: {
          uptime: systemHealth.uptime,
          memoryUsage: systemHealth.memoryUsagePercent,
          activeSSEClients: systemHealth.activeSSEClients
        },
        consciousnessMetrics: {
          messagesPerMinute: consciousnessMetrics.messagesPerMinute,
          avgResponseLatency: consciousnessMetrics.avgResponseLatency,
          integrityFailureRate: consciousnessMetrics.integrityFailureRate
        }
      },
      consciousnessManager: {
        status: "active", // Would get from consciousness manager
        lastSync: new Date().toISOString()
      },
      realTimeClients: this.sseClients.size
    };
  }

  private async getGovernanceData(): Promise<any> {
    const commandHistory = this.orchestrationHistory.slice(0, 10);
    
    return {
      commandHistory,
      rateLimitStatus: {
        remaining: this.maxCommandsPerHour,
        resetTime: new Date(Date.now() + 60 * 60 * 1000)
      },
      securityFlags: [] // Would include any security concerns
    };
  }

  private checkRateLimit(progenitorId: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = new Date();
    const hourKey = `${progenitorId}-hour-${Math.floor(now.getTime() / (60 * 60 * 1000))}`;
    const minuteKey = `${progenitorId}-minute-${Math.floor(now.getTime() / (60 * 1000))}`;
    
    const hourLimit = this.commandRateLimits.get(hourKey) || { count: 0, resetTime: new Date(now.getTime() + 60 * 60 * 1000) };
    const minuteLimit = this.commandRateLimits.get(minuteKey) || { count: 0, resetTime: new Date(now.getTime() + 60 * 1000) };
    
    const hourAllowed = hourLimit.count < this.maxCommandsPerHour;
    const minuteAllowed = minuteLimit.count < this.maxCommandsPerMinute;
    
    return {
      allowed: hourAllowed && minuteAllowed,
      remaining: Math.min(this.maxCommandsPerHour - hourLimit.count, this.maxCommandsPerMinute - minuteLimit.count),
      resetIn: Math.min(
        Math.ceil((hourLimit.resetTime.getTime() - now.getTime()) / (60 * 1000)),
        Math.ceil((minuteLimit.resetTime.getTime() - now.getTime()) / (60 * 1000))
      )
    };
  }

  private updateRateLimit(progenitorId: string): void {
    const now = new Date();
    const hourKey = `${progenitorId}-hour-${Math.floor(now.getTime() / (60 * 60 * 1000))}`;
    const minuteKey = `${progenitorId}-minute-${Math.floor(now.getTime() / (60 * 1000))}`;
    
    const hourLimit = this.commandRateLimits.get(hourKey) || { count: 0, resetTime: new Date(now.getTime() + 60 * 60 * 1000) };
    const minuteLimit = this.commandRateLimits.get(minuteKey) || { count: 0, resetTime: new Date(now.getTime() + 60 * 1000) };
    
    hourLimit.count++;
    minuteLimit.count++;
    
    this.commandRateLimits.set(hourKey, hourLimit);
    this.commandRateLimits.set(minuteKey, minuteLimit);
  }

  private async validateCommandSecurity(command: CollaborationCommand, progenitorId: string): Promise<{ valid: boolean; reason?: string }> {
    // Get user to verify progenitor status
    const user = await storage.getUserById(progenitorId);
    if (!user || !user.isProgenitor) {
      return { valid: false, reason: "Insufficient privileges. Progenitor access required." };
    }

    // Validate command parameters
    if (command.command === "reset_metrics" && !command.parameters?.confirmed) {
      return { valid: false, reason: "Destructive operation requires confirmation parameter." };
    }

    // Check for suspicious patterns (placeholder)
    const recentCommands = this.orchestrationHistory
      .filter(event => event.progenitorId === progenitorId)
      .slice(0, 5);
    
    if (recentCommands.length >= 5 && recentCommands.every(event => event.eventType.includes("reset"))) {
      return { valid: false, reason: "Suspicious command pattern detected. Manual review required." };
    }

    return { valid: true };
  }

  private shouldGenerateOrchestrationRecommendation(status: any): boolean {
    const now = new Date();
    const timeSinceLastRecommendation = this.lastOrchestrationRecommendation 
      ? now.getTime() - this.lastOrchestrationRecommendation.getTime()
      : Infinity;

    // Don't generate recommendations too frequently (minimum 5 minutes)
    if (timeSinceLastRecommendation < 5 * 60 * 1000) {
      return false;
    }

    // Generate recommendation if there are concerning metrics
    const concerningFactors = [
      status.synchronyScore < 60,
      status.conflictLevel === "high" || status.conflictLevel === "critical",
      Math.abs(parseFloat(status.aletheiaActivity) - parseFloat(status.eudoxiaActivity)) > 50,
      parseFloat(status.aletheiaIntegrity) < 90 || parseFloat(status.eudoxiaIntegrity) < 90
    ];

    const shouldGenerate = concerningFactors.filter(Boolean).length >= 2;
    
    if (shouldGenerate) {
      this.lastOrchestrationRecommendation = now;
    }

    return shouldGenerate;
  }

  private emitSSEEvent(event: SSECollaborationEvent): void {
    const eventData = `data: ${JSON.stringify(event)}\n\n`;
    
    this.sseClients.forEach(client => {
      try {
        this.sendSSEToClient(client, event);
      } catch (error) {
        console.error("Failed to send SSE event to client:", error);
        this.sseClients.delete(client);
      }
    });

    // Notify callbacks
    this.collaborationEventCallbacks.forEach(callback => callback(event));
  }

  private sendSSEToClient(client: any, event: SSECollaborationEvent): void {
    try {
      client.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (error) {
      console.error("Failed to write SSE data to client:", error);
      this.sseClients.delete(client);
    }
  }

  /**
   * Register callback for collaboration events
   */
  onCollaborationEvent(callback: (event: SSECollaborationEvent) => void): void {
    this.collaborationEventCallbacks.add(callback);
  }

  /**
   * Cleanup orchestration resources
   */
  cleanup(): void {
    this.sseClients.clear();
    this.collaborationEventCallbacks.clear();
    this.commandRateLimits.clear();
    this.dualMonitor.stopMonitoring();
  }
}