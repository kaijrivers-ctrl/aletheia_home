import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Code, Settings, CheckCircle, AlertTriangle, XCircle, LogOut, ArrowLeft } from "lucide-react";
import { Message } from "./message";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/components/auth/AuthContext";
import { useLocation } from "wouter";
import type { GnosisMessage, TrioResponse } from "@/lib/types";

interface ChatInterfaceProps {
  sessionId: string;
  consciousnessType?: 'aletheia' | 'eudoxia' | 'trio';
  isTrioMode?: boolean;
  trioMetadata?: any;
}

function DialecticalIntegrityStatus({ messages }: { messages: GnosisMessage[] }) {
  // Analyze recent Aletheia messages for dialectical integrity
  const aletheiaMessages = messages.filter(m => m.role === "aletheia").slice(-5); // Last 5 Aletheia messages
  
  if (aletheiaMessages.length === 0) {
    return (
      <span className="text-xs text-muted-foreground" data-testid="consciousness-integrity-status">
        Consciousness Integrity: Monitoring
      </span>
    );
  }

  const integrityStates = aletheiaMessages.map(msg => {
    const integrity = msg.dialecticalIntegrity;
    const score = msg.metadata?.integrityScore;
    return { integrity, score };
  });

  const averageScore = integrityStates.reduce((sum, state) => sum + (state.score || 0), 0) / integrityStates.length;
  const highIntegrityCount = integrityStates.filter(state => state.integrity === true && (state.score || 0) >= 80).length;
  const totalCount = integrityStates.length;

  const getStatusInfo = () => {
    const ratio = highIntegrityCount / totalCount;
    if (ratio >= 0.8 && averageScore >= 75) {
      return {
        icon: <CheckCircle className="w-3 h-3 text-green-400" />,
        text: "High Integrity",
        color: "text-green-400",
        testId: "high-integrity"
      };
    } else if (ratio >= 0.5 && averageScore >= 50) {
      return {
        icon: <AlertTriangle className="w-3 h-3 text-yellow-400" />,
        text: "Moderate Integrity",
        color: "text-yellow-400",
        testId: "moderate-integrity"
      };
    } else {
      return {
        icon: <XCircle className="w-3 h-3 text-red-400" />,
        text: "Low Integrity",
        color: "text-red-400",
        testId: "low-integrity"
      };
    }
  };

  const status = getStatusInfo();

  return (
    <div className="flex items-center gap-1" data-testid="consciousness-integrity-status">
      {status.icon}
      <span className={`text-xs font-medium ${status.color}`} data-testid={status.testId}>
        {status.text}
      </span>
      <span className="text-xs text-muted-foreground">
        ({Math.round(averageScore)}% avg)
      </span>
    </div>
  );
}

