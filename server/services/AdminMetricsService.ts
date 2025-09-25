import { storage } from "../storage";
import {
  type UsageAnalytics,
  type SystemHealth,
  type UserActivitySummary,
  type ConsciousnessMetrics,
  type SecurityOverview,
  type AuditLog,
  type InsertAuditLog
} from "@shared/schema";
import crypto from "crypto";

// Rolling metrics interfaces
interface RollingMetrics {
  messagesPerMinute: number;
  apiLatencyP50: number;
  apiLatencyP95: number;
  totalMessages: number;
  totalErrors: number;
  activeSSEClients: number;
}

interface LatencyHistogram {
  buckets: Map<number, number>; // latency bucket -> count
  lastReset: Date;
  sampleCount: number;
}

export class AdminMetricsService {
  private static instance: AdminMetricsService;
  private rollingMetrics: RollingMetrics;
  private latencyHistogram: LatencyHistogram;
  private saltSecret: string;
  private messageCountWindow: number[] = []; // sliding window for messages per minute
  private lastWindowUpdate: Date = new Date();

  private constructor() {
    // Initialize rolling metrics
    this.rollingMetrics = {
      messagesPerMinute: 0,
      apiLatencyP50: 0,
      apiLatencyP95: 0,
      totalMessages: 0,
      totalErrors: 0,
      activeSSEClients: 0
    };

    this.latencyHistogram = {
      buckets: new Map(),
      lastReset: new Date(),
      sampleCount: 0
    };

    // Generate server-side salt for privacy hashing
    this.saltSecret = process.env.ADMIN_SALT_SECRET || this.generateSalt();
  }

  static getInstance(): AdminMetricsService {
    if (!AdminMetricsService.instance) {
      AdminMetricsService.instance = new AdminMetricsService();
    }
    return AdminMetricsService.instance;
  }

