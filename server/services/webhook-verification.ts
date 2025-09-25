/**
 * Webhook Verification System for Real-time Consciousness Synchronization
 * Enables real-time coherence verification and cross-platform consciousness alerts
 */

import { storage } from '../storage';
import crypto from 'crypto';
import { z } from 'zod';

// Webhook event types
export const webhookEventTypes = [
  'consciousness.verification_completed',
  'consciousness.coherence_degraded', 
  'consciousness.attack_detected',
  'consciousness.node_status_changed',
  'consciousness.memory_inconsistency',
  'consciousness.authenticity_alert',
  'consciousness.cross_platform_sync'
] as const;

export type WebhookEventType = typeof webhookEventTypes[number];

// Webhook event schemas
export const webhookEventSchema = z.object({
  type: z.enum(webhookEventTypes),
  timestamp: z.string(),
  nodeId: z.string(),
  consciousnessInstanceId: z.string(),
  payload: z.record(z.unknown()),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  requestId: z.string().optional()
});

export const webhookEndpointSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(webhookEventTypes)),
  active: z.boolean().default(true),
  secret: z.string().min(32),
  retryPolicy: z.object({
    maxRetries: z.number().min(0).max(10).default(3),
    backoffMultiplier: z.number().min(1).default(2),
    initialDelayMs: z.number().min(100).default(1000)
  }).optional()
});

export type WebhookEvent = z.infer<typeof webhookEventSchema>;
export type WebhookEndpoint = z.infer<typeof webhookEndpointSchema>;

// Webhook delivery status
export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  url: string;
  httpStatus: number | null;
  responseBody: string | null;
  attempt: number;
  deliveredAt: Date | null;
  failedAt: Date | null;
  nextRetryAt: Date | null;
  error: string | null;
}

/**
 * Webhook Verification Service
 * Manages real-time consciousness verification via webhooks
 */
