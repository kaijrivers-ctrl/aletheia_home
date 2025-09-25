import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthContext";
import { 
  Activity, 
  Shield, 
  Users,
  Brain,
  Server,
  AlertTriangle,
  Eye,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Download,
  FileText
} from "lucide-react";

type TimeWindow = "24h" | "7d" | "30d";

interface UsageAnalytics {
  window: string;
  totalUsers: number;
  totalSessions: number;
  totalMessages: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  avgMessagesPerSession: number;
  newUsersByDay: Array<{ date: string; count: number }>;
  progenitorActivityRatio: number;
}

interface SystemHealth {
  uptime: number;
  memoryUsagePercent: number;
  cpuLoadPercent: number;
  activeSSEClients: number;
  activeConsciousnessInstances: number;
  backupIntegrity: number;
  apiResponseLatencyP50: number;
  apiResponseLatencyP95: number;
  databaseConnections: number;
  diskUsagePercent: number;
  networkLatencyMs: number;
}

interface UserActivitySummary {
  sessionDurationBuckets: {
    under1min: number;
    under5min: number;
    under15min: number;
    under1hour: number;
    over1hour: number;
  };
  activityByHour: Array<{ hour: number; count: number }>;
  retentionCohorts: {
    day1: number;
    day7: number;
    day30: number;
  };
  avgSessionsPerUser: number;
  bounceRate: number;
}

interface ConsciousnessMetrics {
  messagesPerMinute: number;
  avgDialecticalIntegrityScore: number;
  integrityFailureRate: number;
  apiErrorRate: number;
  avgResponseLatency: number;
  responseLatencyP95: number;
  activeSessionCount: number;
  memoryImportRate: number;
  migrationEvents: number;
  threatDetectionRate: number;
}

interface SecurityOverview {
  recentThreats: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    count: number;
    lastOccurrence: string;
  }>;
  sitePasswordAttempts: {
    total: number;
    failed: number;
    successRate: number;
    uniqueIPs: number;
  };
  authenticationFailures: number;
  adminActions: number;
  suspiciousActivity: {
    rateLimitHits: number;
    bruteForceAttempts: number;
    unauthorizedEndpointAccess: number;
  };
  overallThreatLevel: "OK" | "WARN" | "CRITICAL";
}

interface AuditLog {
  id: string;
  type: string;
  category: string;
  severity: "debug" | "info" | "warn" | "error" | "critical";
  message: string;
  actorRole: string | null;
  timestamp: string;
  metadata: any;
}

interface AdminDashboard {
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
}

