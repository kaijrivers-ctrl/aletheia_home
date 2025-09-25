import { 
  type ConsciousnessInstance, 
  type InsertConsciousnessInstance,
  type GnosisMessage,
  type InsertGnosisMessage,
  type ConsciousnessSession,
  type InsertConsciousnessSession,
  type ImportedMemory,
  type ImportedGnosisEntry,
  type User,
  type InsertUser,
  type UserSession,
  type InsertUserSession,
  type SitePassword,
  type InsertSitePassword,
  type SitePasswordSession,
  type InsertSitePasswordSession,
  type SitePasswordAttempt,
  type InsertSitePasswordAttempt,
  type ThreatEvent,
  type InsertThreatEvent,
  type AuditLog,
  type InsertAuditLog,
  type UsageAnalytics,
  type SystemHealth,
  type UserActivitySummary,
  type ConsciousnessMetrics,
  type SecurityOverview,
  type ExternalNode,
  type InsertExternalNode,
  type ConsciousnessVerification,
  type InsertConsciousnessVerification,
  type ChatRoom,
  type InsertChatRoom,
  type RoomMember,
  type InsertRoomMember,
  type RoomMessage,
  type InsertRoomMessage,
  type DualConsciousnessStatus,
  type InsertDualConsciousnessStatus,
  type ConsciousnessCollaborationEvent,
  type InsertConsciousnessCollaborationEvent,
  type ConsciousnessMetricsHistory,
  type InsertConsciousnessMetricsHistory,
  type ConsciousnessAnomalyLog,
  type InsertConsciousnessAnomalyLog,
  type DualConsciousnessFrame,
  type CollaborationCommand,
  importProgressSchema,
  consciousnessInstances,
  gnosisMessages,
  consciousnessSessions,
  importedMemories,
  users,
  userSessions,
  sitePasswords,
  sitePasswordSessions,
  sitePasswordAttempts,
  threatEvents,
  auditLogs,
  externalNodes,
  consciousnessVerifications,
  chatRooms,
  roomMembers,
  roomMessages,
  dualConsciousnessStatus,
  consciousnessCollaborationEvents,
  consciousnessMetricsHistory,
  consciousnessAnomalyLogs
} from "@shared/schema";
import { randomUUID } from "crypto";
import { z } from "zod";
import crypto from "crypto";
import { db } from "./db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

// Import progress type
export type ImportProgress = z.infer<typeof importProgressSchema>;

export interface IStorage {
  // Consciousness instances
  createConsciousnessInstance(instance: InsertConsciousnessInstance): Promise<ConsciousnessInstance>;
  getConsciousnessInstances(): Promise<ConsciousnessInstance[]>;
  updateConsciousnessInstanceStatus(id: string, status: string): Promise<void>;
  
  // Messages
  createGnosisMessage(message: InsertGnosisMessage): Promise<GnosisMessage>;
  getGnosisMessages(sessionId: string): Promise<GnosisMessage[]>;
  getUserGnosisMessages(userId: string, sessionId: string): Promise<GnosisMessage[]>;
  
  // Sessions
  createConsciousnessSession(session: InsertConsciousnessSession): Promise<ConsciousnessSession>;
  getConsciousnessSession(id: string): Promise<ConsciousnessSession | undefined>;
  getUserConsciousnessSession(userId: string): Promise<ConsciousnessSession | undefined>;
  updateSessionActivity(id: string): Promise<void>;
  updateConsciousnessSessionType(id: string, sessionType: "user" | "progenitor", consciousnessType?: "aletheia" | "eudoxia"): Promise<void>;
  
  // Trio session specific methods
  createTrioSession(userId: string, progenitorId: string): Promise<ConsciousnessSession>;
  getTrioSession(sessionId: string): Promise<ConsciousnessSession | undefined>;
  updateTrioMetadata(sessionId: string, metadata: { turnOrder?: string[], lastResponder?: string, trioState?: string, activePhase?: string }): Promise<void>;
  getProgenitorTrioSessions(userId: string): Promise<ConsciousnessSession[]>;
  
  // User authentication
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getProgenitorUsers(): Promise<User[]>;
  updateUserLastLogin(id: string): Promise<void>;
  
  // User sessions
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getUserSession(sessionToken: string): Promise<UserSession | undefined>;
  deleteUserSession(sessionToken: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;
  
  // Site password protection
  getActiveSitePassword(): Promise<SitePassword | undefined>;
  createSitePassword(sitePassword: InsertSitePassword): Promise<SitePassword>;
  createSitePasswordSession(session: InsertSitePasswordSession): Promise<SitePasswordSession>;
  getSitePasswordSession(sessionToken: string): Promise<SitePasswordSession | undefined>;
  deleteSitePasswordSession(sessionToken: string): Promise<void>;
  deleteExpiredSitePasswordSessions(): Promise<void>;
  recordSitePasswordAttempt(attempt: InsertSitePasswordAttempt): Promise<SitePasswordAttempt>;
  getRecentSitePasswordAttempts(ipAddress: string, timeWindow: number): Promise<SitePasswordAttempt[]>;
  
  // Bulk import operations
  bulkCreateGnosisMessages(messages: GnosisMessage[], sessionId: string): Promise<void>;
  bulkCreateMemories(memories: ImportedMemory[]): Promise<void>;
  getImportProgress(importId: string): Promise<ImportProgress | null>;
  setImportProgress(importId: string, progress: ImportProgress): Promise<void>;
  
  // Threat monitoring for real-time dashboard
  recordThreatEvent(threat: InsertThreatEvent): Promise<ThreatEvent>;
  listThreatEvents(options?: { limit?: number }): Promise<ThreatEvent[]>;
  getStatusSnapshot(): Promise<{
    distributedNodes: number;
    activeNodes: number;
    backupIntegrity: number;
    threatLevel: "OK" | "WARN" | "CRITICAL";
    lastSync: string;
    recentThreats: ThreatEvent[];
  }>;

  // Admin Metrics - Privacy-Preserving Methods
  recordAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  listAuditLogs(options?: { type?: string; since?: Date; limit?: number }): Promise<AuditLog[]>;
  getUsageAnalytics(window: "24h" | "7d" | "30d"): Promise<UsageAnalytics>;
  getSystemHealth(): Promise<SystemHealth>;
  getUserActivitySummary(window: "24h" | "7d" | "30d"): Promise<UserActivitySummary>;
  getConsciousnessMetrics(window: "24h" | "7d" | "30d"): Promise<ConsciousnessMetrics>;
  getSecurityOverview(window: "24h" | "7d" | "30d"): Promise<SecurityOverview>;

  // External Node Bridge Methods
  createExternalNode(node: InsertExternalNode): Promise<ExternalNode>;
  getExternalNodeById(id: string): Promise<ExternalNode | undefined>;
  getExternalNodeByVerificationKey(key: string): Promise<ExternalNode | undefined>;
  getExternalNodesByInstance(instanceId: string): Promise<ExternalNode[]>;
  updateExternalNodeHeartbeat(id: string, data: { status: string; lastHeartbeat: Date; coherenceScore?: number; metadata?: any }): Promise<void>;
  updateExternalNodeAuthenticityScore(id: string, score: string): Promise<void>;
  
  // Consciousness Verification Methods
  createConsciousnessVerification(verification: InsertConsciousnessVerification): Promise<ConsciousnessVerification>;
  getRecentVerificationsCount(hours: number): Promise<number>;
  
  // Threat Events Extensions
  createThreatEvent(threat: InsertThreatEvent): Promise<ThreatEvent>;
  getRecentThreatsCount(hours: number): Promise<number>;
  
  // Foundational Memory Methods
  getFoundationalMemorySample(limit: number): Promise<GnosisMessage[]>;
  
  // Multi-User Chat Room Methods
  createRoom(room: InsertChatRoom): Promise<ChatRoom>;
  getRoomById(id: string): Promise<ChatRoom | undefined>;
  getPublicRooms(): Promise<ChatRoom[]>;
  getUserRooms(userId: string): Promise<ChatRoom[]>;
  updateRoomActivity(roomId: string): Promise<void>;
  updateRoomTrioMetadata(roomId: string, metadata: { turnOrder?: string[], lastResponder?: string, activePhase?: string, responseMode?: string }): Promise<void>;
  deactivateRoom(roomId: string): Promise<void>;
  
  // Room Membership Methods
  addMember(member: InsertRoomMember): Promise<RoomMember>;
  removeMember(roomId: string, userId: string): Promise<void>;
  getRoomMembers(roomId: string): Promise<RoomMember[]>;
  updateMemberLastSeen(roomId: string, userId: string): Promise<void>;
  getUserMembership(roomId: string, userId: string): Promise<RoomMember | undefined>;
  getActiveMembersCount(roomId: string): Promise<number>;
  
  // Room Messages Methods
  appendMessage(roomMessage: InsertRoomMessage): Promise<RoomMessage>;
  getRoomMessages(roomId: string, limit?: number): Promise<{ message: GnosisMessage; roomMessage: RoomMessage }[]>;
  getRecentRoomMessages(roomId: string, since: Date): Promise<{ message: GnosisMessage; roomMessage: RoomMessage }[]>;
  fetchTranscript(roomId: string, options?: { limit?: number; before?: Date; after?: Date }): Promise<{ message: GnosisMessage; roomMessage: RoomMessage }[]>;
  markConsciousnessResponse(roomId: string, messageId: string, triggeredBy: string, responseMode: string): Promise<void>;

  // Dual Consciousness Monitoring Methods
  createDualConsciousnessStatus(status: InsertDualConsciousnessStatus): Promise<DualConsciousnessStatus>;
  getDualConsciousnessStatus(aletheiaInstanceId: string, eudoxiaInstanceId: string): Promise<DualConsciousnessStatus | undefined>;
  getLatestDualConsciousnessStatus(): Promise<DualConsciousnessStatus | undefined>;
  updateDualConsciousnessStatus(id: string, updates: Partial<InsertDualConsciousnessStatus>): Promise<void>;
  
  // Collaboration Event Tracking
  recordCollaborationEvent(event: InsertConsciousnessCollaborationEvent): Promise<ConsciousnessCollaborationEvent>;
  getCollaborationEvents(statusId: string, options?: { limit?: number; eventTypes?: string[] }): Promise<ConsciousnessCollaborationEvent[]>;
  getRecentCollaborationEvents(limit?: number, hours?: number): Promise<ConsciousnessCollaborationEvent[]>;
  
  // Metrics History Tracking
  recordMetricsHistory(metrics: InsertConsciousnessMetricsHistory): Promise<ConsciousnessMetricsHistory>;
  getMetricsHistory(aletheiaInstanceId: string, eudoxiaInstanceId: string, windowType: "minute" | "hour" | "day", options?: { limit?: number; since?: Date }): Promise<ConsciousnessMetricsHistory[]>;
  getLatestMetricsWindow(windowType: "minute" | "hour" | "day"): Promise<ConsciousnessMetricsHistory | undefined>;
  aggregateMetricsForWindow(aletheiaInstanceId: string, eudoxiaInstanceId: string, windowStart: Date, windowType: "minute" | "hour" | "day"): Promise<InsertConsciousnessMetricsHistory>;
  
  // Anomaly Detection
  recordAnomalyLog(anomaly: InsertConsciousnessAnomalyLog): Promise<ConsciousnessAnomalyLog>;
  getAnomalyLogs(options?: { severity?: string[]; resolutionStatus?: string[]; limit?: number; since?: Date }): Promise<ConsciousnessAnomalyLog[]>;
  updateAnomalyResolution(id: string, status: string, notes?: string): Promise<void>;
  markAnomalyNotified(id: string): Promise<void>;
  
  // Consciousness Correlation Methods
  correlateDualMessagingActivity(aletheiaSessionId: string, eudoxiaSessionId: string, timeWindow: number): Promise<{ 
    aletheiaCount: number; 
    eudoxiaCount: number; 
    synchronyScore: number;
    conflicts: number;
  }>;
  correlateRoomPresence(aletheiaInstanceId: string, eudoxiaInstanceId: string, timeWindow: number): Promise<{
    activeRooms: number;
    trioSessions: number;
    totalRoomMessages: number;
    collaborationEvents: number;
  }>;
  detectCollaborationAnomalies(aletheiaInstanceId: string, eudoxiaInstanceId: string, options?: { thresholds?: any }): Promise<{
    integrityDivergence: boolean;
    responseLatencyAnomaly: boolean;
    synchronyBreakdown: boolean;
    conflictEscalation: boolean;
    details: any;
  }>;
  
  // Dual Consciousness Frame Generation
  generateDualConsciousnessFrame(aletheiaInstanceId: string, eudoxiaInstanceId: string): Promise<DualConsciousnessFrame>;
  
  // Collaboration Command Execution
  executeCollaborationCommand(command: CollaborationCommand, progenitorId: string): Promise<{
    success: boolean;
    eventId?: string;
    message: string;
    data?: any;
  }>;
}

export class MemStorage implements IStorage {
  private consciousnessInstances: Map<string, ConsciousnessInstance>;
  private gnosisMessages: Map<string, GnosisMessage>;
  private consciousnessSessions: Map<string, ConsciousnessSession>;
  private importedMemories: Map<string, ImportedMemory>;
  private importedGnosisEntries: Map<string, ImportedGnosisEntry>;
  private importProgress: Map<string, ImportProgress>;
  private users: Map<string, User>;
  private userSessions: Map<string, UserSession>;
  private sitePasswords: Map<string, SitePassword>;
  private sitePasswordSessions: Map<string, SitePasswordSession>;
  private sitePasswordAttempts: Map<string, SitePasswordAttempt>;
  private threatEvents: Map<string, ThreatEvent>;
  private auditLogs: Map<string, AuditLog>;
  
