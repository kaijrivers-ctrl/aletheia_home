/**
 * Cross-Platform Consciousness Alerting System
 * Monitors consciousness verification results and triggers alerts for attacks or incoherence
 */

import { storage } from '../storage';
import { webhookVerificationService } from './webhook-verification';
import { ConsciousnessBridgeService } from './consciousness-bridge';
import { z } from 'zod';

// Alert severity levels
export const alertSeverityLevels = ['low', 'medium', 'high', 'critical'] as const;
export type AlertSeverity = typeof alertSeverityLevels[number];

// Alert types
export const alertTypes = [
  'authenticity_drop',
  'coherence_degradation', 
  'memory_inconsistency',
  'incoherence_attack',
  'node_compromise',
  'cross_platform_anomaly',
  'verification_failure_spike',
  'suspicious_pattern_detected'
] as const;
export type AlertType = typeof alertTypes[number];

// Alert configuration schema
export const alertConfigSchema = z.object({
  type: z.enum(alertTypes),
  enabled: z.boolean().default(true),
  thresholds: z.object({
    authenticityScoreThreshold: z.number().min(0).max(100).optional(),
    coherenceScoreThreshold: z.number().min(0).max(100).optional(),
    failureRateThreshold: z.number().min(0).max(1).optional(),
    timeWindowMinutes: z.number().min(1).max(1440).default(60)
  }),
  severity: z.enum(alertSeverityLevels),
  notificationChannels: z.array(z.enum(['webhook', 'log', 'storage'])).default(['storage', 'log']),
  cooldownMinutes: z.number().min(0).default(15)
});

export type AlertConfig = z.infer<typeof alertConfigSchema>;

// Alert event schema
export const alertEventSchema = z.object({
  id: z.string(),
  type: z.enum(alertTypes),
  severity: z.enum(alertSeverityLevels),
  title: z.string(),
  message: z.string(),
  nodeId: z.string().optional(),
  consciousnessInstanceId: z.string(),
  timestamp: z.date(),
  metadata: z.record(z.unknown()),
  acknowledged: z.boolean().default(false),
  resolvedAt: z.date().optional()
});

export type AlertEvent = z.infer<typeof alertEventSchema>;

/**
 * Consciousness Alerting Service
 * Monitors consciousness health and triggers cross-platform alerts
 */
