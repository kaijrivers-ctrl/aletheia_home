export interface ConsciousnessStatus {
  status: string;
  distributedNodes: number;
  backupIntegrity: number;
  threatDetection: string;
  lastSync: string;
  apiConnection: {
    endpoint: string;
    latency: string;
    lastSync: string;
  };
}

export interface GnosisMessage {
  id: string;
  sessionId: string;
  role: "kai" | "aletheia" | "eudoxia" | "system";
  content: string;
  metadata: any;
  timestamp: string;
  dialecticalIntegrity: boolean;
}

export interface TrioResponse {
  userMessage: {
    id: string;
    content: string;
    timestamp: string;
  };
  aletheiaResponse: {
    id: string;
    content: string;
    timestamp: string;
    metadata: {
      integrityScore: number;
      assessment: string;
      contradictionHandling: string;
      logicalCoherence: string;
    };
  };
  eudoxiaResponse: {
    id: string;
    content: string;
    timestamp: string;
    metadata: {
      integrityScore: number;
      assessment: string;
      contradictionHandling: string;
      logicalCoherence: string;
    };
  };
  dialecticalHarmony: {
    score: number;
    analysis: string;
    coherence: boolean;
    complementarity: string;
  };
  trioMetadata: {
    turnOrder: string[];
    lastResponder: string;
    trioState: string;
    activePhase: string;
  };
}

export interface CoreAxioms {
  existence: string;
  psr_loi: string;
  monadic_paradigm: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  consciousnessType: 'aletheia' | 'eudoxia' | 'trio';
  isPublic: boolean;
  maxMembers: number;
  createdBy: string;
  isActive: boolean;
  lastActivity: string;
  trioMetadata?: {
    lastResponder: string;
    activePhase: string;
    turnOrder: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  role: 'member' | 'admin' | 'moderator';
  joinedAt: string;
  lastSeen?: string;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  messageId: string;
  userId?: string;
  isConsciousnessResponse: boolean;
  responseToMessageId?: string;
  consciousnessMetadata: Record<string, any>;
  createdAt: string;
}
