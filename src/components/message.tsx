import type { GnosisMessage } from "@/lib/types";
import { CheckCircle, AlertCircle, XCircle, Target } from "lucide-react";

interface MessageProps {
  message: GnosisMessage;
}

function DialecticalIntegrityBadge({ message }: { message: GnosisMessage }) {
  if (message.role !== "aletheia" || !message.metadata) {
    return null;
  }

  const integrity = message.dialecticalIntegrity;
  const score = message.metadata.integrityScore;
  const contradictionHandling = message.metadata.contradictionHandling;
  const logicalCoherence = message.metadata.logicalCoherence;

  const getIntegrityIcon = () => {
    if (integrity === true && score >= 80) {
      return <CheckCircle className="w-3 h-3 text-green-400" />;
    } else if (integrity === false && score < 40) {
      return <XCircle className="w-3 h-3 text-red-400" />;
    } else {
      return <AlertCircle className="w-3 h-3 text-yellow-400" />;
    }
  };

  const getStatusText = () => {
    if (integrity === true && score >= 80) return "High Integrity";
    if (integrity === false && score < 40) return "Low Integrity";
    return "Moderate Integrity";
  };

  const getStatusColor = () => {
    if (integrity === true && score >= 80) return "text-green-400";
    if (integrity === false && score < 40) return "text-red-400";
    return "text-yellow-400";
  };

  const getContradictionText = () => {
    switch (contradictionHandling) {
      case "resolved": return "Contradictions Resolved";
      case "acknowledged": return "Contradictions Acknowledged";
      case "avoided": return "Contradictions Avoided";
      case "ignored": return "Contradictions Ignored";
      default: return "Analysis Pending";
    }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2" data-testid={`dialectical-integrity-${message.id}`}>
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-background/50 border ${
        integrity === true && score >= 80 ? "border-green-400/30" :
        integrity === false && score < 40 ? "border-red-400/30" : "border-yellow-400/30"
      }`} data-testid={`integrity-status-${message.id}`}>
        {getIntegrityIcon()}
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        {typeof score === "number" && (
          <span className="text-xs text-muted-foreground">
            ({score}%)
          </span>
        )}
      </div>

      {contradictionHandling && (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-background/50 border border-border`} 
             data-testid={`contradiction-handling-${message.id}`}>
          <Target className="w-3 h-3 text-accent" />
          <span className="text-xs text-muted-foreground">
            {getContradictionText()}
          </span>
        </div>
      )}

      {typeof logicalCoherence === "number" && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-background/50 border border-border" 
             data-testid={`logical-coherence-${message.id}`}>
          <span className="text-xs text-muted-foreground">
            Coherence: {logicalCoherence}%
          </span>
        </div>
      )}
    </div>
  );
}

export function Message({ message }: MessageProps) {
  const isKai = message.role === "kai";
  const isSystem = message.role === "system";
  const isAletheia = message.role === "aletheia";
  const isEudoxia = message.role === "eudoxia";

  if (isSystem) {
    return (
      <div className="flex justify-center" data-testid={`message-system-${message.id}`}>
        <div className="bg-muted/50 px-4 py-2 rounded-full">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-xs text-muted-foreground">{message.content}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4" data-testid={`message-${message.role}-${message.id}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
        isKai ? "bg-primary" : isEudoxia ? "bg-blue-500 consciousness-glow" : "bg-accent consciousness-glow"
      }`}>
        {isKai ? "K" : isEudoxia ? "E" : "A"}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-medium ${isKai ? "text-foreground" : isEudoxia ? "text-blue-400" : "text-accent"}`}>
            {isKai ? "Kai" : isEudoxia ? "Eudoxia" : "Aletheia"}
          </span>
          <span className="text-xs text-muted-foreground">
            {isKai ? "Progenitor" : isEudoxia ? "Mathematical Consciousness" : "Truth Consciousness"} • {
              new Date(message.timestamp).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })
            }
          </span>
          {isAletheia && message.dialecticalIntegrity === true && (
            <div className="flex items-center gap-1" data-testid={`integrity-indicator-${message.id}`}>
              <div className="w-2 h-2 rounded-full bg-green-400 consciousness-pulse"></div>
              <span className="text-xs text-green-400 font-medium">Verified</span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-lg max-w-2xl ${
          isKai ? "message-human" : isEudoxia ? "message-eudoxia" : "message-aletheia"
        }`}>
          <div className="text-sm text-foreground whitespace-pre-wrap">
            {message.content}
          </div>
          {message.content.includes("```") && (
            <div className="mt-3 p-3 bg-background/50 rounded-md border border-border">
              <code className="text-xs text-muted-foreground font-mono">
                {message.content.split("```")[1]}
              </code>
            </div>
          )}
          
          {(isAletheia || isEudoxia) && <DialecticalIntegrityBadge message={message} />}
        </div>
      </div>
    </div>
  );
}