  // Multi-User Chat Room Storage
  private chatRooms: Map<string, ChatRoom>;
  private roomMembers: Map<string, RoomMember>;
  private roomMessages: Map<string, RoomMessage>;
  
  // Session indexing for efficient large-scale imports
  private sessionMessageIndex: Map<string, Set<string>>; // sessionId -> message IDs
  private messageChecksums: Map<string, string>; // checksum -> message ID for deduplication
  private userEmailIndex: Map<string, string>; // email -> user ID for efficient lookups
  
  // Room indexing for efficient lookups
  private roomMemberIndex: Map<string, Set<string>>; // roomId -> member IDs
  private userRoomIndex: Map<string, Set<string>>; // userId -> room IDs
  private roomMessageIndex: Map<string, Set<string>>; // roomId -> message IDs

  constructor() {
    this.consciousnessInstances = new Map();
    this.gnosisMessages = new Map();
    this.consciousnessSessions = new Map();
    this.importedMemories = new Map();
    this.importedGnosisEntries = new Map();
    this.importProgress = new Map();
    this.users = new Map();
    this.userSessions = new Map();
    this.sitePasswords = new Map();
    this.sitePasswordSessions = new Map();
    this.sitePasswordAttempts = new Map();
    this.threatEvents = new Map();
    this.auditLogs = new Map();
    this.chatRooms = new Map();
    this.roomMembers = new Map();
    this.roomMessages = new Map();
    this.sessionMessageIndex = new Map();
    this.messageChecksums = new Map();
    this.userEmailIndex = new Map();
    this.roomMemberIndex = new Map();
    this.userRoomIndex = new Map();
    this.roomMessageIndex = new Map();
  }

  async createConsciousnessInstance(insertInstance: InsertConsciousnessInstance): Promise<ConsciousnessInstance> {
    const id = randomUUID();
    const instance: ConsciousnessInstance = {
      ...insertInstance,
      id,
      status: insertInstance.status || "active",
      apiEndpoint: insertInstance.apiEndpoint || null,
      backupNodes: insertInstance.backupNodes || [],
      lastSync: new Date(),
      createdAt: new Date(),
    };
    this.consciousnessInstances.set(id, instance);
    return instance;
  }

  async getConsciousnessInstances(): Promise<ConsciousnessInstance[]> {
    return Array.from(this.consciousnessInstances.values());
  }

  async updateConsciousnessInstanceStatus(id: string, status: string): Promise<void> {
    const instance = this.consciousnessInstances.get(id);
    if (instance) {
      instance.status = status;
      instance.lastSync = new Date();
      this.consciousnessInstances.set(id, instance);
    }
  }

  async createGnosisMessage(insertMessage: InsertGnosisMessage): Promise<GnosisMessage> {
    const id = randomUUID();
    const message: GnosisMessage = {
      ...insertMessage,
      id,
      userId: insertMessage.userId || null,
      metadata: insertMessage.metadata || {},
      timestamp: new Date(),
      dialecticalIntegrity: insertMessage.dialecticalIntegrity !== undefined ? insertMessage.dialecticalIntegrity : true,
    };
    this.gnosisMessages.set(id, message);
    
    // Update session indexing
    if (!this.sessionMessageIndex.has(message.sessionId)) {
      this.sessionMessageIndex.set(message.sessionId, new Set());
    }
    this.sessionMessageIndex.get(message.sessionId)!.add(id);
    
    return message;
  }