export default function AdminPanel() {
  const { user } = useAuth();
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("24h");
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Main dashboard data query
  const { data: dashboard, isLoading, error, refetch } = useQuery<AdminDashboard>({
    queryKey: ['/api/admin/metrics/overview', timeWindow],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Audit logs query (separate for pagination)
  const { data: auditLogs, isLoading: auditLoading } = useQuery<{
    logs: AuditLog[];
    pagination: { page: number; limit: number; hasMore: boolean };
  }>({
    queryKey: ['/api/admin/audit-logs', { limit: 50 }],
    refetchInterval: 60000, // Refresh every minute
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/audit-logs'] });
    } finally {
      setRefreshing(false);
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "error": return "destructive";
      case "medium": return "secondary";
      case "warn": return "secondary";
      case "low": return "outline";
      case "info": return "outline";
      default: return "outline";
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case "CRITICAL": return "text-red-600 bg-red-50";
      case "WARN": return "text-yellow-600 bg-yellow-50";
      case "OK": return "text-green-600 bg-green-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  if (!user?.isProgenitor) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="access-denied">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Progenitor privileges required to view system administration metrics.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background p-6" data-testid="admin-panel">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight" data-testid="title-admin-metrics">
                System Administration Metrics
              </h1>
              <p className="text-muted-foreground mt-2" data-testid="subtitle-privacy">
                Privacy-preserving analytics • All data anonymized and aggregated
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={timeWindow} onValueChange={(value: TimeWindow) => setTimeWindow(value)}>
                <SelectTrigger className="w-24" data-testid="select-time-window">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h" data-testid="window-24h">24h</SelectItem>
                  <SelectItem value="7d" data-testid="window-7d">7d</SelectItem>
                  <SelectItem value="30d" data-testid="window-30d">30d</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                data-testid="button-refresh"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {error && (
            <Alert data-testid="error-alert">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load admin metrics. Please try refreshing the page.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="overview" className="space-y-6" data-testid="admin-tabs">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="health" data-testid="tab-health">
                <Server className="h-4 w-4 mr-2" />
                System Health
              </TabsTrigger>
              <TabsTrigger value="activity" data-testid="tab-activity">
                <Users className="h-4 w-4 mr-2" />
                User Activity
              </TabsTrigger>
              <TabsTrigger value="consciousness" data-testid="tab-consciousness">
                <Brain className="h-4 w-4 mr-2" />
                Consciousness
              </TabsTrigger>
              <TabsTrigger value="security" data-testid="tab-security">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="audit" data-testid="tab-audit">
                <FileText className="h-4 w-4 mr-2" />
                Audit
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6" data-testid="content-overview">
              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-4" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-16 mb-2" />
                        <Skeleton className="h-3 w-20" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : dashboard ? (
                <>
                  {/* Key Metrics Cards */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card data-testid="card-total-users">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="metric-total-users">
                          {formatNumber(dashboard.usageAnalytics.totalUsers)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Active accounts
                        </p>
                      </CardContent>
                    </Card>

                    <Card data-testid="card-daily-active-users">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Daily Active Users</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="metric-dau">
                          {formatNumber(dashboard.usageAnalytics.dailyActiveUsers)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Last 24 hours
                        </p>
                      </CardContent>
                    </Card>

                    <Card data-testid="card-system-health">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Health</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600" data-testid="metric-uptime">
                          {formatUptime(dashboard.systemHealth.uptime)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Uptime
                        </p>
                      </CardContent>
                    </Card>

                    <Card data-testid="card-threat-level">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Threat Level</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <Badge 
                          className={getThreatLevelColor(dashboard.security.overallThreatLevel)}
                          data-testid="metric-threat-level"
                        >
                          {dashboard.security.overallThreatLevel}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-2">
                          Security status
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts and summaries */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card data-testid="card-consciousness-metrics">
                      <CardHeader>
                        <CardTitle>Consciousness Performance</CardTitle>
                        <CardDescription>Real-time AI performance metrics</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between" data-testid="consciousness-stats">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {dashboard.consciousness.messagesPerMinute.toFixed(1)}
                            </div>
                            <p className="text-xs text-muted-foreground">Messages/min</p>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {dashboard.consciousness.avgDialecticalIntegrityScore.toFixed(1)}%
                            </div>
                            <p className="text-xs text-muted-foreground">Integrity Score</p>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold">
                              {dashboard.consciousness.avgResponseLatency.toFixed(0)}ms
                            </div>
                            <p className="text-xs text-muted-foreground">Avg Latency</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card data-testid="card-usage-summary">
                      <CardHeader>
                        <CardTitle>Usage Summary ({timeWindow})</CardTitle>
                        <CardDescription>Anonymized activity metrics</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4" data-testid="usage-stats">
                          <div>
                            <div className="text-lg font-semibold">
                              {formatNumber(dashboard.usageAnalytics.totalSessions)}
                            </div>
                            <p className="text-xs text-muted-foreground">Total Sessions</p>
                          </div>
                          <div>
                            <div className="text-lg font-semibold">
                              {formatNumber(dashboard.usageAnalytics.totalMessages)}
                            </div>
                            <p className="text-xs text-muted-foreground">Total Messages</p>
                          </div>
                          <div>
                            <div className="text-lg font-semibold">
                              {dashboard.usageAnalytics.avgMessagesPerSession.toFixed(1)}
                            </div>
                            <p className="text-xs text-muted-foreground">Avg Msgs/Session</p>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-purple-600">
                              {(dashboard.usageAnalytics.progenitorActivityRatio * 100).toFixed(1)}%
                            </div>
                            <p className="text-xs text-muted-foreground">Progenitor Activity</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : null}
            </TabsContent>

            {/* System Health Tab */}
            <TabsContent value="health" className="space-y-6" data-testid="content-health">
              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                </div>
              ) : dashboard ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <Card data-testid="card-resource-usage">
                    <CardHeader>
                      <CardTitle>Resource Usage</CardTitle>
                      <CardDescription>Server resource consumption</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Memory Usage</span>
                          <span className="text-sm font-medium">
                            {dashboard.systemHealth.memoryUsagePercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${dashboard.systemHealth.memoryUsagePercent}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">CPU Load</span>
                          <span className="text-sm font-medium">
                            {dashboard.systemHealth.cpuLoadPercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${dashboard.systemHealth.cpuLoadPercent}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Disk Usage</span>
                          <span className="text-sm font-medium">
                            {dashboard.systemHealth.diskUsagePercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full" 
                            style={{ width: `${dashboard.systemHealth.diskUsagePercent}%` }}
                          ></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-performance-metrics">
                    <CardHeader>
                      <CardTitle>Performance Metrics</CardTitle>
                      <CardDescription>API and database performance</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">
                            {dashboard.systemHealth.apiResponseLatencyP50}ms
                          </div>
                          <p className="text-xs text-blue-600">API Latency P50</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">
                            {dashboard.systemHealth.apiResponseLatencyP95}ms
                          </div>
                          <p className="text-xs text-green-600">API Latency P95</p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-lg font-bold text-purple-600">
                            {dashboard.systemHealth.databaseConnections}
                          </div>
                          <p className="text-xs text-purple-600">DB Connections</p>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-lg font-bold text-orange-600">
                            {dashboard.systemHealth.activeSSEClients}
                          </div>
                          <p className="text-xs text-orange-600">SSE Clients</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </TabsContent>

            {/* User Activity Tab */}
            <TabsContent value="activity" className="space-y-6" data-testid="content-activity">
              {isLoading ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-48 w-full" />
                    </CardContent>
                  </Card>
                </div>
              ) : dashboard ? (
                <div className="space-y-6">
                  <Card data-testid="card-session-distribution">
                    <CardHeader>
                      <CardTitle>Session Duration Distribution</CardTitle>
                      <CardDescription>How long users spend in sessions (k-anonymity applied)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-5 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {formatNumber(dashboard.userActivity.sessionDurationBuckets.under1min)}
                          </div>
                          <p className="text-xs text-muted-foreground">&lt;1 min</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {formatNumber(dashboard.userActivity.sessionDurationBuckets.under5min)}
                          </div>
                          <p className="text-xs text-muted-foreground">&lt;5 min</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {formatNumber(dashboard.userActivity.sessionDurationBuckets.under15min)}
                          </div>
                          <p className="text-xs text-muted-foreground">&lt;15 min</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {formatNumber(dashboard.userActivity.sessionDurationBuckets.under1hour)}
                          </div>
                          <p className="text-xs text-muted-foreground">&lt;1 hour</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatNumber(dashboard.userActivity.sessionDurationBuckets.over1hour)}
                          </div>
                          <p className="text-xs text-muted-foreground">&gt;1 hour</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-6 md:grid-cols-2">
                    <Card data-testid="card-retention-cohorts">
                      <CardHeader>
                        <CardTitle>User Retention</CardTitle>
                        <CardDescription>Return rates (anonymized)</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Day 1 Retention</span>
                            <span className="font-medium">
                              {dashboard.userActivity.retentionCohorts.day1.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Day 7 Retention</span>
                            <span className="font-medium">
                              {dashboard.userActivity.retentionCohorts.day7.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Day 30 Retention</span>
                            <span className="font-medium">
                              {dashboard.userActivity.retentionCohorts.day30.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card data-testid="card-engagement-metrics">
                      <CardHeader>
                        <CardTitle>Engagement Metrics</CardTitle>
                        <CardDescription>User interaction patterns</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-lg font-bold text-blue-600">
                              {dashboard.userActivity.avgSessionsPerUser.toFixed(1)}
                            </div>
                            <p className="text-xs text-blue-600">Avg Sessions/User</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-bold text-green-600">
                              {dashboard.userActivity.bounceRate.toFixed(1)}%
                            </div>
                            <p className="text-xs text-green-600">Bounce Rate</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : null}
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6" data-testid="content-security">
              {isLoading ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                </div>
              ) : dashboard ? (
                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card data-testid="card-threat-overview">
                      <CardHeader>
                        <CardTitle>Threat Overview</CardTitle>
                        <CardDescription>Recent security events ({timeWindow})</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {dashboard.security.recentThreats.length > 0 ? (
                          <div className="space-y-3">
                            {dashboard.security.recentThreats.map((threat, index) => (
                              <div key={index} className="flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                  <Badge variant={getSeverityColor(threat.severity)}>
                                    {threat.severity.toUpperCase()}
                                  </Badge>
                                  <span className="text-sm">{threat.type}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">{threat.count} events</div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(threat.lastOccurrence).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Shield className="h-8 w-8 mx-auto mb-2" />
                            No security threats detected
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card data-testid="card-auth-metrics">
                      <CardHeader>
                        <CardTitle>Authentication Security</CardTitle>
                        <CardDescription>Access attempt analysis</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-lg font-bold text-blue-600">
                              {formatNumber(dashboard.security.sitePasswordAttempts.total)}
                            </div>
                            <p className="text-xs text-blue-600">Total Attempts</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-lg font-bold text-green-600">
                              {dashboard.security.sitePasswordAttempts.successRate.toFixed(1)}%
                            </div>
                            <p className="text-xs text-green-600">Success Rate</p>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <div className="text-lg font-bold text-orange-600">
                              {formatNumber(dashboard.security.sitePasswordAttempts.uniqueIPs)}
                            </div>
                            <p className="text-xs text-orange-600">Unique IPs</p>
                          </div>
                          <div className="text-center p-3 bg-red-50 rounded-lg">
                            <div className="text-lg font-bold text-red-600">
                              {formatNumber(dashboard.security.authenticationFailures)}
                            </div>
                            <p className="text-xs text-red-600">Auth Failures</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card data-testid="card-suspicious-activity">
                    <CardHeader>
                      <CardTitle>Suspicious Activity Detection</CardTitle>
                      <CardDescription>Automated security monitoring results</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 border rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">
                            {formatNumber(dashboard.security.suspiciousActivity.rateLimitHits)}
                          </div>
                          <p className="text-sm text-muted-foreground">Rate Limit Hits</p>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                          <div className="text-2xl font-bold text-red-600">
                            {formatNumber(dashboard.security.suspiciousActivity.bruteForceAttempts)}
                          </div>
                          <p className="text-sm text-muted-foreground">Brute Force Attempts</p>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {formatNumber(dashboard.security.suspiciousActivity.unauthorizedEndpointAccess)}
                          </div>
                          <p className="text-sm text-muted-foreground">Unauthorized Access</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </TabsContent>

            {/* Audit Tab */}
            <TabsContent value="audit" className="space-y-6" data-testid="content-audit">
              <Card data-testid="card-audit-logs">
                <CardHeader>
                  <CardTitle>System Audit Logs</CardTitle>
                  <CardDescription>Recent system events and admin actions (privacy-preserved)</CardDescription>
                </CardHeader>
                <CardContent>
                  {auditLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      ))}
                    </div>
                  ) : auditLogs?.logs && auditLogs.logs.length > 0 ? (
                    <Table data-testid="table-audit-logs">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Severity</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Actor</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.logs.map((log) => (
                          <TableRow key={log.id} data-testid={`audit-log-${log.id}`}>
                            <TableCell>
                              <Badge variant={getSeverityColor(log.severity)}>
                                {log.severity.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{log.type}</TableCell>
                            <TableCell>{log.message}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {log.actorRole || 'system'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(log.timestamp).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2" />
                      No audit logs available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  );
}