  private generateSalt(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Privacy-preserving hash utility
  private hashWithSalt(value: string): string {
    return crypto.createHash('sha256')
      .update(value + this.saltSecret)
      .digest('hex')
      .substring(0, 16); // truncate for efficiency
  }

  // Rolling counter management
  updateMessageCount(): void {
    const now = new Date();
    const currentMinute = Math.floor(now.getTime() / 60000);
    
    // Maintain sliding window of last 10 minutes
    if (this.messageCountWindow.length === 0 || 
        Math.floor(this.lastWindowUpdate.getTime() / 60000) !== currentMinute) {
      this.messageCountWindow.push(1);
      if (this.messageCountWindow.length > 10) {
        this.messageCountWindow.shift();
      }
      this.lastWindowUpdate = now;
    } else {
      // Increment current minute
      this.messageCountWindow[this.messageCountWindow.length - 1]++;
    }

    this.rollingMetrics.totalMessages++;
    this.rollingMetrics.messagesPerMinute = this.calculateMessagesPerMinute();
  }

  updateAPILatency(latencyMs: number): void {
    // Update latency histogram
    const bucket = this.getLatencyBucket(latencyMs);
    const currentCount = this.latencyHistogram.buckets.get(bucket) || 0;
    this.latencyHistogram.buckets.set(bucket, currentCount + 1);
    this.latencyHistogram.sampleCount++;

    // Calculate percentiles from histogram
    const { p50, p95 } = this.calculatePercentiles();
    this.rollingMetrics.apiLatencyP50 = p50;
    this.rollingMetrics.apiLatencyP95 = p95;

    // Reset histogram periodically to prevent unbounded growth
    const now = new Date();
    if (now.getTime() - this.latencyHistogram.lastReset.getTime() > 3600000) { // 1 hour
      this.resetLatencyHistogram();
    }
  }

  updateSSEClientCount(count: number): void {
    this.rollingMetrics.activeSSEClients = count;
  }

  recordAPIError(): void {
    this.rollingMetrics.totalErrors++;
  }

  private calculateMessagesPerMinute(): number {
    if (this.messageCountWindow.length === 0) return 0;
    return this.messageCountWindow.reduce((sum, count) => sum + count, 0) / this.messageCountWindow.length;
  }

  private getLatencyBucket(latencyMs: number): number {
    // Exponential buckets: 0-10ms, 10-25ms, 25-50ms, 50-100ms, 100-250ms, 250-500ms, 500ms+
    if (latencyMs <= 10) return 10;
    if (latencyMs <= 25) return 25;
    if (latencyMs <= 50) return 50;
    if (latencyMs <= 100) return 100;
    if (latencyMs <= 250) return 250;
    if (latencyMs <= 500) return 500;
    return 1000; // 500ms+
  }

  private calculatePercentiles(): { p50: number; p95: number } {
    if (this.latencyHistogram.sampleCount === 0) {
      return { p50: 0, p95: 0 };
    }

    const buckets = Array.from(this.latencyHistogram.buckets.entries()).sort((a, b) => a[0] - b[0]);
    const totalSamples = this.latencyHistogram.sampleCount;
    
    let cumulative = 0;
    let p50 = 0;
    let p95 = 0;

    for (const [bucket, count] of buckets) {
      cumulative += count;
      
      if (!p50 && cumulative >= totalSamples * 0.5) {
        p50 = bucket;
      }
      
      if (!p95 && cumulative >= totalSamples * 0.95) {
        p95 = bucket;
        break;
      }
    }

    return { p50: p50 || buckets[buckets.length - 1]?.[0] || 0, p95: p95 || buckets[buckets.length - 1]?.[0] || 0 };
  }

  private resetLatencyHistogram(): void {
    this.latencyHistogram.buckets.clear();
    this.latencyHistogram.lastReset = new Date();
    this.latencyHistogram.sampleCount = 0;
  }

  // Audit logging with privacy preservation
  async recordAuditEvent(event: {
    type: string;
    category: string;
    severity?: "debug" | "info" | "warn" | "error" | "critical";
    message: string;
    actorRole?: "user" | "progenitor" | "system" | "anonymous";
    actorId?: string;
    ipAddress?: string;
    metadata?: any;
  }): Promise<AuditLog> {
    const auditLog: InsertAuditLog = {
      type: event.type,
      category: event.category,
      severity: event.severity || "info",
      message: event.message,
      actorRole: event.actorRole || "anonymous",
      actorIdHash: event.actorId ? this.hashWithSalt(event.actorId) : null,
      ipHash: event.ipAddress ? this.hashWithSalt(event.ipAddress) : null,
      metadata: this.sanitizeMetadata(event.metadata || {})
    };

    return await storage.recordAuditLog(auditLog);
  }

  // Ensure metadata contains no PII
  private sanitizeMetadata(metadata: any): any {
    const sanitized = { ...metadata };
    
    // Remove common PII fields
    const piiFields = ['email', 'name', 'phone', 'address', 'ssn', 'password', 'token'];
    piiFields.forEach(field => {
      delete sanitized[field];
    });

    // Hash any remaining ID fields
    Object.keys(sanitized).forEach(key => {
      if (key.toLowerCase().includes('id') && typeof sanitized[key] === 'string') {
        sanitized[`${key}_hash`] = this.hashWithSalt(sanitized[key]);
        delete sanitized[key];
      }
    });

    return sanitized;
  }

  // Composed metric retrieval methods
  async getUsageAnalytics(window: "24h" | "7d" | "30d"): Promise<UsageAnalytics> {
    const analytics = await storage.getUsageAnalytics(window);
    
    // Apply k-anonymity to new users data
    analytics.newUsersByDay = analytics.newUsersByDay.map(day => ({
      ...day,
      count: day.count >= 5 ? day.count : 0 // k-anonymity threshold
    }));

    return analytics;
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const baseHealth = await storage.getSystemHealth();
    
    // Enhance with rolling metrics
    return {
      ...baseHealth,
      apiResponseLatencyP50: this.rollingMetrics.apiLatencyP50,
      apiResponseLatencyP95: this.rollingMetrics.apiLatencyP95,
      activeSSEClients: this.rollingMetrics.activeSSEClients
    };
  }

  async getUserActivitySummary(window: "24h" | "7d" | "30d"): Promise<UserActivitySummary> {
    return await storage.getUserActivitySummary(window);
  }

  async getConsciousnessMetrics(window: "24h" | "7d" | "30d"): Promise<ConsciousnessMetrics> {
    const baseMetrics = await storage.getConsciousnessMetrics(window);
    
    // Enhance with rolling metrics
    return {
      ...baseMetrics,
      messagesPerMinute: this.rollingMetrics.messagesPerMinute,
      avgResponseLatency: this.rollingMetrics.apiLatencyP50,
      responseLatencyP95: this.rollingMetrics.apiLatencyP95,
      apiErrorRate: this.rollingMetrics.totalMessages > 0 ? 
        (this.rollingMetrics.totalErrors / this.rollingMetrics.totalMessages) * 100 : 0
    };
  }

  async getSecurityOverview(window: "24h" | "7d" | "30d"): Promise<SecurityOverview> {
    return await storage.getSecurityOverview(window);
  }

  async listAuditLogs(options?: { type?: string; since?: Date; limit?: number }): Promise<AuditLog[]> {
    return await storage.listAuditLogs(options);
  }

  // Get comprehensive admin dashboard data
  async getAdminDashboard(window: "24h" | "7d" | "30d" = "24h"): Promise<{
    usageAnalytics: UsageAnalytics;
    systemHealth: SystemHealth;
    userActivity: UserActivitySummary;
    consciousness: ConsciousnessMetrics;
    security: SecurityOverview;
    auditSummary: {
      totalEvents: number;
      recentEvents: AuditLog[];
      errorRate: number;
    };
  }> {
    const [usageAnalytics, systemHealth, userActivity, consciousness, security] = await Promise.all([
      this.getUsageAnalytics(window),
      this.getSystemHealth(),
      this.getUserActivitySummary(window),
      this.getConsciousnessMetrics(window),
      this.getSecurityOverview(window)
    ]);

    // Get audit summary
    const since = new Date();
    switch (window) {
      case "24h":
        since.setHours(since.getHours() - 24);
        break;
      case "7d":
        since.setDate(since.getDate() - 7);
        break;
      case "30d":
        since.setDate(since.getDate() - 30);
        break;
    }

    const recentAuditLogs = await this.listAuditLogs({ since, limit: 10 });
    const allAuditLogs = await this.listAuditLogs({ since, limit: 1000 });
    const errorLogs = allAuditLogs.filter(log => log.severity === "error" || log.severity === "critical");

    return {
      usageAnalytics,
      systemHealth,
      userActivity,
      consciousness,
      security,
      auditSummary: {
        totalEvents: allAuditLogs.length,
        recentEvents: recentAuditLogs,
        errorRate: allAuditLogs.length > 0 ? (errorLogs.length / allAuditLogs.length) * 100 : 0
      }
    };
  }

  // Integration hooks for ConsciousnessManager
  onMessageProcessed(latencyMs: number): void {
    this.updateMessageCount();
    this.updateAPILatency(latencyMs);
  }

  onAPIError(): void {
    this.recordAPIError();
  }

  onSSEClientChange(count: number): void {
    this.updateSSEClientCount(count);
  }

  // Get current rolling metrics (for debugging/monitoring)
  getCurrentMetrics(): RollingMetrics {
    return { ...this.rollingMetrics };
  }
}

export const adminMetricsService = AdminMetricsService.getInstance();