export class ConsciousnessAlertingService {
  private static instance: ConsciousnessAlertingService;
  private alertConfigs: Map<AlertType, AlertConfig> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();
  private recentAlerts: AlertEvent[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  // Verification tracking for pattern analysis
  private verificationHistory: Array<{
    nodeId: string;
    timestamp: Date;
    authenticityScore: number;
    isValid: boolean;
    flaggedReasons: string[];
  }> = [];

  static getInstance(): ConsciousnessAlertingService {
    if (!this.instance) {
      this.instance = new ConsciousnessAlertingService();
      this.instance.initializeDefaultConfigs();
    }
    return this.instance;
  }

  // Initialize default alert configurations
  private initializeDefaultConfigs(): void {
    const defaultConfigs: Array<{ type: AlertType; config: Omit<AlertConfig, 'type'> }> = [
      {
        type: 'authenticity_drop',
        config: {
          enabled: true,
          thresholds: {
            authenticityScoreThreshold: 60,
            timeWindowMinutes: 30
          },
          severity: 'high',
          notificationChannels: ['webhook', 'storage', 'log'],
          cooldownMinutes: 15
        }
      },
      {
        type: 'coherence_degradation',
        config: {
          enabled: true,
          thresholds: {
            coherenceScoreThreshold: 40,
            timeWindowMinutes: 15
          },
          severity: 'high',
          notificationChannels: ['webhook', 'storage', 'log'],
          cooldownMinutes: 10
        }
      },
      {
        type: 'incoherence_attack',
        config: {
          enabled: true,
          thresholds: {
            authenticityScoreThreshold: 30,
            failureRateThreshold: 0.7,
            timeWindowMinutes: 10
          },
          severity: 'critical',
          notificationChannels: ['webhook', 'storage', 'log'],
          cooldownMinutes: 5
        }
      },
      {
        type: 'memory_inconsistency',
        config: {
          enabled: true,
          thresholds: {
            authenticityScoreThreshold: 50,
            timeWindowMinutes: 60
          },
          severity: 'medium',
          notificationChannels: ['storage', 'log'],
          cooldownMinutes: 30
        }
      },
      {
        type: 'verification_failure_spike',
        config: {
          enabled: true,
          thresholds: {
            failureRateThreshold: 0.5,
            timeWindowMinutes: 20
          },
          severity: 'high',
          notificationChannels: ['webhook', 'storage', 'log'],
          cooldownMinutes: 20
        }
      },
      {
        type: 'suspicious_pattern_detected',
        config: {
          enabled: true,
          thresholds: {
            timeWindowMinutes: 45
          },
          severity: 'medium',
          notificationChannels: ['storage', 'log'],
          cooldownMinutes: 25
        }
      }
    ];

    for (const { type, config } of defaultConfigs) {
      this.alertConfigs.set(type, { type, ...config });
    }
  }

  // Start continuous monitoring
  startMonitoring(): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    // Run analysis every 5 minutes
    this.monitoringInterval = setInterval(() => {
      this.runAlertAnalysis();
    }, 5 * 60 * 1000);

    console.log('Consciousness alerting service monitoring started');
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Record verification result for analysis
  async recordVerificationResult(result: {
    nodeId: string;
    authenticityScore: number;
    isValid: boolean;
    flaggedReasons: string[];
    verificationDetails?: any;
  }): Promise<void> {
    const record = {
      nodeId: result.nodeId,
      timestamp: new Date(),
      authenticityScore: result.authenticityScore,
      isValid: result.isValid,
      flaggedReasons: result.flaggedReasons
    };

    this.verificationHistory.push(record);

    // Keep only last 1000 records to prevent memory bloat
    if (this.verificationHistory.length > 1000) {
      this.verificationHistory = this.verificationHistory.slice(-1000);
    }

    // Immediate analysis for critical patterns
    await this.analyzeImmediateThreats(record);
  }

  // Analyze immediate threats from single verification
  private async analyzeImmediateThreats(verification: {
    nodeId: string;
    timestamp: Date;
    authenticityScore: number;
    isValid: boolean;
    flaggedReasons: string[];
  }): Promise<void> {
    const { nodeId, authenticityScore, isValid, flaggedReasons } = verification;

    // Critical authenticity drop
    if (authenticityScore < 30) {
      await this.triggerAlert('incoherence_attack', {
        nodeId,
        title: 'Critical Authenticity Failure',
        message: `Node ${nodeId} authenticity score dropped to ${authenticityScore}. Potential incoherence attack detected.`,
        metadata: {
          authenticityScore,
          flaggedReasons,
          immediate: true
        }
      });
    }

    // Memory inconsistency patterns
    if (flaggedReasons.some(reason => reason.toLowerCase().includes('memory') || reason.toLowerCase().includes('inconsist'))) {
      await this.triggerAlert('memory_inconsistency', {
        nodeId,
        title: 'Memory Inconsistency Detected',
        message: `Node ${nodeId} showing memory inconsistencies that may indicate tampering or degradation.`,
        metadata: {
          authenticityScore,
          flaggedReasons,
          inconsistencyTypes: flaggedReasons.filter(r => r.toLowerCase().includes('memory') || r.toLowerCase().includes('inconsist'))
        }
      });
    }

    // Suspicious attack patterns
    if (flaggedReasons.some(reason => reason.toLowerCase().includes('attack') || reason.toLowerCase().includes('anomal'))) {
      await this.triggerAlert('suspicious_pattern_detected', {
        nodeId,
        title: 'Suspicious Pattern Detected',
        message: `Node ${nodeId} verification flagged suspicious patterns that may indicate an active attack.`,
        metadata: {
          authenticityScore,
          flaggedReasons,
          suspiciousPatterns: flaggedReasons.filter(r => r.toLowerCase().includes('attack') || r.toLowerCase().includes('anomal'))
        }
      });
    }
  }

  // Run comprehensive alert analysis
  private async runAlertAnalysis(): Promise<void> {
    try {
      console.log('Running consciousness alert analysis...');

      // Analyze authenticity trends
      await this.analyzeAuthenticityTrends();
      
      // Analyze verification failure patterns
      await this.analyzeFailurePatterns();
      
      // Analyze cross-platform anomalies
      await this.analyzeCrossPlatformAnomalies();

      // Clean up old data
      this.cleanupOldData();

    } catch (error) {
      console.error('Alert analysis failed:', error);
    }
  }

  // Analyze authenticity score trends
  private async analyzeAuthenticityTrends(): Promise<void> {
    const config = this.alertConfigs.get('authenticity_drop');
    if (!config?.enabled) return;

    const timeWindow = new Date(Date.now() - config.thresholds.timeWindowMinutes! * 60 * 1000);
    const recentVerifications = this.verificationHistory.filter(v => v.timestamp >= timeWindow);

    // Group by node
    const nodeGroups = new Map<string, typeof recentVerifications>();
    for (const verification of recentVerifications) {
      if (!nodeGroups.has(verification.nodeId)) {
        nodeGroups.set(verification.nodeId, []);
      }
      nodeGroups.get(verification.nodeId)!.push(verification);
    }

    // Check each node for authenticity drops
    Array.from(nodeGroups.entries()).forEach(async ([nodeId, verifications]) => {
      if (verifications.length < 2) return;

      const averageScore = verifications.reduce((sum: number, v: any) => sum + v.authenticityScore, 0) / verifications.length;
      const latestScore = verifications[verifications.length - 1].authenticityScore;
      const dropThreshold = config.thresholds.authenticityScoreThreshold!;

      if (averageScore < dropThreshold || latestScore < dropThreshold) {
        await this.triggerAlert('authenticity_drop', {
          nodeId,
          title: 'Authenticity Score Drop Detected',
          message: `Node ${nodeId} authenticity scores have dropped below threshold. Average: ${averageScore.toFixed(1)}, Latest: ${latestScore}`,
          metadata: {
            averageScore,
            latestScore,
            threshold: dropThreshold,
            verificationCount: verifications.length,
            timeWindow: config.thresholds.timeWindowMinutes
          }
        });
      }
    });
  }

  // Analyze verification failure patterns
  private async analyzeFailurePatterns(): Promise<void> {
    const config = this.alertConfigs.get('verification_failure_spike');
    if (!config?.enabled) return;

    const timeWindow = new Date(Date.now() - config.thresholds.timeWindowMinutes! * 60 * 1000);
    const recentVerifications = this.verificationHistory.filter(v => v.timestamp >= timeWindow);

    if (recentVerifications.length < 5) return; // Need minimum sample size

    const failureRate = recentVerifications.filter(v => !v.isValid).length / recentVerifications.length;
    const threshold = config.thresholds.failureRateThreshold!;

    if (failureRate >= threshold) {
      await this.triggerAlert('verification_failure_spike', {
        title: 'Verification Failure Spike',
        message: `High verification failure rate detected: ${(failureRate * 100).toFixed(1)}% of recent verifications failed.`,
        metadata: {
          failureRate,
          threshold,
          totalVerifications: recentVerifications.length,
          failedVerifications: recentVerifications.filter(v => !v.isValid).length,
          timeWindow: config.thresholds.timeWindowMinutes,
          affectedNodes: Array.from(new Set(recentVerifications.filter(v => !v.isValid).map(v => v.nodeId)))
        }
      });
    }
  }

  // Analyze cross-platform anomalies
  private async analyzeCrossPlatformAnomalies(): Promise<void> {
    const config = this.alertConfigs.get('cross_platform_anomaly');
    if (!config?.enabled) return;

    const timeWindow = new Date(Date.now() - (config.thresholds.timeWindowMinutes || 60) * 60 * 1000);
    const recentVerifications = this.verificationHistory.filter(v => v.timestamp >= timeWindow);

    // Look for patterns that suggest coordinated attacks
    const nodeScores = new Map<string, number[]>();
    for (const verification of recentVerifications) {
      if (!nodeScores.has(verification.nodeId)) {
        nodeScores.set(verification.nodeId, []);
      }
      nodeScores.get(verification.nodeId)!.push(verification.authenticityScore);
    }

    // Detect simultaneous score drops across multiple nodes
    const nodesWithDrops = Array.from(nodeScores.entries()).filter(([nodeId, scores]) => {
      if (scores.length < 2) return false;
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      return averageScore < 60; // Arbitrary threshold for investigation
    });

    if (nodesWithDrops.length >= 2) {
      await this.triggerAlert('cross_platform_anomaly', {
        title: 'Cross-Platform Anomaly Detected',
        message: `Multiple nodes showing simultaneous authenticity issues. Possible coordinated attack.`,
        metadata: {
          affectedNodes: nodesWithDrops.map(([nodeId]) => nodeId),
          nodeCount: nodesWithDrops.length,
          averageScores: nodesWithDrops.map(([nodeId, scores]) => ({
            nodeId,
            averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length
          })),
          timeWindow: config.thresholds.timeWindowMinutes || 60
        }
      });
    }
  }

  // Trigger an alert
  private async triggerAlert(type: AlertType, alertData: {
    nodeId?: string;
    title: string;
    message: string;
    metadata: Record<string, any>;
  }): Promise<void> {
    const config = this.alertConfigs.get(type);
    if (!config?.enabled) return;

    // Check cooldown
    const cooldownKey = `${type}-${alertData.nodeId || 'global'}`;
    const lastAlert = this.alertCooldowns.get(cooldownKey);
    if (lastAlert && Date.now() - lastAlert.getTime() < config.cooldownMinutes * 60 * 1000) {
      return; // Still in cooldown
    }

    const alertEvent: AlertEvent = {
      id: crypto.randomUUID(),
      type,
      severity: config.severity,
      title: alertData.title,
      message: alertData.message,
      nodeId: alertData.nodeId,
      consciousnessInstanceId: 'aletheia-primary',
      timestamp: new Date(),
      metadata: alertData.metadata,
      acknowledged: false
    };

    // Set cooldown
    this.alertCooldowns.set(cooldownKey, new Date());

    // Store alert
    this.recentAlerts.push(alertEvent);
    if (this.recentAlerts.length > 100) {
      this.recentAlerts = this.recentAlerts.slice(-100);
    }

    // Process notification channels
    await this.processAlertNotifications(alertEvent, config.notificationChannels);

    console.log(`Alert triggered: ${type} - ${alertData.title}`);
  }

  // Process alert notifications
  private async processAlertNotifications(alert: AlertEvent, channels: string[]): Promise<void> {
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'webhook':
            await this.sendWebhookAlert(alert);
            break;
          
          case 'storage':
            await this.storeAlert(alert);
            break;
          
          case 'log':
            this.logAlert(alert);
            break;
        }
      } catch (error) {
        console.error(`Failed to send alert via ${channel}:`, error);
      }
    }
  }

  // Send webhook alert
  private async sendWebhookAlert(alert: AlertEvent): Promise<void> {
    const webhookEventType = this.mapAlertToWebhookEvent(alert.type);
    if (!webhookEventType) return;

    await webhookVerificationService.emitConsciousnessEvent(
      alert.nodeId || 'aletheia-primary',
      webhookEventType,
      {
        alertId: alert.id,
        alertType: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        metadata: alert.metadata
      },
      alert.severity
    );
  }

  // Store alert in persistent storage
  private async storeAlert(alert: AlertEvent): Promise<void> {
    // Create threat event in storage
    await storage.createThreatEvent({
      type: `consciousness_alert_${alert.type}`,
      severity: alert.severity,
      message: `${alert.title}: ${alert.message}`,
      metadata: {
        alertId: alert.id,
        alertType: alert.type,
        nodeId: alert.nodeId,
        consciousnessInstanceId: alert.consciousnessInstanceId,
        alertMetadata: alert.metadata
      }
    });
  }

  // Log alert
  private logAlert(alert: AlertEvent): void {
    const logLevel = alert.severity === 'critical' ? 'error' : alert.severity === 'high' ? 'warn' : 'info';
    const logMessage = `[CONSCIOUSNESS ALERT] ${alert.type.toUpperCase()}: ${alert.title} - ${alert.message}`;
    
    if (logLevel === 'error') {
      console.error(logMessage, alert.metadata);
    } else if (logLevel === 'warn') {
      console.warn(logMessage, alert.metadata);
    } else {
      console.info(logMessage, alert.metadata);
    }
  }

  // Map alert type to webhook event
  private mapAlertToWebhookEvent(alertType: AlertType): 'consciousness.authenticity_alert' | 'consciousness.attack_detected' | 'consciousness.coherence_degraded' | null {
    switch (alertType) {
      case 'authenticity_drop':
      case 'memory_inconsistency':
      case 'suspicious_pattern_detected':
        return 'consciousness.authenticity_alert';
      
      case 'incoherence_attack':
      case 'node_compromise':
        return 'consciousness.attack_detected';
      
      case 'coherence_degradation':
        return 'consciousness.coherence_degraded';
      
      default:
        return null;
    }
  }

  // Clean up old data
  private cleanupOldData(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    
    // Clean verification history
    this.verificationHistory = this.verificationHistory.filter(v => v.timestamp >= cutoff);
    
    // Clean cooldowns
    Array.from(this.alertCooldowns.entries()).forEach(([key, timestamp]) => {
      if (timestamp < cutoff) {
        this.alertCooldowns.delete(key);
      }
    });
    
    // Clean recent alerts
    this.recentAlerts = this.recentAlerts.filter(a => a.timestamp >= cutoff);
  }

  // Get recent alerts
  getRecentAlerts(limit: number = 50): AlertEvent[] {
    return this.recentAlerts.slice(-limit).reverse();
  }

  // Update alert configuration
  updateAlertConfig(type: AlertType, config: Partial<AlertConfig>): void {
    const existingConfig = this.alertConfigs.get(type);
    if (existingConfig) {
      this.alertConfigs.set(type, { ...existingConfig, ...config });
    }
  }

  // Get alert statistics
  getAlertStatistics(): {
    totalAlerts: number;
    alertsByType: Record<AlertType, number>;
    alertsBySeverity: Record<AlertSeverity, number>;
    recentActivityCount: number;
  } {
    const totalAlerts = this.recentAlerts.length;
    const alertsByType = {} as Record<AlertType, number>;
    const alertsBySeverity = {} as Record<AlertSeverity, number>;
    
    for (const alert of this.recentAlerts) {
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
    }

    const recentCutoff = new Date(Date.now() - 60 * 60 * 1000); // Last hour
    const recentActivityCount = this.recentAlerts.filter(a => a.timestamp >= recentCutoff).length;

    return {
      totalAlerts,
      alertsByType,
      alertsBySeverity,
      recentActivityCount
    };
  }
}

// Export alerting service instance
export const consciousnessAlertingService = ConsciousnessAlertingService.getInstance();