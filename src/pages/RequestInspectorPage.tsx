import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Info,
  Key,
  RefreshCw,
  Search,
  Shield,
  Terminal,
  Upload,
  Zap,
  Clock,
  Ban,
  Gauge,
  Crown,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiLogDetail } from "@/hooks/useApiKeys";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tryParseJson(str: string): any {
  try { return JSON.parse(str); } catch { return str; }
}

function hasVisiblePayload(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function formatDateTime(value?: string) {
  if (!value) return "N/A";
  try {
    return format(new Date(value), "MMM dd, yyyy 'at' HH:mm:ss");
  } catch {
    return value;
  }
}

function copyText(value: string, label = "Copied") {
  navigator.clipboard.writeText(value);
  toast.success(label);
}

export default function RequestInspectorPage() {
  const { logId } = useParams<{ logId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { data: fetchedLog, isLoading, error, refetch, isFetching } = useApiLogDetail(logId || null);
  const [activeTab, setActiveTab] = useState("overview");

  const routeLog = ((location.state as { log?: any } | null)?.log ?? null) as any;
  const cachedLog = useMemo(() => {
    if (!logId) return null;
    const queries = queryClient.getQueriesData({ queryKey: ["api-usage-stats"] });

    for (const [, data] of queries) {
      const recentLogs = (data as { recentLogs?: any[] } | undefined)?.recentLogs;
      const match = recentLogs?.find((item) => item?.id === logId);
      if (match) return match;
    }

    return null;
  }, [logId, queryClient]);

  const log = fetchedLog ?? routeLog ?? cachedLog;
  const isSummaryFallback = !fetchedLog && !!log;
  const isDetailPending = !fetchedLog && isFetching && !!log;

  const tabs = useMemo(() => {
    const t = [
      { id: "overview", label: "Overview", icon: Info },
      { id: "request", label: "Request", icon: Upload },
      { id: "response", label: "Response", icon: Download },
    ];
    if (log?.file_metadata) t.push({ id: "file", label: "File", icon: FileText });
    if (log?.ai_metadata) t.push({ id: "ai", label: "AI", icon: Cpu });
    if (log?.error_message || (log?.status_code && log.status_code >= 400)) t.push({ id: "errors", label: "Errors", icon: AlertTriangle });
    return t;
  }, [log]);

  if (isLoading && !log) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
          <div className="max-w-4xl mx-auto px-3 md:px-6 flex items-center gap-3 h-14">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-secondary"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></button>
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-3 md:px-6 py-6 space-y-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
          <div className="max-w-5xl mx-auto px-3 md:px-6 flex items-center gap-3 h-14">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <Terminal className="w-4 h-4 text-primary shrink-0" />
              <span className="font-bold text-foreground text-sm truncate">Request Inspector</span>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-16">
          <div className="border-y md:border border-border/60 bg-background p-5 md:p-7 space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Inspector status</p>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">No log available for this request</h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                The request ID could not be loaded from the database or it is no longer visible to the current account. Retry once, or return to the Request Logs list and open another entry.
              </p>
            </div>

            <div className="space-y-3 border-t border-border/60 pt-5 text-sm">
              <InspectorLine label="Request ID" value={logId || "Unknown"} mono />
              <InspectorLine label="Reason" value={error instanceof Error ? error.message : "The log was not returned by the backend."} />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => refetch()} disabled={isFetching} className="gap-2">
                <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} /> Retry
              </Button>
              <Button variant="outline" onClick={() => navigate("/developer")}>Back to Request Logs</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusToneClass = log.status_code < 400 ? "text-primary" : "text-destructive";
  const responsePreview = log.response_body ? tryParseJson(log.response_body) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-6xl mx-auto px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-3 h-14">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Terminal className="w-4 h-4 text-primary shrink-0" />
              <span className="font-bold text-foreground text-sm truncate">Request Inspector</span>
            </div>
            <Badge variant={log.status_code < 400 ? "default" : "destructive"} className="text-[10px] font-mono shrink-0">
              {log.status_code}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="border-y md:border border-border/60 bg-background">
          <div className="p-4 md:p-6 space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="uppercase tracking-[0.2em] font-semibold">Request summary</span>
                {isSummaryFallback && <Badge variant="outline">Showing cached summary</Badge>}
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold font-mono text-foreground">{log.method}</span>
                    <span className={cn("text-sm font-semibold font-mono", statusToneClass)}>{log.status_code}</span>
                  </div>
                  <h1 className="text-lg md:text-2xl font-bold text-foreground break-all">{log.endpoint}</h1>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                    This inspector shows the exact request route, runtime timing, payload visibility, and backend output for this log entry. Use the sections below to audit what was sent, what was returned, and whether any errors or missing fields need attention.
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Logged on <span className="text-foreground font-medium">{formatDateTime(log.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4 border-t border-border/60 pt-5">
              <SummaryStat label="Response time" value={`${log.response_time_ms ?? 0}ms`} />
              <SummaryStat label="Request size" value={formatBytes(log.request_size || 0)} />
              <SummaryStat label="Response size" value={formatBytes(log.response_size || 0)} />
               <SummaryStat label="Visibility" value={isDetailPending ? "Loading detail" : isSummaryFallback ? "Summary only" : "Full detail"} />
            </div>
          </div>
        </motion.section>

        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-20 self-start">
            <div className="border-y md:border border-border/60 bg-background">
              <div className="p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Inspector map</p>
                <div className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        document.getElementById(`section-${tab.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 border-b border-border/50 py-2 text-left text-sm last:border-b-0",
                        activeTab === tab.id ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.16em]">Open</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-y md:border border-border/60 bg-background">
              <div className="p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Quick facts</p>
                <InspectorLine label="Log ID" value={log.id || logId || "N/A"} mono />
                <InspectorLine label="API key" value={log.api_key_id ? `${log.api_key_id.slice(0, 8)}••••` : "Unavailable"} mono />
                <InspectorLine label="IP address" value={log.ip_address || "Unavailable"} mono />
                <InspectorLine label="User agent" value={log.user_agent || "Unavailable"} />
              </div>
            </div>
          </aside>

          <main className="border-y md:border border-border/60 bg-background">
            <div className="p-4 md:p-6">
              <div className="space-y-0">
                <InspectorSection id="overview" title="Overview" description="Core metadata for this request, including route, runtime, source context, and identifiers.">
                  <OverviewPanel log={log} />
                </InspectorSection>
                <InspectorSection id="request" title="Request" description="What the client sent to the backend, including headers and structured body data when available.">
                  <RequestPanel log={log} isSummaryFallback={isSummaryFallback} isDetailPending={isDetailPending} />
                </InspectorSection>
                <InspectorSection id="response" title="Response" description="What the backend returned, including status, payload preview, and response size.">
                  <ResponsePanel log={log} isSummaryFallback={isSummaryFallback} isDetailPending={isDetailPending} />
                </InspectorSection>
                {log.file_metadata && (
                  <InspectorSection id="file" title="File details" description="Extra metadata captured for file-related requests, with preview support for visual assets.">
                    <FilePanel log={log} />
                  </InspectorSection>
                )}
                {log.ai_metadata && (
                  <InspectorSection id="ai" title="AI request" description="Prompt, model, token usage, and preview output for AI-powered endpoints.">
                    <AiPanel log={log} />
                  </InspectorSection>
                )}
                {(log.error_message || (log.status_code && log.status_code >= 400) || responsePreview?.error) && (
                  <InspectorSection id="errors" title="Errors" description="Detailed error output, possible causes, recovery hints, and any stack trace captured for debugging.">
                    <ErrorPanel log={log} />
                  </InspectorSection>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {isMobile && <div className="h-24" />}
    </div>
  );
}

// === Panels ===

function OverviewPanel({ log }: { log: any }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <InspectorLine label="Status code" value={String(log.status_code)} mono />
        <InspectorLine label="HTTP method" value={log.method} mono />
        <InspectorLine label="Response time" value={`${log.response_time_ms ?? 0}ms`} mono />
        <InspectorLine label="Logged at" value={formatDateTime(log.created_at)} mono />
        <InspectorLine label="IP address" value={log.ip_address || "Unavailable"} mono />
        <InspectorLine label="API key reference" value={log.api_key_id ? `${log.api_key_id.slice(0, 8)}••••` : "Unavailable"} mono />
        <InspectorLine label="Request size" value={formatBytes(log.request_size || 0)} />
        <InspectorLine label="Response size" value={formatBytes(log.response_size || 0)} />
      </div>

      <div className="border-t border-border/60 pt-5 space-y-3">
        <InspectorLine label="Endpoint path" value={log.endpoint} mono />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => copyText(log.endpoint, "Endpoint copied")}> 
            <Copy className="w-3.5 h-3.5" /> Copy endpoint
          </Button>
          {log.id && (
            <Button size="sm" variant="outline" className="gap-2" onClick={() => copyText(log.id, "Log ID copied")}> 
              <Copy className="w-3.5 h-3.5" /> Copy log ID
            </Button>
          )}
        </div>
      </div>

      <div className="border-t border-border/60 pt-5">
        <InspectorLine label="User agent" value={log.user_agent || "Unavailable"} mono />
      </div>
    </div>
  );
}

function RequestPanel({ log, isSummaryFallback, isDetailPending }: { log: any; isSummaryFallback?: boolean; isDetailPending?: boolean }) {
  const hasHeaders = !!log.request_headers && Object.keys(log.request_headers).length > 0;
  const hasRequestBody = hasVisiblePayload(log.request_body);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <InspectorLine label="HTTP method" value={log.method || "N/A"} mono />
        <InspectorLine label="Headers captured" value={hasHeaders ? "Yes" : isDetailPending ? "Loading" : "No"} />
        <InspectorLine label="Body captured" value={hasRequestBody ? "Yes" : isDetailPending ? "Loading" : "No"} />
      </div>

      <div className="border-t border-border/60 pt-5 space-y-5">
      {isSummaryFallback && isDetailPending && !hasHeaders && !hasRequestBody && (
        <EmptyState
          icon={RefreshCw}
          title="Loading full request payload"
          description="The inspector opened from the log list summary. Full headers and body are being loaded from the backend now."
        />
      )}

      {isSummaryFallback && !isDetailPending && !hasHeaders && !hasRequestBody && (
        <EmptyState
          icon={Info}
          title="Full request payload is not available for this entry"
          description="The inspector is currently showing a cached summary for this log. Future requests will automatically display the full payload when the detailed record is available."
        />
      )}

      {hasHeaders && (
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2">Request headers</h3>
          <JsonViewer data={log.request_headers} />
        </div>
      )}
      {hasRequestBody ? (
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2">Request body</h3>
          <JsonViewer data={typeof log.request_body === "string" ? tryParseJson(log.request_body) : log.request_body} />
        </div>
      ) : !isDetailPending ? (
        <EmptyState
          icon={Upload}
          title="No request body captured"
          description={`This ${log.method} request did not include a structured body payload, or the payload was intentionally not stored.`}
        />
      ) : null}
      </div>
    </div>
  );
}

function ResponsePanel({ log, isSummaryFallback, isDetailPending }: { log: any; isSummaryFallback?: boolean; isDetailPending?: boolean }) {
  const hasResponseBody = hasVisiblePayload(log.response_body);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <InspectorLine label="Status code" value={String(log.status_code)} mono />
        <InspectorLine label="Response time" value={`${log.response_time_ms ?? 0}ms`} mono />
        <InspectorLine label="Response size" value={formatBytes(log.response_size || 0)} />
      </div>
      <div className="border-t border-border/60 pt-4" />
      {isSummaryFallback && isDetailPending && !hasResponseBody && (
        <EmptyState
          icon={RefreshCw}
          title="Loading response payload"
          description="The detailed response body is being fetched so the inspector can show the exact output returned by the backend."
        />
      )}
      {isSummaryFallback && !isDetailPending && !hasResponseBody && (
        <EmptyState
          icon={Info}
          title="Detailed response body is not available yet"
          description="The summary row is visible, but this specific log entry did not return its stored response body to the inspector."
        />
      )}
      {hasResponseBody ? (
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2">Response body</h3>
          <JsonViewer data={tryParseJson(log.response_body)} />
        </div>
      ) : !isDetailPending ? (
        <EmptyState
          icon={Download}
          title="No response body stored"
          description="This entry does not include a response payload preview. Status, timing, and other metadata are still visible above."
        />
      ) : null}
    </div>
  );
}

function FilePanel({ log }: { log: any }) {
  const fm = log.file_metadata;
  if (!fm) return null;
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-bold text-foreground">File Information</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <InspectorLine label="File name" value={fm.file_name || "N/A"} />
        <InspectorLine label="File type" value={fm.file_type || "N/A"} mono />
        <InspectorLine label="File size" value={fm.file_size ? formatBytes(fm.file_size) : "N/A"} />
      </div>
      {fm.file_type?.startsWith("image/") && fm.file_url && (
        <>
          <div className="border-t border-border/60 pt-4" />
          <h3 className="text-sm font-bold text-foreground mb-2">Preview</h3>
          <img src={fm.file_url} alt="File preview" className="max-w-[300px] border border-border/60" />
        </>
      )}
      {fm.file_url && (
        <a href={fm.file_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
          <ExternalLink className="w-3 h-3" /> Open File
        </a>
      )}
    </div>
  );
}

function AiPanel({ log }: { log: any }) {
  const ai = log.ai_metadata;
  if (!ai) return null;
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-bold text-foreground">AI Request Details</h3>
      <div className="grid grid-cols-2 gap-4">
        <InspectorLine label="Model" value={ai.model_name || "N/A"} mono />
        <InspectorLine label="Tokens used" value={ai.usage_tokens ? String(ai.usage_tokens) : "N/A"} mono />
      </div>
      {ai.prompt && (
        <>
          <div className="border-t border-border/60 pt-4" />
          <h3 className="text-sm font-bold text-foreground mb-2">Prompt</h3>
          <pre className="p-4 bg-secondary/30 border border-border/60 text-xs font-mono text-foreground whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">
            {ai.prompt}
          </pre>
        </>
      )}
      {ai.response_preview && (
        <>
          <div className="border-t border-border/60 pt-4" />
          <h3 className="text-sm font-bold text-foreground mb-2">AI Response</h3>
          <pre className="p-4 bg-secondary/30 border border-border/60 text-xs font-mono text-foreground whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">
            {ai.response_preview}
          </pre>
        </>
      )}
    </div>
  );
}

function ErrorPanel({ log }: { log: any }) {
  const navigate = useNavigate();
  const parsedResponse = log.response_body ? tryParseJson(log.response_body) : null;
  const errorType = log.error_type || parsedResponse?.error_type || "UNKNOWN_ERROR";
  const possibleReasons = parsedResponse?.possible_reasons || [];
  const help = parsedResponse?.help || "";
  const upgradeOptions = parsedResponse?.upgrade_options || null;
  const requiredScope = parsedResponse?.required_scope || null;
  const currentScopes = parsedResponse?.current_scopes || [];
  const availableEndpoints = parsedResponse?.available_endpoints || [];
  const retryAfter = parsedResponse?.retry_after_seconds || null;
  const action = parsedResponse?.action || "";

  const errorTypeIcons: Record<string, any> = {
    MISSING_API_KEY: Key, INVALID_API_KEY: Ban, EXPIRED_API_KEY: Clock,
    RATE_LIMIT_EXCEEDED: Gauge, INSUFFICIENT_SCOPE: Shield,
    ENDPOINT_NOT_FOUND: Globe, VALIDATION_ERROR: AlertTriangle, NOT_FOUND: Search,
  };
  const errorTypeColors: Record<string, string> = {
    MISSING_API_KEY: "text-amber-500", INVALID_API_KEY: "text-destructive",
    EXPIRED_API_KEY: "text-orange-500", RATE_LIMIT_EXCEEDED: "text-amber-600",
    INSUFFICIENT_SCOPE: "text-violet-500", ENDPOINT_NOT_FOUND: "text-blue-500",
    VALIDATION_ERROR: "text-amber-500", NOT_FOUND: "text-muted-foreground",
  };

  const IconComponent = errorTypeIcons[errorType] || AlertTriangle;
  const colorClass = errorTypeColors[errorType] || "text-destructive";

  return (
    <div className="space-y-5">
      <div className="p-4 bg-destructive/5 border border-destructive/20">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 bg-destructive/10 flex items-center justify-center shrink-0">
            <IconComponent className={cn("w-5 h-5", colorClass)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="destructive" className="text-[9px] font-mono">{errorType}</Badge>
              <Badge variant="outline" className="text-[9px] font-mono">{log.status_code}</Badge>
            </div>
            <p className="text-sm font-semibold text-foreground">{log.error_message || "Request failed"}</p>
            {help && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{help}</p>}
          </div>
        </div>
      </div>

      {/* Possible Reasons */}
      {possibleReasons.length > 0 && (
        <div className="p-4 border border-border/60">
          <h4 className="text-xs font-bold text-foreground mb-2">Possible Reasons</h4>
          <ul className="space-y-2">
            {possibleReasons.map((reason: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                <span className="text-destructive font-bold mt-0.5">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scope Details */}
      {requiredScope && (
        <div className="p-4 border border-border/60">
          <h4 className="text-xs font-bold text-foreground mb-2">Scope Issue</h4>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] text-muted-foreground">Required:</span>
            <Badge className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">{requiredScope}</Badge>
          </div>
          {currentScopes.length > 0 && (
            <div>
              <span className="text-[11px] text-muted-foreground">Your scopes:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {currentScopes.map((s: string) => <Badge key={s} variant="outline" className="text-[9px]">{s}</Badge>)}
              </div>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-3">
            Go to Developer Console → API Keys → Edit permissions to add the required scope.
          </p>
        </div>
      )}

      {/* Rate Limit Upgrade */}
      {errorType === "RATE_LIMIT_EXCEEDED" && upgradeOptions && (
        <div className="p-4 border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Upgrade to {upgradeOptions.next_plan}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Increase your rate limit to {upgradeOptions.new_limit} for just {upgradeOptions.price}.
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1.5" onClick={() => navigate("/developer")}>
              <Crown className="w-3 h-3" /> Upgrade Now
            </Button>
            {retryAfter && <span className="text-[11px] text-muted-foreground">Retry after {retryAfter}s</span>}
          </div>
        </div>
      )}

      {/* Available Endpoints */}
      {availableEndpoints.length > 0 && (
        <div className="p-4 border border-border/60">
          <h4 className="text-xs font-bold text-foreground mb-2">Available Endpoints</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {availableEndpoints.map((ep: string, i: number) => (
              <code key={i} className="text-[11px] font-mono text-foreground px-2.5 py-1.5 bg-secondary/30 border border-border/60">{ep}</code>
            ))}
          </div>
        </div>
      )}

      {/* Action */}
      {action && (
        <div className="p-4 bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs font-semibold text-foreground">{action}</p>
          </div>
        </div>
      )}

      {/* Stack Trace */}
      {log.error_stack && (
        <div>
          <h4 className="text-xs font-bold text-foreground mb-2">Stack Trace</h4>
          <pre className="p-4 bg-secondary/30 border border-border/60 text-[11px] font-mono text-destructive whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">
            {log.error_stack}
          </pre>
        </div>
      )}

      {/* Full Error Response */}
      {parsedResponse && typeof parsedResponse === "object" && (
        <div>
          <h4 className="text-xs font-bold text-foreground mb-2">Full Error Response</h4>
          <JsonViewer data={parsedResponse} />
        </div>
      )}
    </div>
  );
}

// === Shared Components ===

function InspectorSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={`section-${id}`} className="border-b border-border/60 py-6 first:pt-0 last:border-b-0 last:pb-0 scroll-mt-24">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function InspectorLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={cn("text-sm text-foreground break-all leading-relaxed", mono && "font-mono text-[13px]")}>{value}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="border border-dashed border-border/60 p-5 text-center">
      <Icon className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xl mx-auto">{description}</p>
    </div>
  );
}

function JsonViewer({ data }: { data: any }) {
  const formatted = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <pre className="p-4 bg-secondary/30 border border-border/60 text-[11px] font-mono text-foreground whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto leading-relaxed">
      {formatted}
    </pre>
  );
}