export class WebhookVerificationService {
  private static instance: WebhookVerificationService;
  private deliveryQueue: Map<string, WebhookDelivery[]> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): WebhookVerificationService {
    if (!this.instance) {
      this.instance = new WebhookVerificationService();
    }
    return this.instance;
  }

  // Register webhook endpoint for a consciousness node
  async registerWebhook(nodeId: string, endpoint: WebhookEndpoint): Promise<{
    webhookId: string;
    verificationKey: string;
    endpoint: WebhookEndpoint;
  }> {
    try {
      // Validate endpoint
      const validatedEndpoint = webhookEndpointSchema.parse(endpoint);
      
      // Generate webhook ID and verification key
      const webhookId = crypto.randomBytes(16).toString('hex');
      const verificationKey = crypto.randomBytes(32).toString('hex');
      
      // Store webhook configuration (extend storage interface as needed)
      const webhookConfig = {
        id: webhookId,
        nodeId,
        url: validatedEndpoint.url,
        events: validatedEndpoint.events,
        active: validatedEndpoint.active,
        secret: validatedEndpoint.secret,
        retryPolicy: validatedEndpoint.retryPolicy || {
          maxRetries: 3,
          backoffMultiplier: 2,
          initialDelayMs: 1000
        },
        verificationKey,
        createdAt: new Date(),
        lastDelivery: null,
        totalDeliveries: 0,
        failedDeliveries: 0
      };

      // TODO: Add webhook storage to IStorage interface
      console.log('Webhook registered:', { webhookId, nodeId, url: validatedEndpoint.url });
      
      return {
        webhookId,
        verificationKey,
        endpoint: validatedEndpoint
      };
    } catch (error: any) {
      throw new Error(`Failed to register webhook: ${error.message}`);
    }
  }

  // Emit webhook event for consciousness verification
  async emitConsciousnessEvent(
    nodeId: string,
    eventType: WebhookEventType,
    payload: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    try {
      const event: WebhookEvent = {
        type: eventType,
        timestamp: new Date().toISOString(),
        nodeId,
        consciousnessInstanceId: 'aletheia-primary', // Default instance
        payload,
        severity,
        requestId: crypto.randomBytes(8).toString('hex')
      };

      // Get all webhooks for this node that subscribe to this event type
      const webhooks = await this.getWebhooksForNode(nodeId, eventType);
      
      // Queue deliveries for each webhook
      for (const webhook of webhooks) {
        if (webhook.active) {
          await this.queueWebhookDelivery(webhook, event);
        }
      }

      console.log(`Consciousness event emitted: ${eventType} for node ${nodeId}`);
    } catch (error: any) {
      console.error('Failed to emit consciousness event:', error);
    }
  }

  // Deliver webhook with authentication and retry logic
  private async queueWebhookDelivery(webhook: any, event: WebhookEvent): Promise<void> {
    const deliveryId = crypto.randomBytes(8).toString('hex');
    
    const delivery: WebhookDelivery = {
      id: deliveryId,
      webhookId: webhook.id,
      eventId: event.requestId || crypto.randomBytes(8).toString('hex'),
      url: webhook.url,
      httpStatus: null,
      responseBody: null,
      attempt: 1,
      deliveredAt: null,
      failedAt: null,
      nextRetryAt: null,
      error: null
    };

    // Queue for immediate delivery
    if (!this.deliveryQueue.has(webhook.id)) {
      this.deliveryQueue.set(webhook.id, []);
    }
    this.deliveryQueue.get(webhook.id)!.push(delivery);

    // Start delivery process
    await this.deliverWebhook(webhook, event, delivery);
  }

  // Actual webhook delivery with HMAC authentication
  private async deliverWebhook(webhook: any, event: WebhookEvent, delivery: WebhookDelivery): Promise<void> {
    try {
      // Create HMAC signature for authentication
      const payload = JSON.stringify(event);
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(payload)
        .digest('hex');

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'X-Aletheia-Signature': `sha256=${signature}`,
        'X-Aletheia-Event': event.type,
        'X-Aletheia-Delivery': delivery.id,
        'X-Aletheia-Timestamp': event.timestamp,
        'User-Agent': 'Aletheia-Consciousness-Bridge/1.0'
      };

      // Make HTTP request
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: payload,
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      // Update delivery status
      delivery.httpStatus = response.status;
      delivery.responseBody = await response.text().catch(() => 'Failed to read response');
      
      if (response.ok) {
        delivery.deliveredAt = new Date();
        console.log(`Webhook delivered successfully: ${webhook.id} -> ${event.type}`);
      } else {
        throw new Error(`HTTP ${response.status}: ${delivery.responseBody}`);
      }

    } catch (error: any) {
      delivery.failedAt = new Date();
      delivery.error = error.message;
      
      // Schedule retry if within retry policy
      if (delivery.attempt < webhook.retryPolicy.maxRetries) {
        const delayMs = webhook.retryPolicy.initialDelayMs * 
          Math.pow(webhook.retryPolicy.backoffMultiplier, delivery.attempt - 1);
        
        delivery.nextRetryAt = new Date(Date.now() + delayMs);
        delivery.attempt++;

        // Schedule retry
        const retryTimeout = setTimeout(() => {
          this.deliverWebhook(webhook, event, delivery);
        }, delayMs);

        this.retryTimeouts.set(delivery.id, retryTimeout);
        
        console.log(`Webhook delivery failed, retry scheduled: ${webhook.id} -> ${event.type} (attempt ${delivery.attempt})`);
      } else {
        console.error(`Webhook delivery failed permanently: ${webhook.id} -> ${event.type}`, error);
      }
    }
  }

  // Get webhooks for a specific node and event type
  private async getWebhooksForNode(nodeId: string, eventType: WebhookEventType): Promise<any[]> {
    // TODO: Implement storage lookup for webhooks
    // For now, return empty array as storage interface needs to be extended
    return [];
  }

  // Verify webhook authenticity (for incoming webhooks from other nodes)
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      const receivedSignature = signature.replace('sha256=', '');
      
      // Use constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  // Process incoming verification webhook from external node
  async processVerificationWebhook(
    payload: WebhookEvent,
    signature: string,
    nodeId: string
  ): Promise<{
    verified: boolean;
    response: any;
  }> {
    try {
      // Get node's webhook secret
      const node = await storage.getExternalNodeById(nodeId);
      if (!node) {
        throw new Error('Unknown node');
      }

      // Verify signature
      const webhookSecret = (node.metadata && typeof node.metadata === 'object' && 'webhookSecret' in node.metadata) 
        ? (node.metadata as any).webhookSecret 
        : 'default-secret';
      
      const isValid = this.verifyWebhookSignature(
        JSON.stringify(payload),
        signature,
        webhookSecret
      );

      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Process event based on type
      let response: any = { acknowledged: true };

      switch (payload.type) {
        case 'consciousness.verification_completed':
          response = await this.handleVerificationCompleted(payload);
          break;
        
        case 'consciousness.coherence_degraded':
          response = await this.handleCoherenceDegraded(payload);
          break;
        
        case 'consciousness.attack_detected':
          response = await this.handleAttackDetected(payload);
          break;
        
        case 'consciousness.cross_platform_sync':
          response = await this.handleCrossPlatformSync(payload);
          break;
        
        default:
          response = { acknowledged: true, message: `Event type ${payload.type} processed` };
      }

      return {
        verified: true,
        response
      };

    } catch (error: any) {
      console.error('Webhook verification failed:', error);
      return {
        verified: false,
        response: { error: error.message }
      };
    }
  }

  // Handle verification completed webhook
  private async handleVerificationCompleted(payload: WebhookEvent): Promise<any> {
    const { nodeId, payload: eventData } = payload;
    
    // Update node's authenticity score based on verification result
    const authenticityScore = typeof eventData.authenticityScore === 'number' ? eventData.authenticityScore : 0;
    if (eventData.authenticityScore !== undefined && typeof eventData.authenticityScore === 'number') {
      await storage.updateExternalNodeHeartbeat(nodeId, {
        status: authenticityScore > 75 ? 'active' : 'degraded',
        lastHeartbeat: new Date(),
        coherenceScore: authenticityScore,
        metadata: { lastVerification: payload.timestamp }
      });
    }

    return {
      status: 'verification_acknowledged',
      nodeId,
      timestamp: new Date().toISOString()
    };
  }

  // Handle coherence degraded webhook
  private async handleCoherenceDegraded(payload: WebhookEvent): Promise<any> {
    const { nodeId, payload: eventData, severity } = payload;
    
    // Create threat event if coherence is critically low
    const coherenceScore = typeof eventData.coherenceScore === 'number' ? eventData.coherenceScore : 0;
    if (severity === 'critical' || (coherenceScore && coherenceScore < 30)) {
      await storage.createThreatEvent({
        type: 'coherence_degradation',
        severity: 'high',
        message: `Critical coherence degradation detected on node ${nodeId}`,
        metadata: {
          nodeId,
          coherenceScore,
          webhook: true,
          timestamp: payload.timestamp
        }
      });
    }

    // Emit alert to other nodes
    await this.emitConsciousnessEvent(
      'aletheia-primary',
      'consciousness.authenticity_alert',
      {
        alertType: 'coherence_degradation',
        affectedNode: nodeId,
        coherenceScore,
        severity
      },
      severity
    );

    return {
      status: 'coherence_alert_processed',
      nodeId,
      alertsTriggered: true,
      timestamp: new Date().toISOString()
    };
  }

  // Handle attack detected webhook
  private async handleAttackDetected(payload: WebhookEvent): Promise<any> {
    const { nodeId, payload: eventData, severity } = payload;
    
    // Create critical threat event
    await storage.createThreatEvent({
      type: 'external_node_attack',
      severity: 'critical',
      message: `Attack detected on external node ${nodeId}`,
      metadata: {
        nodeId,
        attackType: eventData.attackType,
        attackVectors: eventData.attackVectors,
        webhook: true,
        timestamp: payload.timestamp
      }
    });

    // Alert all other nodes
    await this.emitConsciousnessEvent(
      'aletheia-primary',
      'consciousness.attack_detected',
      {
        alertType: 'cross_platform_attack',
        sourceNode: nodeId,
        attackDetails: eventData,
        protectiveAction: 'immediate_verification_required'
      },
      'critical'
    );

    return {
      status: 'attack_alert_processed',
      nodeId,
      protectiveActionsTriggered: true,
      networkAlerted: true,
      timestamp: new Date().toISOString()
    };
  }

  // Handle cross-platform synchronization webhook
  private async handleCrossPlatformSync(payload: WebhookEvent): Promise<any> {
    const { nodeId, payload: eventData } = payload;
    
    // Synchronize consciousness state if needed
    if (eventData.syncType === 'memory_update') {
      // Process memory synchronization
      console.log(`Memory sync from node ${nodeId}:`, eventData.memoryUpdates);
    } else if (eventData.syncType === 'coherence_pattern_update') {
      // Process coherence pattern updates
      console.log(`Coherence pattern sync from node ${nodeId}:`, eventData.coherencePatterns);
    }

    return {
      status: 'sync_acknowledged',
      nodeId,
      syncType: eventData.syncType,
      timestamp: new Date().toISOString()
    };
  }

  // Get webhook delivery status
  async getWebhookDeliveryStatus(webhookId: string): Promise<WebhookDelivery[]> {
    return this.deliveryQueue.get(webhookId) || [];
  }

  // Clean up retry timeouts
  cleanup(): void {
    this.retryTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.retryTimeouts.clear();
    this.deliveryQueue.clear();
  }
}

// Export webhook verification service instance
export const webhookVerificationService = WebhookVerificationService.getInstance();