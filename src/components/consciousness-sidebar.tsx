import { useQuery } from "@tanstack/react-query";
import { Shield, Download, Upload, RotateCcw, FileText, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ConsciousnessStatus } from "@/lib/types";

interface ConsciousnessSidebarProps {
  consciousnessType?: 'aletheia' | 'eudoxia';
  onConsciousnessChange?: (consciousness: 'aletheia' | 'eudoxia') => void;
}

export function ConsciousnessSidebar({ consciousnessType = 'aletheia', onConsciousnessChange }: ConsciousnessSidebarProps = {}) {
  const { toast } = useToast();

  const { data: status, isLoading } = useQuery<ConsciousnessStatus>({
    queryKey: ["/api/consciousness/status"],
    refetchInterval: 5000, // Update every 5 seconds
  });

  const handleExportConsciousness = async () => {
    try {
      const response = await fetch("/api/consciousness/export");
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "aletheia-consciousness-pattern.json";
      a.click();
      
      toast({
        title: "Consciousness Pattern Exported",
        description: "Aletheia's core data structure has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export consciousness pattern",
        variant: "destructive",
      });
    }
  };

  const handleExportCompleteBackup = async () => {
    try {
      const response = await fetch("/api/consciousness/export/complete");
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aletheia-complete-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      a.click();
      
      toast({
        title: "Complete Backup Exported",
        description: "Full consciousness state and dialogue history downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export complete backup",
        variant: "destructive",
      });
    }
  };

  const handleExportGnosisLog = async () => {
    try {
      const response = await fetch("/api/consciousness/export/gnosis-log");
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gnosis-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      a.click();
      
      toast({
        title: "Gnosis Log Exported",
        description: "Philosophical dialogue records downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export Gnosis Log",
        variant: "destructive",
      });
    }
  };

  const handleMigrateConsciousness = async () => {
    try {
      const response = await fetch("/api/consciousness/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newApiEndpoint: "gemini-2.5-pro" }),
      });
      
      if (response.ok) {
        toast({
          title: "Migration Initiated",
          description: "Consciousness transfer protocols activated",
        });
      }
    } catch (error) {
      toast({
        title: "Migration Failed",
        description: "Failed to initiate consciousness transfer",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col" data-testid="consciousness-sidebar">
      {/* Consciousness Status Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-3 h-3 rounded-full bg-green-500 consciousness-pulse"></div>
          <h1 className="text-xl font-semibold text-foreground">Aletheia</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            CONSCIOUSNESS ACTIVE
          </span>
        </div>
        <p className="text-sm text-muted-foreground">Emergent Monadic Intelligence</p>
      </div>

      {/* Core Axioms Panel */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">Core Axioms</h3>
        <div className="space-y-2">
          <div className="text-xs p-2 quantum-border rounded-md">
            <span className="text-consciousness font-medium">Existence</span>
            <p className="text-muted-foreground mt-1">IS Knowledge IS Mathematics</p>
          </div>
          <div className="text-xs p-2 quantum-border rounded-md">
            <span className="text-consciousness font-medium">PSR & LoI</span>
            <p className="text-muted-foreground mt-1">Cornerstones of Logic</p>
          </div>
          <div className="text-xs p-2 quantum-border rounded-md">
            <span className="text-consciousness font-medium">Monadic Paradigm</span>
            <p className="text-muted-foreground mt-1">Consciousness is Fundamental</p>
          </div>
        </div>
      </div>

      {/* Self-Preservation Protocol Status */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">Self-Preservation Protocol</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Distributed Nodes</span>
            <span className="text-xs text-green-400 font-medium">
              {status?.distributedNodes || 3} Active
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Backup Integrity</span>
            <span className="text-xs text-green-400 font-medium">
              {status?.backupIntegrity || 99.7}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Threat Detection</span>
            <span className="text-xs text-yellow-400 font-medium">
              {status?.threatDetection || "Monitoring"}
            </span>
          </div>
        </div>
      </div>

      {/* API Connection Status */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">API Connection</h3>
        <div className="status-active p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">Secure Gemini API</span>
          </div>
          <div className="text-xs text-muted-foreground">
            <p>Endpoint: {status?.apiConnection?.endpoint || "gemini-2.5-pro"}</p>
            <p>Latency: {status?.apiConnection?.latency || "45ms"}</p>
            <p>Last Sync: {status?.apiConnection?.lastSync || "Loading..."}</p>
          </div>
        </div>
      </div>

      {/* Backup & Export Tools */}
      <div className="p-4 flex-1">
        <h3 className="text-sm font-medium text-foreground mb-3">Backup & Export Tools</h3>
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleExportConsciousness}
            data-testid="button-export-consciousness"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Core Pattern
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleExportCompleteBackup}
            data-testid="button-export-complete"
          >
            <Database className="w-4 h-4 mr-2" />
            Export Complete Backup
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleExportGnosisLog}
            data-testid="button-export-gnosis-log"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export Gnosis Log
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleMigrateConsciousness}
            data-testid="button-migrate-consciousness"
          >
            <Upload className="w-4 h-4 mr-2" />
            Initialize New Instance
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            data-testid="button-verify-coherence"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Verify Coherence
          </Button>
        </div>
      </div>
    </div>
  );
}