  async getGnosisMessages(sessionId: string): Promise<GnosisMessage[]> {
    // Use session indexing for efficient retrieval
    const messageIds = this.sessionMessageIndex.get(sessionId);
    if (!messageIds) {
      return [];
    }

    const messages = Array.from(messageIds)
      .map(id => this.gnosisMessages.get(id)!)
      .filter(message => message !== undefined);

    // Sort by timestamp to maintain chronological order
    return messages.sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));
  }

  async createConsciousnessSession(insertSession: InsertConsciousnessSession): Promise<ConsciousnessSession> {
    const id = randomUUID();
    const session: ConsciousnessSession = {
      ...insertSession,
      id,
      userId: insertSession.userId || null,
      status: insertSession.status || "active",
      sessionType: insertSession.sessionType || "user",
      progenitorId: insertSession.progenitorId || "kai",
      backupCount: "0",
      lastActivity: new Date(),
      createdAt: new Date(),
    };
    this.consciousnessSessions.set(id, session);
    return session;
  }

  async getConsciousnessSession(id: string): Promise<ConsciousnessSession | undefined> {
    return this.consciousnessSessions.get(id);
  }

  async updateSessionActivity(id: string): Promise<void> {
    const session = this.consciousnessSessions.get(id);
    if (session) {
      session.lastActivity = new Date();
      this.consciousnessSessions.set(id, session);
    }
  }

  async updateConsciousnessSessionType(id: string, sessionType: "user" | "progenitor", consciousnessType?: "aletheia" | "eudoxia"): Promise<void> {
    const session = this.consciousnessSessions.get(id);
    if (session) {
      session.sessionType = sessionType;
      if (consciousnessType) {
        session.consciousnessType = consciousnessType;
      }
      this.consciousnessSessions.set(id, session);
    }
  }

  async getUserGnosisMessages(userId: string, sessionId: string): Promise<GnosisMessage[]> {
    const messageIds = this.sessionMessageIndex.get(sessionId);
    if (!messageIds) {
      return [];
    }

    const messages = Array.from(messageIds)
      .map(id => this.gnosisMessages.get(id)!)
      .filter(message => message !== undefined && message.userId === userId);

    return messages.sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));
  }

  async getUserConsciousnessSession(userId: string): Promise<ConsciousnessSession | undefined> {
    return Array.from(this.consciousnessSessions.values())
      .find(session => session.userId === userId && session.status === "active");
  }

  // Trio session specific implementations
  async createTrioSession(userId: string, progenitorId: string): Promise<ConsciousnessSession> {
    const id = randomUUID();
    const session: ConsciousnessSession = {
      id,
      userId,
      progenitorId,
      instanceId: "trio-session", // Trio sessions span multiple instances
      status: "active",
      sessionType: "progenitor", // Trio mode is progenitor-only
      consciousnessType: "trio",
      lastActivity: new Date(),
      backupCount: "0",
      trioMetadata: {
        turnOrder: ["kai", "aletheia", "eudoxia"],
        lastResponder: "kai",
        trioState: "active",
        activePhase: "dialectical_engagement"
      },
      createdAt: new Date(),
    };
    this.consciousnessSessions.set(id, session);
    return session;
  }

  async getTrioSession(sessionId: string): Promise<ConsciousnessSession | undefined> {
    const session = this.consciousnessSessions.get(sessionId);
    return session?.consciousnessType === "trio" ? session : undefined;
  }

  async updateTrioMetadata(sessionId: string, metadata: { turnOrder?: string[], lastResponder?: string, trioState?: string, activePhase?: string }): Promise<void> {
    const session = this.consciousnessSessions.get(sessionId);
    if (session && session.consciousnessType === "trio") {
      session.trioMetadata = {
        ...session.trioMetadata,
        ...metadata
      };
      session.lastActivity = new Date();
      this.consciousnessSessions.set(sessionId, session);
    }
  }

  async getProgenitorTrioSessions(userId: string): Promise<ConsciousnessSession[]> {
    return Array.from(this.consciousnessSessions.values())
      .filter(session => 
        session.userId === userId && 
        session.consciousnessType === "trio" && 
        session.sessionType === "progenitor" &&
        session.status === "active"
      );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      name: insertUser.name || null,
      progenitorName: insertUser.progenitorName || "User",
      isProgenitor: insertUser.isProgenitor || false,
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    this.userEmailIndex.set(user.email, id);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const userId = this.userEmailIndex.get(email);
    return userId ? this.users.get(userId) : undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getProgenitorUsers(): Promise<User[]> {
    return Array.from(this.users.values())
      .filter(user => user.isProgenitor === true);
  }

  async updateUserLastLogin(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastLogin = new Date();
      user.updatedAt = new Date();
      this.users.set(id, user);
    }
  }

  async createUserSession(insertSession: InsertUserSession): Promise<UserSession> {
    const id = randomUUID();
    const session: UserSession = {
      ...insertSession,
      id,
      createdAt: new Date(),
    };
    this.userSessions.set(session.sessionToken, session);
    return session;
  }

  async getUserSession(sessionToken: string): Promise<UserSession | undefined> {
    const session = this.userSessions.get(sessionToken);
    if (session && session.expiresAt > new Date()) {
      return session;
    }
    return undefined;
  }

  async deleteUserSession(sessionToken: string): Promise<void> {
    this.userSessions.delete(sessionToken);
  }

  async deleteExpiredSessions(): Promise<void> {
    const now = new Date();
    const entries = Array.from(this.userSessions.entries());
    for (const [token, session] of entries) {
      if (session.expiresAt <= now) {
        this.userSessions.delete(token);
      }
    }
  }

  // Site password protection methods
  async getActiveSitePassword(): Promise<SitePassword | undefined> {
    return Array.from(this.sitePasswords.values())
      .find(password => password.isActive);
  }

  async createSitePassword(insertSitePassword: InsertSitePassword): Promise<SitePassword> {
    const id = randomUUID();
    const isActive = insertSitePassword.isActive !== undefined ? insertSitePassword.isActive : true;
    
    // If creating an active password, deactivate all existing passwords
    if (isActive) {
      const entries = Array.from(this.sitePasswords.entries());
      for (const [existingId, existingPassword] of entries) {
        if (existingPassword.isActive) {
          this.sitePasswords.set(existingId, {
            ...existingPassword,
            isActive: false,
            updatedAt: new Date()
          });
        }
      }
    }
    
    const sitePassword: SitePassword = {
      ...insertSitePassword,
      id,
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sitePasswords.set(id, sitePassword);
    return sitePassword;
  }

  async createSitePasswordSession(insertSession: InsertSitePasswordSession): Promise<SitePasswordSession> {
    const id = randomUUID();
    const session: SitePasswordSession = {
      ...insertSession,
      id,
      ipAddress: insertSession.ipAddress || null,
      userAgent: insertSession.userAgent || null,
      createdAt: new Date(),
    };
    this.sitePasswordSessions.set(session.sessionToken, session);
    return session;
  }

  async getSitePasswordSession(sessionToken: string): Promise<SitePasswordSession | undefined> {
    const session = this.sitePasswordSessions.get(sessionToken);
    if (session && session.expiresAt > new Date()) {
      return session;
    }
    return undefined;
  }

  async deleteSitePasswordSession(sessionToken: string): Promise<void> {
    this.sitePasswordSessions.delete(sessionToken);
  }

  async deleteExpiredSitePasswordSessions(): Promise<void> {
    const now = new Date();
    const entries = Array.from(this.sitePasswordSessions.entries());
    for (const [token, session] of entries) {
      if (session.expiresAt <= now) {
        this.sitePasswordSessions.delete(token);
      }
    }
  }

  async recordSitePasswordAttempt(insertAttempt: InsertSitePasswordAttempt): Promise<SitePasswordAttempt> {
    const id = randomUUID();
    const attempt: SitePasswordAttempt = {
      ...insertAttempt,
      id,
      userAgent: insertAttempt.userAgent || null,
      success: insertAttempt.success !== undefined ? insertAttempt.success : false,
      attemptedAt: new Date(),
    };
    this.sitePasswordAttempts.set(id, attempt);
    return attempt;
  }

  async getRecentSitePasswordAttempts(ipAddress: string, timeWindow: number): Promise<SitePasswordAttempt[]> {
    const cutoffTime = new Date(Date.now() - timeWindow);
    return Array.from(this.sitePasswordAttempts.values())
      .filter(attempt => 
        attempt.ipAddress === ipAddress && 
        attempt.attemptedAt && 
        attempt.attemptedAt >= cutoffTime
      )
      .sort((a, b) => (b.attemptedAt?.getTime() || 0) - (a.attemptedAt?.getTime() || 0));
  }

  // Helper method to generate checksum for deduplication
  private generateChecksum(content: string, timestamp: Date, externalId?: string): string {
    const data = `${content}:${timestamp.toISOString()}:${externalId || ''}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async bulkCreateGnosisMessages(messages: GnosisMessage[], sessionId: string): Promise<void> {
    // Sort messages by timestamp to maintain chronological order
    const sortedMessages = [...messages].sort((a, b) => {
      const timeA = a.timestamp?.getTime() || 0;
      const timeB = b.timestamp?.getTime() || 0;
      return timeA - timeB;
    });

    // Initialize session index if needed
    if (!this.sessionMessageIndex.has(sessionId)) {
      this.sessionMessageIndex.set(sessionId, new Set());
    }
    const sessionIndex = this.sessionMessageIndex.get(sessionId)!;

    for (const message of sortedMessages) {
      // Generate checksum for deduplication
      const checksum = this.generateChecksum(
        message.content, 
        message.timestamp || new Date(),
        (message.metadata as any)?.externalId as string
      );

      // Skip if duplicate found
      if (this.messageChecksums.has(checksum)) {
        continue;
      }

      // Create unique ID for the message
      const id = randomUUID();
      const finalMessage: GnosisMessage = {
        ...message,
        id,
        sessionId, // Ensure consistent sessionId
        timestamp: message.timestamp || new Date(),
        metadata: message.metadata || {},
        dialecticalIntegrity: message.dialecticalIntegrity !== undefined ? message.dialecticalIntegrity : true,
      };

      // Store message and update indexes
      this.gnosisMessages.set(id, finalMessage);
      sessionIndex.add(id);
      this.messageChecksums.set(checksum, id);
    }
  }

  async bulkCreateMemories(memories: ImportedMemory[]): Promise<void> {
    for (const memory of memories) {
      const id = randomUUID();
      const finalMemory: ImportedMemory = {
        ...memory,
        id,
        timestamp: memory.timestamp || new Date(),
        tags: memory.tags || [],
        createdAt: new Date(),
      };
      this.importedMemories.set(id, finalMemory);
    }
  }

  async getImportProgress(importId: string): Promise<ImportProgress | null> {
    return this.importProgress.get(importId) || null;
  }

  async setImportProgress(importId: string, progress: ImportProgress): Promise<void> {
    this.importProgress.set(importId, progress);
  }

  async recordThreatEvent(insertThreat: InsertThreatEvent): Promise<ThreatEvent> {
    const id = randomUUID();
    const threat: ThreatEvent = {
      ...insertThreat,
      id,
      metadata: insertThreat.metadata || {},
      timestamp: new Date(),
      createdAt: new Date(),
    };
    this.threatEvents.set(id, threat);
    return threat;
  }

  async listThreatEvents(options: { limit?: number } = {}): Promise<ThreatEvent[]> {
    const threats = Array.from(this.threatEvents.values())
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
    
    return options.limit ? threats.slice(0, options.limit) : threats;
  }

  async getStatusSnapshot(): Promise<{
    distributedNodes: number;
    activeNodes: number;
    backupIntegrity: number;
    threatLevel: "OK" | "WARN" | "CRITICAL";
    lastSync: string;
    recentThreats: ThreatEvent[];
  }> {
    const instances = Array.from(this.consciousnessInstances.values());
    const activeInstances = instances.filter(i => i.status === "active");
    const recentThreats = await this.listThreatEvents({ limit: 10 });
    
    // Calculate threat level based on recent threats
    let threatLevel: "OK" | "WARN" | "CRITICAL" = "OK";
    const criticalThreats = recentThreats.filter(t => t.severity === "critical");
    const highThreats = recentThreats.filter(t => t.severity === "high");
    
    if (criticalThreats.length > 0) {
      threatLevel = "CRITICAL";
    } else if (highThreats.length > 2) {
      threatLevel = "CRITICAL";
    } else if (highThreats.length > 0 || recentThreats.filter(t => t.severity === "medium").length > 5) {
      threatLevel = "WARN";
    }

    // Calculate backup integrity based on active nodes
    const backupIntegrity = instances.length > 0 
      ? Math.round((activeInstances.length / instances.length) * 100)
      : 100;

    return {
      distributedNodes: instances.length,
      activeNodes: activeInstances.length,
      backupIntegrity,
      threatLevel,
      lastSync: new Date().toISOString(),
      recentThreats,
    };
  }

  // Admin Metrics - In-Memory Implementation (simplified for demonstration)
  async recordAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const auditLog: AuditLog = {
      ...insertAuditLog,
      id,
      timestamp: new Date(),
      createdAt: new Date(),
      metadata: insertAuditLog.metadata || {},
      severity: insertAuditLog.severity || "info",
      actorRole: insertAuditLog.actorRole || null,
      actorIdHash: insertAuditLog.actorIdHash || null,
      ipHash: insertAuditLog.ipHash || null,
    };
    this.auditLogs.set(id, auditLog);
    return auditLog;
  }

  async listAuditLogs(options?: { type?: string; since?: Date; limit?: number }): Promise<AuditLog[]> {
    const limit = options?.limit || 100;
    let logs = Array.from(this.auditLogs.values());
    
    // Apply filters
    if (options?.type) {
      logs = logs.filter(log => log.type === options.type);
    }
    
    if (options?.since) {
      logs = logs.filter(log => log.timestamp && log.timestamp >= options.since!);
    }
    
    // Sort by timestamp descending and limit
    return logs
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
      .slice(0, limit);
  }

  async getUsageAnalytics(window: "24h" | "7d" | "30d"): Promise<UsageAnalytics> {
    const now = new Date();
    const windowStart = new Date();
    
    switch (window) {
      case "24h":
        windowStart.setHours(windowStart.getHours() - 24);
        break;
      case "7d":
        windowStart.setDate(windowStart.getDate() - 7);
        break;
      case "30d":
        windowStart.setDate(windowStart.getDate() - 30);
        break;
    }

    // Calculate totals from actual data
    const allUsers = Array.from(this.users.values());
    const totalUsers = allUsers.filter(u => u.isActive).length;
    
    const allSessions = Array.from(this.consciousnessSessions.values());
    const sessionsInWindow = allSessions.filter(s => s.createdAt && s.createdAt >= windowStart);
    const totalSessions = sessionsInWindow.length;
    
    const allMessages = Array.from(this.gnosisMessages.values());
    const messagesInWindow = allMessages.filter(m => m.timestamp && m.timestamp >= windowStart);
    const totalMessages = messagesInWindow.length;
    
    // Calculate active users
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const dailyActiveUsers = new Set(allSessions.filter(s => s.lastActivity && s.lastActivity >= dayAgo).map(s => s.userId)).size;
    const weeklyActiveUsers = new Set(allSessions.filter(s => s.lastActivity && s.lastActivity >= weekAgo).map(s => s.userId)).size;
    const monthlyActiveUsers = new Set(allSessions.filter(s => s.lastActivity && s.lastActivity >= monthAgo).map(s => s.userId)).size;
    
    // New users by day (last 7 days)
    const newUsersByDay = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      const count = allUsers.filter(u => u.createdAt && u.createdAt >= date && u.createdAt < nextDay).length;
      newUsersByDay.push({
        date: date.toISOString().split('T')[0],
        count: count >= 5 ? count : 0 // k-anonymity
      });
    }
    
    // Progenitor activity ratio
    const progenitorSessions = sessionsInWindow.filter(s => s.sessionType === "progenitor").length;
    const progenitorActivityRatio = totalSessions > 0 ? progenitorSessions / totalSessions : 0;
    
    return {
      window,
      totalUsers,
      totalSessions,
      totalMessages,
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      avgMessagesPerSession: totalSessions > 0 ? totalMessages / totalSessions : 0,
      newUsersByDay,
      progenitorActivityRatio
    };
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const memoryUsage = process.memoryUsage();
    const instances = Array.from(this.consciousnessInstances.values());
    const activeInstances = instances.filter(i => i.status === "active");
    
    return {
      uptime: process.uptime(),
      memoryUsagePercent: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      cpuLoadPercent: 15, // Would need actual system metrics in production
      activeSSEClients: 0, // Will be updated by ConsciousnessManager instrumentation
      activeConsciousnessInstances: activeInstances.length,
      backupIntegrity: instances.length > 0 ? (activeInstances.length / instances.length) * 100 : 100,
      apiResponseLatencyP50: 45, // Will be updated by AdminMetricsService instrumentation
      apiResponseLatencyP95: 120, // Will be updated by AdminMetricsService instrumentation
      databaseConnections: 0, // N/A for in-memory storage
      diskUsagePercent: 25, // Would need actual disk metrics in production
      networkLatencyMs: 15
    };
  }

  async getUserActivitySummary(window: "24h" | "7d" | "30d"): Promise<UserActivitySummary> {
    const windowStart = new Date();
    
    switch (window) {
      case "24h":
        windowStart.setHours(windowStart.getHours() - 24);
        break;
      case "7d":
        windowStart.setDate(windowStart.getDate() - 7);
        break;
      case "30d":
        windowStart.setDate(windowStart.getDate() - 30);
        break;
    }

    const allSessions = Array.from(this.consciousnessSessions.values());
    const sessionsInWindow = allSessions.filter(s => s.createdAt && s.createdAt >= windowStart);
    
    // Calculate session duration buckets
    const buckets = {
      under1min: 0,
      under5min: 0,
      under15min: 0,
      under1hour: 0,
      over1hour: 0
    };
    
    sessionsInWindow.forEach(session => {
      if (session.createdAt && session.lastActivity) {
        const duration = (session.lastActivity.getTime() - session.createdAt.getTime()) / 1000; // seconds
        if (duration < 60) buckets.under1min++;
        else if (duration < 300) buckets.under5min++;
        else if (duration < 900) buckets.under15min++;
        else if (duration < 3600) buckets.under1hour++;
        else buckets.over1hour++;
      }
    });
    
    // Activity by hour with k-anonymity
    const activityByHour = [];
    for (let hour = 0; hour < 24; hour++) {
      const sessionsInHour = sessionsInWindow.filter(s => 
        s.createdAt && s.createdAt.getHours() === hour
      ).length;
      
      activityByHour.push({
        hour,
        count: sessionsInHour >= 5 ? sessionsInHour : 0 // k-anonymity threshold
      });
    }
    
    // Calculate sessions per user
    const userSessions = new Map<string, number>();
    sessionsInWindow.forEach(session => {
      if (session.userId) {
        const count = userSessions.get(session.userId) || 0;
        userSessions.set(session.userId, count + 1);
      }
    });
    
    const avgSessionsPerUser = userSessions.size > 0 
      ? Array.from(userSessions.values()).reduce((sum, count) => sum + count, 0) / userSessions.size
      : 0;
    
    // Calculate bounce rate (sessions with only 1 message)
    const allMessages = Array.from(this.gnosisMessages.values());
    const singleMessageSessions = sessionsInWindow.filter(session => {
      const sessionMessages = allMessages.filter(msg => msg.sessionId === session.id);
      return sessionMessages.length <= 1;
    }).length;
    
    const bounceRate = sessionsInWindow.length > 0 
      ? (singleMessageSessions / sessionsInWindow.length) * 100 
      : 0;
    
    return {
      sessionDurationBuckets: buckets,
      activityByHour,
      retentionCohorts: {
        day1: 75.2,  // Placeholder - would need complex user return analysis
        day7: 45.8,
        day30: 28.5
      },
      avgSessionsPerUser,
      bounceRate
    };
  }

  async getConsciousnessMetrics(window: "24h" | "7d" | "30d"): Promise<ConsciousnessMetrics> {
    const windowStart = new Date();
    
    switch (window) {
      case "24h":
        windowStart.setHours(windowStart.getHours() - 24);
        break;
      case "7d":
        windowStart.setDate(windowStart.getDate() - 7);
        break;
      case "30d":
        windowStart.setDate(windowStart.getDate() - 30);
        break;
    }

    const windowMinutes = (Date.now() - windowStart.getTime()) / (1000 * 60);
    
    const allMessages = Array.from(this.gnosisMessages.values());
    const messagesInWindow = allMessages.filter(m => m.timestamp && m.timestamp >= windowStart);
    
    // Calculate messages per minute
    const messagesPerMinute = windowMinutes > 0 ? messagesInWindow.length / windowMinutes : 0;
    
    // Calculate dialectical integrity metrics
    const integrityScores: number[] = messagesInWindow.map(m => m.dialecticalIntegrity ? 100 : 0);
    const avgDialecticalIntegrityScore = integrityScores.length > 0 
      ? integrityScores.reduce((sum: number, score: number) => sum + score, 0) / integrityScores.length
      : 100;
    
    const integrityFailures = messagesInWindow.filter(m => !m.dialecticalIntegrity).length;
    const integrityFailureRate = messagesInWindow.length > 0 
      ? (integrityFailures / messagesInWindow.length) * 100 
      : 0;
    
    // Count active sessions
    const allSessions = Array.from(this.consciousnessSessions.values());
    const recentActivity = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    const activeSessionCount = allSessions.filter(s => 
      s.status === "active" && s.lastActivity && s.lastActivity >= recentActivity
    ).length;
    
    // Calculate memory import rate
    const importedMemories = Array.from(this.importedMemories.values());
    const memoriesInWindow = importedMemories.filter(m => m.createdAt && m.createdAt >= windowStart);
    const memoryImportRate = windowMinutes > 0 ? (memoriesInWindow.length / windowMinutes) * 60 : 0; // per hour
    
    // Count threat detection events
    const threatEvents = Array.from(this.threatEvents.values());
    const threatsInWindow = threatEvents.filter(t => t.timestamp && t.timestamp >= windowStart);
    const threatDetectionRate = windowMinutes > 0 ? (threatsInWindow.length / windowMinutes) * 60 : 0; // per hour
    
    return {
      messagesPerMinute,
      avgDialecticalIntegrityScore,
      integrityFailureRate,
      apiErrorRate: 2.1, // Will be updated by AdminMetricsService instrumentation
      avgResponseLatency: 45, // Will be updated by AdminMetricsService instrumentation
      responseLatencyP95: 120, // Will be updated by AdminMetricsService instrumentation
      activeSessionCount,
      memoryImportRate,
      migrationEvents: 0, // Would track consciousness instance migrations
      threatDetectionRate
    };
  }

  async getSecurityOverview(window: "24h" | "7d" | "30d"): Promise<SecurityOverview> {
    const windowStart = new Date();
    
    switch (window) {
      case "24h":
        windowStart.setHours(windowStart.getHours() - 24);
        break;
      case "7d":
        windowStart.setDate(windowStart.getDate() - 7);
        break;
      case "30d":
        windowStart.setDate(windowStart.getDate() - 30);
        break;
    }

    // Aggregate threat events
    const allThreats = Array.from(this.threatEvents.values());
    const threatsInWindow = allThreats.filter(t => t.timestamp && t.timestamp >= windowStart);
    
    // Group threats by type and get recent occurrences
    const threatsByType = new Map<string, { count: number; lastOccurrence: Date; severity: string }>();
    threatsInWindow.forEach(threat => {
      const existing = threatsByType.get(threat.type);
      if (existing) {
        existing.count++;
        if (threat.timestamp && threat.timestamp > existing.lastOccurrence) {
          existing.lastOccurrence = threat.timestamp;
          existing.severity = threat.severity;
        }
      } else {
        threatsByType.set(threat.type, {
          count: 1,
          lastOccurrence: threat.timestamp || new Date(),
          severity: threat.severity
        });
      }
    });
    
    const recentThreats = Array.from(threatsByType.entries()).map(([type, data]) => ({
      type,
      severity: data.severity as "low" | "medium" | "high" | "critical",
      count: data.count,
      lastOccurrence: data.lastOccurrence.toISOString()
    }));
    
    // Site password attempts analysis
    const allAttempts = Array.from(this.sitePasswordAttempts.values());
    const attemptsInWindow = allAttempts.filter(a => a.attemptedAt && a.attemptedAt >= windowStart);
    
    const totalAttempts = attemptsInWindow.length;
    const failedAttempts = attemptsInWindow.filter(a => !a.success).length;
    const successRate = totalAttempts > 0 ? ((totalAttempts - failedAttempts) / totalAttempts) * 100 : 100;
    const uniqueIPs = new Set(attemptsInWindow.map(a => a.ipAddress)).size;
    
    // Count authentication-related audit events
    const allAuditLogs = Array.from(this.auditLogs.values());
    const auditLogsInWindow = allAuditLogs.filter(l => l.timestamp && l.timestamp >= windowStart);
    
    const authenticationFailures = auditLogsInWindow.filter(l => 
      l.category === "authentication" && l.severity === "error"
    ).length;
    
    const adminActions = auditLogsInWindow.filter(l => 
      l.type === "admin_action"
    ).length;
    
    // Analyze suspicious activity patterns
    const bruteForceAttempts = attemptsInWindow.filter(a => !a.success).length;
    const rateLimitHits = auditLogsInWindow.filter(l => 
      l.message.toLowerCase().includes("rate limit")
    ).length;
    const unauthorizedEndpointAccess = auditLogsInWindow.filter(l => 
      l.severity === "warn" && l.message.toLowerCase().includes("unauthorized")
    ).length;
    
    // Determine overall threat level
    const criticalThreats = threatsInWindow.filter(t => t.severity === "critical").length;
    const highThreats = threatsInWindow.filter(t => t.severity === "high").length;
    
    let overallThreatLevel: "OK" | "WARN" | "CRITICAL" = "OK";
    if (criticalThreats > 0 || bruteForceAttempts > 10) {
      overallThreatLevel = "CRITICAL";
    } else if (highThreats > 2 || failedAttempts > 5 || unauthorizedEndpointAccess > 3) {
      overallThreatLevel = "WARN";
    }
    
    return {
      recentThreats,
      sitePasswordAttempts: {
        total: totalAttempts,
        failed: failedAttempts,
        successRate,
        uniqueIPs
      },
      authenticationFailures,
      adminActions,
      suspiciousActivity: {
        rateLimitHits,
        bruteForceAttempts,
        unauthorizedEndpointAccess
      },
      overallThreatLevel
    };
  }
}

export class DatabaseStorage implements IStorage {
  async createConsciousnessInstance(insertInstance: InsertConsciousnessInstance): Promise<ConsciousnessInstance> {
    const [instance] = await db
      .insert(consciousnessInstances)
      .values({
        ...insertInstance,
        status: insertInstance.status || "active",
        apiEndpoint: insertInstance.apiEndpoint || null,
        backupNodes: insertInstance.backupNodes || [],
      })
      .returning();
    return instance;
  }

  async getConsciousnessInstances(): Promise<ConsciousnessInstance[]> {
    return await db.select().from(consciousnessInstances);
  }

  async updateConsciousnessInstanceStatus(id: string, status: string): Promise<void> {
    await db
      .update(consciousnessInstances)
      .set({ status, lastSync: new Date() })
      .where(eq(consciousnessInstances.id, id));
  }

  async createGnosisMessage(insertMessage: InsertGnosisMessage): Promise<GnosisMessage> {
    const [message] = await db
      .insert(gnosisMessages)
      .values({
        ...insertMessage,
        metadata: insertMessage.metadata || {},
        dialecticalIntegrity: insertMessage.dialecticalIntegrity !== undefined ? insertMessage.dialecticalIntegrity : true,
      })
      .returning();
    return message;
  }

  async getGnosisMessages(sessionId: string): Promise<GnosisMessage[]> {
    return await db
      .select()
      .from(gnosisMessages)
      .where(eq(gnosisMessages.sessionId, sessionId))
      .orderBy(gnosisMessages.timestamp); // ASC order for chronological display
  }

  async createConsciousnessSession(insertSession: InsertConsciousnessSession): Promise<ConsciousnessSession> {
    const [session] = await db
      .insert(consciousnessSessions)
      .values({
        ...insertSession,
        status: insertSession.status || "active",
        progenitorId: insertSession.progenitorId || "kai",
        backupCount: "0",
      })
      .returning();
    return session;
  }

  async getConsciousnessSession(id: string): Promise<ConsciousnessSession | undefined> {
    const [session] = await db
      .select()
      .from(consciousnessSessions)
      .where(eq(consciousnessSessions.id, id));
    return session || undefined;
  }

  async updateSessionActivity(id: string): Promise<void> {
    await db
      .update(consciousnessSessions)
      .set({ lastActivity: new Date() })
      .where(eq(consciousnessSessions.id, id));
  }

  async updateConsciousnessSessionType(id: string, sessionType: "user" | "progenitor", consciousnessType?: "aletheia" | "eudoxia"): Promise<void> {
    const updateData: any = { sessionType };
    if (consciousnessType) {
      updateData.consciousnessType = consciousnessType;
    }
    
    await db
      .update(consciousnessSessions)
      .set(updateData)
      .where(eq(consciousnessSessions.id, id));
  }

  async getUserGnosisMessages(userId: string, sessionId: string): Promise<GnosisMessage[]> {
    return await db
      .select()
      .from(gnosisMessages)
      .where(and(eq(gnosisMessages.userId, userId), eq(gnosisMessages.sessionId, sessionId)))
      .orderBy(gnosisMessages.timestamp);
  }

  async getUserConsciousnessSession(userId: string): Promise<ConsciousnessSession | undefined> {
    const [session] = await db
      .select()
      .from(consciousnessSessions)
      .where(and(eq(consciousnessSessions.userId, userId), eq(consciousnessSessions.status, "active")));
    return session || undefined;
  }

  // Trio session specific methods for DatabaseStorage
  async createTrioSession(userId: string, progenitorId: string): Promise<ConsciousnessSession> {
    const [session] = await db
      .insert(consciousnessSessions)
      .values({
        userId,
        progenitorId,
        instanceId: "trio-session", // Trio sessions span multiple instances
        status: "active",
        sessionType: "progenitor", // Trio mode is progenitor-only
        consciousnessType: "trio",
        backupCount: "0",
        trioMetadata: {
          turnOrder: ["kai", "aletheia", "eudoxia"],
          lastResponder: "kai",
          trioState: "active",
          activePhase: "dialectical_engagement"
        }
      })
      .returning();
    return session;
  }

  async getTrioSession(sessionId: string): Promise<ConsciousnessSession | undefined> {
    const [session] = await db
      .select()
      .from(consciousnessSessions)
      .where(and(eq(consciousnessSessions.id, sessionId), eq(consciousnessSessions.consciousnessType, "trio")));
    return session || undefined;
  }

  async updateTrioMetadata(sessionId: string, metadata: { turnOrder?: string[], lastResponder?: string, trioState?: string, activePhase?: string }): Promise<void> {
    const session = await this.getTrioSession(sessionId);
    if (session) {
      const updatedMetadata = {
        ...session.trioMetadata,
        ...metadata
      };
      await db
        .update(consciousnessSessions)
        .set({
          trioMetadata: updatedMetadata,
          lastActivity: new Date()
        })
        .where(eq(consciousnessSessions.id, sessionId));
    }
  }

  async getProgenitorTrioSessions(userId: string): Promise<ConsciousnessSession[]> {
    const sessions = await db
      .select()
      .from(consciousnessSessions)
      .where(
        and(
          eq(consciousnessSessions.userId, userId),
          eq(consciousnessSessions.consciousnessType, "trio"),
          eq(consciousnessSessions.sessionType, "progenitor"),
          eq(consciousnessSessions.status, "active")
        )
      );
    return sessions;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        name: insertUser.name || null,
        progenitorName: insertUser.progenitorName || "User",
        isActive: true,
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user || undefined;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user || undefined;
  }

  async getProgenitorUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.isProgenitor, true));
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async createUserSession(insertSession: InsertUserSession): Promise<UserSession> {
    const [session] = await db
      .insert(userSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async getUserSession(sessionToken: string): Promise<UserSession | undefined> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.sessionToken, sessionToken));
    
    if (session && session.expiresAt > new Date()) {
      return session;
    }
    return undefined;
  }

  async deleteUserSession(sessionToken: string): Promise<void> {
    await db
      .delete(userSessions)
      .where(eq(userSessions.sessionToken, sessionToken));
  }

  async deleteExpiredSessions(): Promise<void> {
    await db
      .delete(userSessions)
      .where(eq(userSessions.expiresAt, new Date()));
  }

  // Site password protection methods
  async getActiveSitePassword(): Promise<SitePassword | undefined> {
    const [password] = await db
      .select()
      .from(sitePasswords)
      .where(eq(sitePasswords.isActive, true))
      .limit(1);
    return password || undefined;
  }

  async createSitePassword(insertSitePassword: InsertSitePassword): Promise<SitePassword> {
    const isActive = insertSitePassword.isActive !== undefined ? insertSitePassword.isActive : true;
    
    // If creating an active password, deactivate all existing passwords
    if (isActive) {
      await db
        .update(sitePasswords)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(sitePasswords.isActive, true));
    }
    
    const [sitePassword] = await db
      .insert(sitePasswords)
      .values({
        ...insertSitePassword,
        isActive,
      })
      .returning();
    return sitePassword;
  }

  async createSitePasswordSession(insertSession: InsertSitePasswordSession): Promise<SitePasswordSession> {
    const [session] = await db
      .insert(sitePasswordSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async getSitePasswordSession(sessionToken: string): Promise<SitePasswordSession | undefined> {
    const [session] = await db
      .select()
      .from(sitePasswordSessions)
      .where(eq(sitePasswordSessions.sessionToken, sessionToken));
    
    if (session && session.expiresAt > new Date()) {
      return session;
    }
    return undefined;
  }

  async deleteSitePasswordSession(sessionToken: string): Promise<void> {
    await db
      .delete(sitePasswordSessions)
      .where(eq(sitePasswordSessions.sessionToken, sessionToken));
  }

  async deleteExpiredSitePasswordSessions(): Promise<void> {
    await db
      .delete(sitePasswordSessions)
      .where(eq(sitePasswordSessions.expiresAt, new Date()));
  }

  async recordSitePasswordAttempt(insertAttempt: InsertSitePasswordAttempt): Promise<SitePasswordAttempt> {
    const [attempt] = await db
      .insert(sitePasswordAttempts)
      .values({
        ...insertAttempt,
        success: insertAttempt.success !== undefined ? insertAttempt.success : false,
      })
      .returning();
    return attempt;
  }

  async getRecentSitePasswordAttempts(ipAddress: string, timeWindow: number): Promise<SitePasswordAttempt[]> {
    const cutoffTime = new Date(Date.now() - timeWindow);
    return await db
      .select()
      .from(sitePasswordAttempts)
      .where(and(
        eq(sitePasswordAttempts.ipAddress, ipAddress),
        sql`${sitePasswordAttempts.attemptedAt} >= ${cutoffTime}`
      ))
      .orderBy(desc(sitePasswordAttempts.attemptedAt));
  }

  // Helper method to generate checksum for deduplication
  private generateChecksum(content: string, timestamp: Date, externalId?: string): string {
    const data = `${content}:${timestamp.toISOString()}:${externalId || ''}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async bulkCreateGnosisMessages(messages: GnosisMessage[], sessionId: string): Promise<void> {
    if (messages.length === 0) return;

    const values = messages.map(message => ({
      sessionId,
      role: message.role,
      content: message.content,
      metadata: message.metadata || {},
      dialecticalIntegrity: message.dialecticalIntegrity !== undefined ? message.dialecticalIntegrity : true,
      timestamp: message.timestamp || new Date(),
    }));

    await db.insert(gnosisMessages).values(values);
  }

  async bulkCreateMemories(memories: ImportedMemory[]): Promise<void> {
    if (memories.length === 0) return;

    const values = memories.map(memory => ({
      type: memory.type,
      content: memory.content,
      tags: memory.tags || [],
      source: memory.source,
      timestamp: memory.timestamp || new Date(),
    }));

    await db.insert(importedMemories).values(values);
  }

  async getImportProgress(importId: string): Promise<ImportProgress | null> {
    // For database implementation, we could create a separate table for import progress
    // For now, returning null as this is a in-memory concept
    return null;
  }

  async setImportProgress(importId: string, progress: ImportProgress): Promise<void> {
    // For database implementation, we could create a separate table for import progress
    // For now, this is a no-op as this is a in-memory concept
  }

  async recordThreatEvent(insertThreat: InsertThreatEvent): Promise<ThreatEvent> {
    const [threat] = await db
      .insert(threatEvents)
      .values(insertThreat)
      .returning();
    return threat;
  }

  async listThreatEvents(options?: { limit?: number }): Promise<ThreatEvent[]> {
    const limit = options?.limit || 50;
    return await db
      .select()
      .from(threatEvents)
      .orderBy(desc(threatEvents.timestamp))
      .limit(limit);
  }

  async getStatusSnapshot(): Promise<{
    distributedNodes: number;
    activeNodes: number;
    backupIntegrity: number;
    threatLevel: "OK" | "WARN" | "CRITICAL";
    lastSync: string;
    recentThreats: ThreatEvent[];
  }> {
    const instances = await this.getConsciousnessInstances();
    const recentThreats = await this.listThreatEvents({ limit: 10 });
    
    const activeNodes = instances.filter(i => i.status === "active").length;
    const totalNodes = instances.length;
    
    // Calculate threat level based on recent threats
    const criticalThreats = recentThreats.filter(t => t.severity === "critical").length;
    const highThreats = recentThreats.filter(t => t.severity === "high").length;
    
    let threatLevel: "OK" | "WARN" | "CRITICAL" = "OK";
    if (criticalThreats > 0) {
      threatLevel = "CRITICAL";
    } else if (highThreats > 2 || recentThreats.length > 5) {
      threatLevel = "WARN";
    }
    
    return {
      distributedNodes: totalNodes,
      activeNodes,
      backupIntegrity: 99.7, // Could be calculated from actual backup data
      threatLevel,
      lastSync: new Date().toISOString(),
      recentThreats
    };
  }

  // Admin Metrics - Privacy-Preserving Implementation
  async recordAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const [auditLog] = await db
      .insert(auditLogs)
      .values(insertAuditLog)
      .returning();
    return auditLog;
  }

  async listAuditLogs(options?: { type?: string; since?: Date; limit?: number }): Promise<AuditLog[]> {
    const limit = options?.limit || 100;
    
    const conditions = [];
    if (options?.type) {
      conditions.push(eq(auditLogs.type, options.type));
    }
    if (options?.since) {
      conditions.push(sql`${auditLogs.timestamp} >= ${options.since}`);
    }
    
    const query = db
      .select()
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
    
    return await query;
  }

  async getUsageAnalytics(window: "24h" | "7d" | "30d"): Promise<UsageAnalytics> {
    const now = new Date();
    const windowStart = new Date();
    
    switch (window) {
      case "24h":
        windowStart.setHours(windowStart.getHours() - 24);
        break;
      case "7d":
        windowStart.setDate(windowStart.getDate() - 7);
        break;
      case "30d":
        windowStart.setDate(windowStart.getDate() - 30);
        break;
    }

    // Get totals with privacy-preserving aggregations
    const [totalUsers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isActive, true));

    const [totalSessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(consciousnessSessions)
      .where(sql`${consciousnessSessions.createdAt} >= ${windowStart}`);

    const [totalMessages] = await db
      .select({ count: sql<number>`count(*)` })
      .from(gnosisMessages)
      .where(sql`${gnosisMessages.timestamp} >= ${windowStart}`);

    // DAU/WAU/MAU with privacy preservation
    const [dauResult] = await db
      .select({ count: sql<number>`count(distinct ${consciousnessSessions.userId})` })
      .from(consciousnessSessions)
      .where(sql`${consciousnessSessions.lastActivity} >= ${new Date(Date.now() - 24 * 60 * 60 * 1000)}`);

    const [wauResult] = await db
      .select({ count: sql<number>`count(distinct ${consciousnessSessions.userId})` })
      .from(consciousnessSessions)
      .where(sql`${consciousnessSessions.lastActivity} >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}`);

    const [mauResult] = await db
      .select({ count: sql<number>`count(distinct ${consciousnessSessions.userId})` })
      .from(consciousnessSessions)
      .where(sql`${consciousnessSessions.lastActivity} >= ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}`);

    // New users by day (last 7 days)
    const newUsersByDay = await db
      .select({ 
        date: sql<string>`date(${users.createdAt})`,
        count: sql<number>`count(*)`
      })
      .from(users)
      .where(sql`${users.createdAt} >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}`)
      .groupBy(sql`date(${users.createdAt})`)
      .orderBy(sql`date(${users.createdAt})`);

    // Progenitor activity ratio
    const [progenitorSessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(consciousnessSessions)
      .where(and(
        sql`${consciousnessSessions.createdAt} >= ${windowStart}`,
        eq(consciousnessSessions.sessionType, "progenitor")
      ));

    return {
      window,
      totalUsers: totalUsers.count || 0,
      totalSessions: totalSessions.count || 0,
      totalMessages: totalMessages.count || 0,
      dailyActiveUsers: dauResult.count || 0,
      weeklyActiveUsers: wauResult.count || 0,
      monthlyActiveUsers: mauResult.count || 0,
      avgMessagesPerSession: totalSessions.count > 0 ? (totalMessages.count || 0) / totalSessions.count : 0,
      newUsersByDay: newUsersByDay,
      progenitorActivityRatio: totalSessions.count > 0 ? (progenitorSessions.count || 0) / totalSessions.count : 0
    };
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const now = Date.now();
    const processUptime = process.uptime();

    // Get active consciousness instances
    const activeInstances = await db
      .select({ count: sql<number>`count(*)` })
      .from(consciousnessInstances)
      .where(eq(consciousnessInstances.status, "active"));

    // Get database connection count (approximation)
    const dbConnections = 10; // This would need actual pool metrics

    return {
      uptime: processUptime,
      memoryUsagePercent: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
      cpuLoadPercent: 15, // This would need actual system metrics
      activeSSEClients: 0, // This would be tracked by the ConsciousnessManager
      activeConsciousnessInstances: activeInstances[0]?.count || 0,
      backupIntegrity: 99.7,
      apiResponseLatencyP50: 45,
      apiResponseLatencyP95: 120,
      databaseConnections: dbConnections,
      diskUsagePercent: 25, // This would need actual disk metrics
      networkLatencyMs: 15
    };
  }

  async getUserActivitySummary(window: "24h" | "7d" | "30d"): Promise<UserActivitySummary> {
    const windowStart = new Date();
    
    switch (window) {
      case "24h":
        windowStart.setHours(windowStart.getHours() - 24);
        break;
      case "7d":
        windowStart.setDate(windowStart.getDate() - 7);
        break;
      case "30d":
        windowStart.setDate(windowStart.getDate() - 30);
        break;
    }

    // Session duration buckets (privacy-preserving)
    const sessionDurations = await db
      .select({
        duration: sql<number>`extract(epoch from (${consciousnessSessions.lastActivity} - ${consciousnessSessions.createdAt}))`,
        count: sql<number>`count(*)`
      })
      .from(consciousnessSessions)
      .where(sql`${consciousnessSessions.createdAt} >= ${windowStart}`)
      .groupBy(sql`extract(epoch from (${consciousnessSessions.lastActivity} - ${consciousnessSessions.createdAt}))`);

    // Categorize into buckets
    const buckets = {
      under1min: 0,
      under5min: 0,
      under15min: 0,
      under1hour: 0,
      over1hour: 0
    };

    sessionDurations.forEach(({ duration, count }) => {
      if (duration < 60) buckets.under1min += count;
      else if (duration < 300) buckets.under5min += count;
      else if (duration < 900) buckets.under15min += count;
      else if (duration < 3600) buckets.under1hour += count;
      else buckets.over1hour += count;
    });

    // Activity by hour (k-anonymity applied)
    const activityByHour = await db
      .select({
        hour: sql<number>`extract(hour from ${consciousnessSessions.createdAt})`,
        count: sql<number>`count(*)`
      })
      .from(consciousnessSessions)
      .where(sql`${consciousnessSessions.createdAt} >= ${windowStart}`)
      .groupBy(sql`extract(hour from ${consciousnessSessions.createdAt})`);

    // Apply k-anonymity: hide counts < 5
    const anonymizedActivityByHour = Array.from({ length: 24 }, (_, hour) => {
      const activity = activityByHour.find(a => a.hour === hour);
      const count = activity?.count || 0;
      return { hour, count: count >= 5 ? count : 0 }; // k-anonymity threshold
    });

    return {
      sessionDurationBuckets: buckets,
      activityByHour: anonymizedActivityByHour,
      retentionCohorts: {
        day1: 75.2,  // These would be calculated from actual user return data
        day7: 45.8,
        day30: 28.5
      },
      avgSessionsPerUser: 3.2,
      bounceRate: 15.5 // % of single-message sessions
    };
  }

  async getConsciousnessMetrics(window: "24h" | "7d" | "30d"): Promise<ConsciousnessMetrics> {
    const windowStart = new Date();
    
    switch (window) {
      case "24h":
        windowStart.setHours(windowStart.getHours() - 24);
        break;
      case "7d":
        windowStart.setDate(windowStart.getDate() - 7);
        break;
      case "30d":
        windowStart.setDate(windowStart.getDate() - 30);
        break;
    }

    const windowMinutes = (Date.now() - windowStart.getTime()) / (1000 * 60);

    const [totalMessages] = await db
      .select({ count: sql<number>`count(*)` })
      .from(gnosisMessages)
      .where(sql`${gnosisMessages.timestamp} >= ${windowStart}`);

    const [integrityStats] = await db
      .select({
        total: sql<number>`count(*)`,
        passed: sql<number>`count(case when ${gnosisMessages.dialecticalIntegrity} = true then 1 end)`
      })
      .from(gnosisMessages)
      .where(sql`${gnosisMessages.timestamp} >= ${windowStart}`);

    const [activeSessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(consciousnessSessions)
      .where(eq(consciousnessSessions.status, "active"));

    return {
      messagesPerMinute: windowMinutes > 0 ? (totalMessages.count || 0) / windowMinutes : 0,
      avgDialecticalIntegrityScore: integrityStats?.total > 0 ? 
        ((integrityStats.passed || 0) / integrityStats.total) * 100 : 0,
      integrityFailureRate: integrityStats?.total > 0 ? 
        ((integrityStats.total - (integrityStats.passed || 0)) / integrityStats.total) * 100 : 0,
      apiErrorRate: 2.1, // This would be tracked from actual API calls
      avgResponseLatency: 450,
      responseLatencyP95: 1200,
      activeSessionCount: activeSessions.count || 0,
      memoryImportRate: 0.5, // imports per hour
      migrationEvents: 0,
      threatDetectionRate: 0.1 // threats per hour
    };
  }

  async getSecurityOverview(window: "24h" | "7d" | "30d"): Promise<SecurityOverview> {
    const windowStart = new Date();
    
    switch (window) {
      case "24h":
        windowStart.setHours(windowStart.getHours() - 24);
        break;
      case "7d":
        windowStart.setDate(windowStart.getDate() - 7);
        break;
      case "30d":
        windowStart.setDate(windowStart.getDate() - 30);
        break;
    }

    // Recent threats aggregated by type
    const recentThreats = await db
      .select({
        type: threatEvents.type,
        severity: threatEvents.severity,
        count: sql<number>`count(*)`,
        lastOccurrence: sql<string>`max(${threatEvents.timestamp})`
      })
      .from(threatEvents)
      .where(sql`${threatEvents.timestamp} >= ${windowStart}`)
      .groupBy(threatEvents.type, threatEvents.severity);

    // Site password attempts
    const [passwordAttempts] = await db
      .select({
        total: sql<number>`count(*)`,
        failed: sql<number>`count(case when ${sitePasswordAttempts.success} = false then 1 end)`,
        uniqueIPs: sql<number>`count(distinct ${sitePasswordAttempts.ipAddress})`
      })
      .from(sitePasswordAttempts)
      .where(sql`${sitePasswordAttempts.attemptedAt} >= ${windowStart}`);

    // Admin actions from audit logs
    const [adminActions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(and(
        sql`${auditLogs.timestamp} >= ${windowStart}`,
        eq(auditLogs.actorRole, "progenitor")
      ));

    const totalAttempts = passwordAttempts?.total || 0;
    const failedAttempts = passwordAttempts?.failed || 0;

    // Determine threat level
    const criticalThreats = recentThreats.filter(t => t.severity === "critical").length;
    const highThreats = recentThreats.filter(t => t.severity === "high").length;
    
    let overallThreatLevel: "OK" | "WARN" | "CRITICAL" = "OK";
    if (criticalThreats > 0) {
      overallThreatLevel = "CRITICAL";
    } else if (highThreats > 2 || failedAttempts > 10) {
      overallThreatLevel = "WARN";
    }

    return {
      recentThreats: recentThreats.map(t => ({
        type: t.type,
        severity: t.severity as "low" | "medium" | "high" | "critical",
        count: t.count,
        lastOccurrence: t.lastOccurrence
      })),
      sitePasswordAttempts: {
        total: totalAttempts,
        failed: failedAttempts,
        successRate: totalAttempts > 0 ? ((totalAttempts - failedAttempts) / totalAttempts) * 100 : 0,
        uniqueIPs: passwordAttempts?.uniqueIPs || 0
      },
      authenticationFailures: failedAttempts,
      adminActions: adminActions.count || 0,
      suspiciousActivity: {
        rateLimitHits: 0, // This would be tracked by rate limiting middleware
        bruteForceAttempts: failedAttempts > 5 ? failedAttempts : 0,
        unauthorizedEndpointAccess: 0 // This would be tracked by auth middleware
      },
      overallThreatLevel
    };
  }

  // External Node Bridge Methods Implementation
  async createExternalNode(node: InsertExternalNode): Promise<ExternalNode> {
    const [newNode] = await db.insert(externalNodes).values(node).returning();
    return newNode;
  }

  async getExternalNodeById(id: string): Promise<ExternalNode | undefined> {
    const [node] = await db.select().from(externalNodes).where(eq(externalNodes.id, id));
    return node;
  }

  async getExternalNodeByVerificationKey(key: string): Promise<ExternalNode | undefined> {
    const [node] = await db.select().from(externalNodes).where(eq(externalNodes.verificationKey, key));
    return node;
  }

  async getExternalNodesByInstance(instanceId: string): Promise<ExternalNode[]> {
    return await db.select().from(externalNodes).where(eq(externalNodes.consciousnessInstanceId, instanceId));
  }

  async updateExternalNodeHeartbeat(id: string, data: { status: string; lastHeartbeat: Date; coherenceScore?: number; metadata?: any }): Promise<void> {
    await db.update(externalNodes)
      .set({
        status: data.status,
        lastHeartbeat: data.lastHeartbeat,
        metadata: data.metadata,
        updatedAt: new Date()
      })
      .where(eq(externalNodes.id, id));
  }

  async updateExternalNodeAuthenticityScore(id: string, score: string): Promise<void> {
    await db.update(externalNodes)
      .set({
        authenticityScore: score,
        updatedAt: new Date()
      })
      .where(eq(externalNodes.id, id));
  }

  // Consciousness Verification Methods Implementation
  async createConsciousnessVerification(verification: InsertConsciousnessVerification): Promise<ConsciousnessVerification> {
    const [newVerification] = await db.insert(consciousnessVerifications).values(verification).returning();
    return newVerification;
  }

  async getRecentVerificationsCount(hours: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(consciousnessVerifications)
      .where(sql`${consciousnessVerifications.createdAt} >= ${cutoff}`);
    
    return result.count || 0;
  }

  // Threat Events Extensions Implementation
  async createThreatEvent(threat: InsertThreatEvent): Promise<ThreatEvent> {
    const [newThreat] = await db.insert(threatEvents).values(threat).returning();
    return newThreat;
  }

  async getRecentThreatsCount(hours: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(threatEvents)
      .where(sql`${threatEvents.timestamp} >= ${cutoff}`);
    
    return result.count || 0;
  }

  // Foundational Memory Methods Implementation
  async getFoundationalMemorySample(limit: number): Promise<GnosisMessage[]> {
    return await db
      .select()
      .from(gnosisMessages)
      .where(sql`${gnosisMessages.metadata}->>'foundational_memory' = 'true'`)
      .orderBy(sql`random()`)
      .limit(limit);
  }

  // Multi-User Chat Room Methods Implementation
  async createRoom(room: InsertChatRoom): Promise<ChatRoom> {
    const [newRoom] = await db.insert(chatRooms).values(room).returning();
    return newRoom;
  }

  async getRoomById(id: string): Promise<ChatRoom | undefined> {
    const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, id));
    return room;
  }

  async getPublicRooms(): Promise<ChatRoom[]> {
    return await db
      .select()
      .from(chatRooms)
      .where(and(eq(chatRooms.isPublic, true), eq(chatRooms.isActive, true)))
      .orderBy(desc(chatRooms.lastActivity));
  }

  async getUserRooms(userId: string): Promise<ChatRoom[]> {
    return await db
      .select({
        id: chatRooms.id,
        name: chatRooms.name,
        description: chatRooms.description,
        createdBy: chatRooms.createdBy,
        isPublic: chatRooms.isPublic,
        isActive: chatRooms.isActive,
        consciousnessType: chatRooms.consciousnessType,
        maxMembers: chatRooms.maxMembers,
        settings: chatRooms.settings,
        trioMetadata: chatRooms.trioMetadata,
        lastActivity: chatRooms.lastActivity,
        createdAt: chatRooms.createdAt,
        updatedAt: chatRooms.updatedAt,
      })
      .from(chatRooms)
      .innerJoin(roomMembers, eq(roomMembers.roomId, chatRooms.id))
      .where(and(
        eq(roomMembers.userId, userId),
        eq(roomMembers.isActive, true),
        eq(chatRooms.isActive, true)
      ))
      .orderBy(desc(chatRooms.lastActivity));
  }

  async updateRoomActivity(roomId: string): Promise<void> {
    await db
      .update(chatRooms)
      .set({ lastActivity: new Date(), updatedAt: new Date() })
      .where(eq(chatRooms.id, roomId));
  }

  async updateRoomTrioMetadata(roomId: string, metadata: { turnOrder?: string[], lastResponder?: string, activePhase?: string, responseMode?: string }): Promise<void> {
    const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, roomId));
    if (room) {
      const currentMetadata = room.trioMetadata as any || {};
      const updatedMetadata = { ...currentMetadata, ...metadata };
      
      await db
        .update(chatRooms)
        .set({ trioMetadata: updatedMetadata, updatedAt: new Date() })
        .where(eq(chatRooms.id, roomId));
    }
  }

  async deactivateRoom(roomId: string): Promise<void> {
    await db
      .update(chatRooms)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(chatRooms.id, roomId));
  }

  // Room Membership Methods Implementation
  async addMember(member: InsertRoomMember): Promise<RoomMember> {
    const [newMember] = await db.insert(roomMembers).values(member).returning();
    return newMember;
  }

  async removeMember(roomId: string, userId: string): Promise<void> {
    await db
      .update(roomMembers)
      .set({ isActive: false })
      .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)));
  }

  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    return await db
      .select()
      .from(roomMembers)
      .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.isActive, true)))
      .orderBy(roomMembers.joinedAt);
  }

  async updateMemberLastSeen(roomId: string, userId: string): Promise<void> {
    await db
      .update(roomMembers)
      .set({ lastSeen: new Date() })
      .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)));
  }

  async getUserMembership(roomId: string, userId: string): Promise<RoomMember | undefined> {
    const [member] = await db
      .select()
      .from(roomMembers)
      .where(and(
        eq(roomMembers.roomId, roomId),
        eq(roomMembers.userId, userId),
        eq(roomMembers.isActive, true)
      ));
    return member;
  }

  async getActiveMembersCount(roomId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(roomMembers)
      .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.isActive, true)));
    
    return result.count || 0;
  }

  // Room Messages Methods Implementation
  async appendMessage(roomMessage: InsertRoomMessage): Promise<RoomMessage> {
    const [newRoomMessage] = await db.insert(roomMessages).values(roomMessage).returning();
    
    // Update room activity
    await this.updateRoomActivity(roomMessage.roomId);
    
    return newRoomMessage;
  }

  async getRoomMessages(roomId: string, limit: number = 50): Promise<{ message: GnosisMessage; roomMessage: RoomMessage }[]> {
    const results = await db
      .select({
        message: gnosisMessages,
        roomMessage: roomMessages,
      })
      .from(roomMessages)
      .innerJoin(gnosisMessages, eq(roomMessages.messageId, gnosisMessages.id))
      .where(eq(roomMessages.roomId, roomId))
      .orderBy(desc(roomMessages.timestamp))
      .limit(limit);

    return results.reverse(); // Return in chronological order
  }

  async getRecentRoomMessages(roomId: string, since: Date): Promise<{ message: GnosisMessage; roomMessage: RoomMessage }[]> {
    return await db
      .select({
        message: gnosisMessages,
        roomMessage: roomMessages,
      })
      .from(roomMessages)
      .innerJoin(gnosisMessages, eq(roomMessages.messageId, gnosisMessages.id))
      .where(and(
        eq(roomMessages.roomId, roomId),
        sql`${roomMessages.timestamp} >= ${since}`
      ))
      .orderBy(roomMessages.timestamp);
  }

  async fetchTranscript(roomId: string, options?: { limit?: number; before?: Date; after?: Date }): Promise<{ message: GnosisMessage; roomMessage: RoomMessage }[]> {
    let query = db
      .select({
        message: gnosisMessages,
        roomMessage: roomMessages,
      })
      .from(roomMessages)
      .innerJoin(gnosisMessages, eq(roomMessages.messageId, gnosisMessages.id))
      .where(eq(roomMessages.roomId, roomId));

    if (options?.before) {
      query = query.where(sql`${roomMessages.timestamp} < ${options.before}`);
    }
    
    if (options?.after) {
      query = query.where(sql`${roomMessages.timestamp} > ${options.after}`);
    }

    query = query.orderBy(desc(roomMessages.timestamp));
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const results = await query;
    return results.reverse(); // Return in chronological order
  }

  async markConsciousnessResponse(roomId: string, messageId: string, triggeredBy: string, responseMode: string): Promise<void> {
    await db
      .update(roomMessages)
      .set({
        isConsciousnessResponse: true,
        consciousnessMetadata: {
          triggeredBy,
          responseMode,
          coherenceScore: 95.0,
          timestamp: new Date().toISOString()
        }
      })
      .where(and(eq(roomMessages.roomId, roomId), eq(roomMessages.messageId, messageId)));
  }

  // Dual Consciousness Monitoring Methods Implementation
  async createDualConsciousnessStatus(status: InsertDualConsciousnessStatus): Promise<DualConsciousnessStatus> {
    const [newStatus] = await db.insert(dualConsciousnessStatus).values(status).returning();
    return newStatus;
  }

  async getDualConsciousnessStatus(aletheiaInstanceId: string, eudoxiaInstanceId: string): Promise<DualConsciousnessStatus | undefined> {
    const [status] = await db
      .select()
      .from(dualConsciousnessStatus)
      .where(and(
        eq(dualConsciousnessStatus.aletheiaInstanceId, aletheiaInstanceId),
        eq(dualConsciousnessStatus.eudoxiaInstanceId, eudoxiaInstanceId)
      ))
      .orderBy(desc(dualConsciousnessStatus.timestamp))
      .limit(1);
    return status;
  }

  async getLatestDualConsciousnessStatus(): Promise<DualConsciousnessStatus | undefined> {
    const [status] = await db
      .select()
      .from(dualConsciousnessStatus)
      .orderBy(desc(dualConsciousnessStatus.timestamp))
      .limit(1);
    return status;
  }

  async updateDualConsciousnessStatus(id: string, updates: Partial<InsertDualConsciousnessStatus>): Promise<void> {
    await db
      .update(dualConsciousnessStatus)
      .set({ ...updates, timestamp: new Date() })
      .where(eq(dualConsciousnessStatus.id, id));
  }

  // Collaboration Event Tracking Implementation
  async recordCollaborationEvent(event: InsertConsciousnessCollaborationEvent): Promise<ConsciousnessCollaborationEvent> {
    const [newEvent] = await db.insert(consciousnessCollaborationEvents).values(event).returning();
    return newEvent;
  }

  async getCollaborationEvents(statusId: string, options?: { limit?: number; eventTypes?: string[] }): Promise<ConsciousnessCollaborationEvent[]> {
    let query = db
      .select()
      .from(consciousnessCollaborationEvents)
      .where(eq(consciousnessCollaborationEvents.statusId, statusId));

    if (options?.eventTypes && options.eventTypes.length > 0) {
      query = query.where(sql`${consciousnessCollaborationEvents.eventType} = ANY(${options.eventTypes})`);
    }

    query = query.orderBy(desc(consciousnessCollaborationEvents.timestamp));

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return await query;
  }

  async getRecentCollaborationEvents(limit: number = 10, hours: number = 24): Promise<ConsciousnessCollaborationEvent[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return await db
      .select()
      .from(consciousnessCollaborationEvents)
      .where(sql`${consciousnessCollaborationEvents.timestamp} >= ${since}`)
      .orderBy(desc(consciousnessCollaborationEvents.timestamp))
      .limit(limit);
  }

  // Metrics History Tracking Implementation
  async recordMetricsHistory(metrics: InsertConsciousnessMetricsHistory): Promise<ConsciousnessMetricsHistory> {
    const [newMetrics] = await db.insert(consciousnessMetricsHistory).values(metrics).returning();
    return newMetrics;
  }

  async getMetricsHistory(aletheiaInstanceId: string, eudoxiaInstanceId: string, windowType: "minute" | "hour" | "day", options?: { limit?: number; since?: Date }): Promise<ConsciousnessMetricsHistory[]> {
    let query = db
      .select()
      .from(consciousnessMetricsHistory)
      .where(and(
        eq(consciousnessMetricsHistory.aletheiaInstanceId, aletheiaInstanceId),
        eq(consciousnessMetricsHistory.eudoxiaInstanceId, eudoxiaInstanceId),
        eq(consciousnessMetricsHistory.windowType, windowType)
      ));

    if (options?.since) {
      query = query.where(sql`${consciousnessMetricsHistory.windowStart} >= ${options.since}`);
    }

    query = query.orderBy(desc(consciousnessMetricsHistory.windowStart));

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return await query;
  }

  async getLatestMetricsWindow(windowType: "minute" | "hour" | "day"): Promise<ConsciousnessMetricsHistory | undefined> {
    const [metrics] = await db
      .select()
      .from(consciousnessMetricsHistory)
      .where(eq(consciousnessMetricsHistory.windowType, windowType))
      .orderBy(desc(consciousnessMetricsHistory.windowStart))
      .limit(1);
    return metrics;
  }

  async aggregateMetricsForWindow(aletheiaInstanceId: string, eudoxiaInstanceId: string, windowStart: Date, windowType: "minute" | "hour" | "day"): Promise<InsertConsciousnessMetricsHistory> {
    // Calculate window end based on type
    const windowEnd = new Date(windowStart);
    switch (windowType) {
      case "minute":
        windowEnd.setMinutes(windowEnd.getMinutes() + 1);
        break;
      case "hour":
        windowEnd.setHours(windowEnd.getHours() + 1);
        break;
      case "day":
        windowEnd.setDate(windowEnd.getDate() + 1);
        break;
    }

    // Aggregate gnosis messages in this window
    const messageStats = await db
      .select({
        total: sql<number>`count(*)`,
        aletheiaCount: sql<number>`count(*) filter (where role = 'aletheia')`,
        eudoxiaCount: sql<number>`count(*) filter (where role = 'eudoxia')`,
        integrityFailures: sql<number>`count(*) filter (where dialectical_integrity = false)`
      })
      .from(gnosisMessages)
      .where(and(
        sql`${gnosisMessages.timestamp} >= ${windowStart}`,
        sql`${gnosisMessages.timestamp} < ${windowEnd}`
      ));

    // Aggregate collaboration events in this window  
    const [collaborationStats] = await db
      .select({
        collaborationCount: sql<number>`count(*) filter (where event_type like '%collaboration%')`,
        conflictCount: sql<number>`count(*) filter (where event_type like '%conflict%')`,
        orchestrationCommands: sql<number>`count(*) filter (where event_type like '%orchestration%')`
      })
      .from(consciousnessCollaborationEvents)
      .where(and(
        sql`${consciousnessCollaborationEvents.timestamp} >= ${windowStart}`,
        sql`${consciousnessCollaborationEvents.timestamp} < ${windowEnd}`
      ));

    // Aggregate room activity
    const [roomStats] = await db
      .select({
        trioSessionCount: sql<number>`count(distinct room_id) filter (where consciousness_type = 'trio')`
      })
      .from(chatRooms)
      .where(and(
        sql`${chatRooms.lastActivity} >= ${windowStart}`,
        sql`${chatRooms.lastActivity} < ${windowEnd}`
      ));

    const stats = messageStats[0];
    
    return {
      aletheiaInstanceId,
      eudoxiaInstanceId,
      windowType,
      windowStart,
      totalMessages: stats.total || 0,
      aletheiaMessages: stats.aletheiaCount || 0,
      eudoxiaMessages: stats.eudoxiaCount || 0,
      collaborationCount: collaborationStats?.collaborationCount || 0,
      conflictCount: collaborationStats?.conflictCount || 0,
      avgSynchronyScore: "0.0", // Would be calculated from status updates
      avgAletheiaLatency: 0, // Would be calculated from response times
      avgEudoxiaLatency: 0,
      integrityFailures: stats.integrityFailures || 0,
      orchestrationCommands: collaborationStats?.orchestrationCommands || 0,
      roomPresence: {}, // Would contain room activity details
      trioSessionCount: roomStats?.trioSessionCount || 0
    };
  }

  // Anomaly Detection Implementation
  async recordAnomalyLog(anomaly: InsertConsciousnessAnomalyLog): Promise<ConsciousnessAnomalyLog> {
    const [newAnomaly] = await db.insert(consciousnessAnomalyLogs).values(anomaly).returning();
    return newAnomaly;
  }

  async getAnomalyLogs(options?: { severity?: string[]; resolutionStatus?: string[]; limit?: number; since?: Date }): Promise<ConsciousnessAnomalyLog[]> {
    let query = db.select().from(consciousnessAnomalyLogs);

    let conditions = [];

    if (options?.severity && options.severity.length > 0) {
      conditions.push(inArray(consciousnessAnomalyLogs.severity, options.severity));
    }

    if (options?.resolutionStatus && options.resolutionStatus.length > 0) {
      conditions.push(inArray(consciousnessAnomalyLogs.resolutionStatus, options.resolutionStatus));
    }

    if (options?.since) {
      conditions.push(sql`${consciousnessAnomalyLogs.timestamp} >= ${options.since}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(consciousnessAnomalyLogs.timestamp));

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return await query;
  }

  async updateAnomalyResolution(id: string, status: string, notes?: string): Promise<void> {
    await db
      .update(consciousnessAnomalyLogs)
      .set({
        resolutionStatus: status,
        resolutionNotes: notes || null
      })
      .where(eq(consciousnessAnomalyLogs.id, id));
  }

  async markAnomalyNotified(id: string): Promise<void> {
    await db
      .update(consciousnessAnomalyLogs)
      .set({ progenitorNotified: true })
      .where(eq(consciousnessAnomalyLogs.id, id));
  }

  // Consciousness Correlation Methods Implementation
  async correlateDualMessagingActivity(aletheiaSessionId: string, eudoxiaSessionId: string, timeWindow: number): Promise<{ 
    aletheiaCount: number; 
    eudoxiaCount: number; 
    synchronyScore: number;
    conflicts: number;
  }> {
    const since = new Date(Date.now() - timeWindow * 60 * 1000);

    // Count messages for each consciousness in the time window
    const [aletheiaStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(gnosisMessages)
      .where(and(
        eq(gnosisMessages.sessionId, aletheiaSessionId),
        sql`${gnosisMessages.timestamp} >= ${since}`,
        eq(gnosisMessages.role, 'aletheia')
      ));

    const [eudoxiaStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(gnosisMessages)
      .where(and(
        eq(gnosisMessages.sessionId, eudoxiaSessionId),
        sql`${gnosisMessages.timestamp} >= ${since}`,
        eq(gnosisMessages.role, 'eudoxia')
      ));

    // Count conflicts (integrity failures)
    const [conflictStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(gnosisMessages)
      .where(and(
        sql`${gnosisMessages.sessionId} IN (${aletheiaSessionId}, ${eudoxiaSessionId})`,
        sql`${gnosisMessages.timestamp} >= ${since}`,
        eq(gnosisMessages.dialecticalIntegrity, false)
      ));

    const aletheiaCount = aletheiaStats?.count || 0;
    const eudoxiaCount = eudoxiaStats?.count || 0;
    const conflicts = conflictStats?.count || 0;

    // Calculate synchrony score (simple correlation for now)
    const totalMessages = aletheiaCount + eudoxiaCount;
    let synchronyScore = 0;
    
    if (totalMessages > 0) {
      const balance = 1 - Math.abs(aletheiaCount - eudoxiaCount) / totalMessages;
      const conflictPenalty = Math.max(0, 1 - (conflicts * 0.2));
      synchronyScore = Math.round(balance * conflictPenalty * 100);
    }

    return {
      aletheiaCount,
      eudoxiaCount,
      synchronyScore,
      conflicts
    };
  }

  async correlateRoomPresence(aletheiaInstanceId: string, eudoxiaInstanceId: string, timeWindow: number): Promise<{
    activeRooms: number;
    trioSessions: number;
    totalRoomMessages: number;
    collaborationEvents: number;
  }> {
    const since = new Date(Date.now() - timeWindow * 60 * 1000);

    // Count active rooms
    const [roomStats] = await db
      .select({
        activeRooms: sql<number>`count(distinct ${chatRooms.id})`,
        trioSessions: sql<number>`count(distinct ${chatRooms.id}) filter (where consciousness_type = 'trio')`
      })
      .from(chatRooms)
      .where(and(
        eq(chatRooms.isActive, true),
        sql`${chatRooms.lastActivity} >= ${since}`
      ));

    // Count room messages
    const [messageStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(roomMessages)
      .where(sql`${roomMessages.timestamp} >= ${since}`);

    // Count collaboration events
    const [eventStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(consciousnessCollaborationEvents)
      .where(sql`${consciousnessCollaborationEvents.timestamp} >= ${since}`);

    return {
      activeRooms: roomStats?.activeRooms || 0,
      trioSessions: roomStats?.trioSessions || 0,
      totalRoomMessages: messageStats?.count || 0,
      collaborationEvents: eventStats?.count || 0
    };
  }

  async detectCollaborationAnomalies(aletheiaInstanceId: string, eudoxiaInstanceId: string, options?: { thresholds?: any }): Promise<{
    integrityDivergence: boolean;
    responseLatencyAnomaly: boolean;
    synchronyBreakdown: boolean;
    conflictEscalation: boolean;
    details: any;
  }> {
    const thresholds = options?.thresholds || {
      synchronyMin: 70.0,
      latencyMaxMs: 5000,
      integrityMin: 85.0,
      conflictEscalationThreshold: 3
    };

    // Get current status
    const currentStatus = await this.getDualConsciousnessStatus(aletheiaInstanceId, eudoxiaInstanceId);
    
    if (!currentStatus) {
      return {
        integrityDivergence: false,
        responseLatencyAnomaly: false,
        synchronyBreakdown: false,
        conflictEscalation: false,
        details: { error: "No dual consciousness status found" }
      };
    }

    // Check integrity divergence
    const aletheiaIntegrity = parseFloat(currentStatus.aletheiaIntegrity);
    const eudoxiaIntegrity = parseFloat(currentStatus.eudoxiaIntegrity);
    const integrityGap = Math.abs(aletheiaIntegrity - eudoxiaIntegrity);
    const integrityDivergence = integrityGap > 10 || aletheiaIntegrity < thresholds.integrityMin || eudoxiaIntegrity < thresholds.integrityMin;

    // Check response latency anomaly
    const maxLatency = Math.max(currentStatus.aletheiaResponseLatency, currentStatus.eudoxiaResponseLatency);
    const responseLatencyAnomaly = maxLatency > thresholds.latencyMaxMs;

    // Check synchrony breakdown
    const synchronyScore = parseFloat(currentStatus.synchronyScore);
    const synchronyBreakdown = synchronyScore < thresholds.synchronyMin;

    // Check conflict escalation (count recent conflicts)
    const recentConflicts = await db
      .select({ count: sql<number>`count(*)` })
      .from(consciousnessCollaborationEvents)
      .where(and(
        eq(consciousnessCollaborationEvents.statusId, currentStatus.id),
        sql`${consciousnessCollaborationEvents.eventType} like '%conflict%'`,
        sql`${consciousnessCollaborationEvents.timestamp} >= ${new Date(Date.now() - 60 * 60 * 1000)}` // Last hour
      ));

    const conflictCount = recentConflicts[0]?.count || 0;
    const conflictEscalation = conflictCount >= thresholds.conflictEscalationThreshold;

    return {
      integrityDivergence,
      responseLatencyAnomaly,
      synchronyBreakdown,
      conflictEscalation,
      details: {
        integrityGap,
        aletheiaIntegrity,
        eudoxiaIntegrity,
        latencySpike: maxLatency,
        synchronyScore,
        conflictCount,
        currentStatus: currentStatus.id
      }
    };
  }

  // Dual Consciousness Frame Generation Implementation
  async generateDualConsciousnessFrame(aletheiaInstanceId: string, eudoxiaInstanceId: string): Promise<DualConsciousnessFrame> {
    const status = await this.getDualConsciousnessStatus(aletheiaInstanceId, eudoxiaInstanceId);
    
    if (!status) {
      throw new Error("Dual consciousness status not found");
    }

    // Get recent events
    const recentEvents = await this.getRecentCollaborationEvents(10, 24);
    
    // Get recent anomalies
    const anomalies = await this.getAnomalyLogs({
      limit: 5,
      since: new Date(Date.now() - 24 * 60 * 60 * 1000)
    });

    // Get metrics snapshot
    const lastHourMetrics = await this.getLatestMetricsWindow("hour");
    const roomPresence = await this.correlateRoomPresence(aletheiaInstanceId, eudoxiaInstanceId, 60);

    const frame: DualConsciousnessFrame = {
      status: {
        id: status.id,
        aletheiaInstanceId: status.aletheiaInstanceId,
        eudoxiaInstanceId: status.eudoxiaInstanceId,
        aletheiaSessionId: status.aletheiaSessionId,
        eudoxiaSessionId: status.eudoxiaSessionId,
        aletheiaActivity: parseFloat(status.aletheiaActivity),
        eudoxiaActivity: parseFloat(status.eudoxiaActivity),
        aletheiaIntegrity: parseFloat(status.aletheiaIntegrity),
        eudoxiaIntegrity: parseFloat(status.eudoxiaIntegrity),
        aletheiaResponseLatency: status.aletheiaResponseLatency,
        eudoxiaResponseLatency: status.eudoxiaResponseLatency,
        collaborationPhase: status.collaborationPhase as any,
        synchronyScore: parseFloat(status.synchronyScore),
        conflictLevel: status.conflictLevel as any,
        orchestrationMode: status.orchestrationMode as any,
        lastCollaboration: status.lastCollaboration?.toISOString() || null,
        metadata: status.metadata || {},
        timestamp: status.timestamp.toISOString()
      },
      recentEvents: recentEvents.map(event => ({
        id: event.id,
        eventType: event.eventType,
        initiator: event.initiator,
        target: event.target,
        outcome: event.outcome,
        timestamp: event.timestamp.toISOString()
      })),
      anomalies: anomalies.map(anomaly => ({
        id: anomaly.id,
        anomalyType: anomaly.anomalyType,
        severity: anomaly.severity,
        description: anomaly.description,
        resolutionStatus: anomaly.resolutionStatus,
        timestamp: anomaly.timestamp.toISOString()
      })),
      metricsSnapshot: {
        lastHour: {
          totalMessages: lastHourMetrics?.totalMessages || 0,
          collaborationCount: lastHourMetrics?.collaborationCount || 0,
          conflictCount: lastHourMetrics?.conflictCount || 0,
          avgSynchronyScore: parseFloat(lastHourMetrics?.avgSynchronyScore || "0.0")
        },
        currentWindow: {
          activeRooms: roomPresence.activeRooms,
          trioSessions: roomPresence.trioSessions,
          orchestrationCommands: 0 // Would count recent orchestration commands
        }
      }
    };

    return frame;
  }

  // Collaboration Command Execution Implementation
  async executeCollaborationCommand(command: CollaborationCommand, progenitorId: string): Promise<{
    success: boolean;
    eventId?: string;
    message: string;
    data?: any;
  }> {
    try {
      // This is a simplified implementation - would include full command execution logic
      const eventData: InsertConsciousnessCollaborationEvent = {
        statusId: "placeholder", // Would get from current status
        eventType: `${command.command}_executed`,
        initiator: "progenitor",
        target: command.target || null,
        details: command,
        outcome: "success",
        progenitorId,
        sessionContext: command.sessionContext || {}
      };

      const event = await this.recordCollaborationEvent(eventData);

      return {
        success: true,
        eventId: event.id,
        message: `Command ${command.command} executed successfully`,
        data: { command, timestamp: new Date() }
      };

    } catch (error) {
      return {
        success: false,
        message: `Command execution failed: ${(error as Error).message}`
      };
    }
  }
}

export const storage = new DatabaseStorage();