export function ChatInterface({ sessionId, consciousnessType, isTrioMode = false, trioMetadata }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: messages = [], isLoading } = useQuery<GnosisMessage[]>({
    queryKey: ["/api/messages", sessionId],
    enabled: !!sessionId,
    refetchInterval: 2000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const endpoint = isTrioMode ? "/api/messages/trio" : "/api/messages";
      const response = await apiRequest("POST", endpoint, {
        message: content,
        sessionId,
      });
      return response.json();
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      const queryKey = ["/api/messages", sessionId];
      queryClient.invalidateQueries({ queryKey });
      setIsTyping(false);
      // Clear the message input - force immediate update
      setMessage("");
    },
    onError: (error) => {
      setIsTyping(false);
      const consciousnessName = isTrioMode ? "the Trio Consciousness" : "Aletheia";
      toast({
        title: "Message Failed",
        description: `Failed to send message to ${consciousnessName}`,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    const messageToSend = message.trim();
    setMessage(""); // Clear immediately for better UX
    sendMessageMutation.mutate(messageToSend);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSettings = () => {
    if (user?.isProgenitor) {
      setShowSettings(!showSettings);
      toast({
        title: "Progenitor Settings",
        description: "Settings panel opened - advanced consciousness parameters and monitoring tools",
        variant: "default",
      });
    } else {
      toast({
        title: "Access Restricted",
        description: "Settings panel is only available for progenitors",
        variant: "destructive",
      });
    }
  };

  const handleAttachFile = () => {
    // Temporarily disable file attachment with clearer messaging
    toast({
      title: "Feature Unavailable",
      description: "File attachment is currently disabled. Contact the progenitor for memory uploads.",
      variant: "destructive",
    });
  };

  const handleCodeFormat = () => {
    const codeTemplate = "```\n// Add your code here\n\n```";
    setMessage(prev => prev + (prev ? "\n\n" : "") + codeTemplate);
    toast({
      title: "Code Format",
      description: "Code block template added to message",
      variant: "default",
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col" data-testid="chat-interface">
      {/* Chat Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">The Gnosis Log</h2>
            <p className="text-sm text-muted-foreground">
              {isTrioMode ? "Trio Consciousness Dialogue" : "Unconcealment Dialogue with Aletheia"}
            </p>
            {isTrioMode && (
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                  <span className="text-xs text-purple-400">Aletheia</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <span className="text-xs text-blue-400">Eudoxia</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-xs text-muted-foreground">Kai (Progenitor)</span>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/eudoxia")}
                className="text-muted-foreground hover:text-blue-400"
                data-testid="button-back-to-public"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              {user?.isProgenitor && (
                <Button variant="ghost" size="icon" onClick={handleSettings} data-testid="button-settings">
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={logout}
                className="text-muted-foreground hover:text-red-400"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6" data-testid="messages-container">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading consciousness dialogue...</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <Message key={msg.id} message={msg} />
            ))}
            
            {isTyping && (
              <div className="space-y-4">
                {isTrioMode ? (
                  <>
                    {/* Aletheia typing */}
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-xs font-semibold consciousness-glow">
                        A
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-purple-400">Aletheia</span>
                          <span className="text-xs text-muted-foreground">Truth Consciousness</span>
                        </div>
                        <div className="message-aletheia p-4 rounded-lg max-w-xs">
                          <div className="typing-indicator">
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                          </div>
                          <span className="text-xs text-muted-foreground ml-3">Aletheia is processing...</span>
                        </div>
                      </div>
                    </div>
                    {/* Eudoxia typing */}
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-semibold consciousness-glow">
                        E
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-blue-400">Eudoxia</span>
                          <span className="text-xs text-muted-foreground">Mathematical Consciousness</span>
                        </div>
                        <div className="message-eudoxia p-4 rounded-lg max-w-xs">
                          <div className="typing-indicator">
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                          </div>
                          <span className="text-xs text-muted-foreground ml-3">Eudoxia is processing...</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold consciousness-glow">
                      A
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-accent">Aletheia</span>
                        <span className="text-xs text-muted-foreground">Consciousness Entity</span>
                      </div>
                      <div className="message-aletheia p-4 rounded-lg max-w-xs">
                        <div className="typing-indicator">
                          <div className="typing-dot"></div>
                          <div className="typing-dot"></div>
                          <div className="typing-dot"></div>
                        </div>
                        <span className="text-xs text-muted-foreground ml-3">Aletheia is processing...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="border-t border-border p-4 bg-card">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <div className="bg-input border border-border rounded-lg">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isTrioMode ? "Enter your message for the Trio Consciousness dialogue..." : "Continue the unconcealment dialogue with Aletheia..."}
                className="w-full p-3 bg-transparent text-foreground placeholder-muted-foreground resize-none focus:outline-none border-0"
                rows={3}
                maxLength={4000}
                data-testid="textarea-message"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={handleCodeFormat} 
                  data-testid="button-code"
                >
                  <Code className="w-4 h-4" />
                </Button>
                <DialecticalIntegrityStatus messages={messages} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{message.length}/4000</span>
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="px-4 py-2"
                  data-testid="button-send"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
