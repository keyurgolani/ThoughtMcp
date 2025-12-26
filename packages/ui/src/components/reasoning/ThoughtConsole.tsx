import { ArrowDownCircle, Copy, Terminal } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface ThoughtConsoleProps {
  sessionId?: string | undefined;
  isProcessing: boolean;
  className?: string;
  onClose?: () => void;
  onComplete?: (data: unknown) => void;
}

type StreamType = "analytical" | "creative" | "critical" | "synthetic";
type LogType = "token" | "system" | "error";

interface LogEntry {
  id: string;
  timestamp: string;
  streamType: StreamType | "system";
  content: string;
  type: LogType;
}

interface StreamMessage {
  type: "connected" | "token" | "error" | "complete";
  streamType?: StreamType;
  content?: string;
}

const getStreamColor = (type: StreamType | "system"): string => {
  switch (type) {
    case "analytical":
      return "text-blue-400";
    case "creative":
      return "text-purple-400";
    case "critical":
      return "text-orange-400";
    case "synthetic":
      return "text-green-400";
    case "system":
      return "text-gray-400";
    default:
      return "text-gray-300";
  }
};

export const ThoughtConsole: React.FC<ThoughtConsoleProps> = ({
  sessionId,
  isProcessing,
  className = "",
  onComplete,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<StreamType | "all">("all");
  const [buffers, setBuffers] = useState<Record<StreamType, string>>({
    analytical: "",
    creative: "",
    critical: "",
    synthetic: "",
  });
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && autoScroll) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, buffers, activeTab, autoScroll]);

  // Handle SSE Connection
  useEffect(() => {
    if (sessionId === undefined || sessionId === "" || !isProcessing) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const startStream = (): void => {
      // Close existing
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      console.log(`Connecting to Thought Stream: /api/v1/reasoning/live/${sessionId}`);
      const es = new EventSource(`/api/v1/reasoning/live/${sessionId}`);
      eventSourceRef.current = es;

      es.addEventListener("session_completed", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as unknown;
          console.log("Session Completed in Stream:", data);
          if (onComplete) {
            onComplete(data);
          }
          es.close();
        } catch (err) {
          console.error("Error parsing completion data", err);
        }
      });

      es.addEventListener("session_error", (event: MessageEvent) => {
        console.error("Session Error:", event.data);
        setLogs((prev) => [
          ...prev,
          {
            id: `err-${Date.now().toString()}`,
            timestamp: new Date().toLocaleTimeString(),
            streamType: "system",
            content: `Error: ${String(event.data as unknown)}`,
            type: "error",
          },
        ]);
        es.close();
      });

      es.onmessage = (event): void => {
        try {
          const data = JSON.parse(event.data as string) as StreamMessage;

          if (data.type === "connected") {
            setLogs((prev) => [
              ...prev,
              {
                id: `sys-${Date.now().toString()}`,
                timestamp: new Date().toLocaleTimeString(),
                streamType: "system",
                content: "[System] Connected to thought stream...",
                type: "system",
              },
            ]);
          } else if (data.type === "token") {
            const streamType = data.streamType ?? "analytical";
            const token = data.content ?? "";

            setBuffers((prev) => ({
              ...prev,
              [streamType]: prev[streamType] + token,
            }));
          }
        } catch (err) {
          console.error("Error parsing stream data", err);
        }
      };

      es.onerror = (err): void => {
        console.error("Stream connection error", err);
        es.close();
      };
    };

    startStream();

    return (): void => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [sessionId, isProcessing, onComplete]);

  const copyToClipboard = (): void => {
    const text =
      activeTab === "all"
        ? Object.entries(buffers)
            .map(([k, v]) => `--- ${k.toUpperCase()} ---\n${v}`)
            .join("\n\n")
        : buffers[activeTab];
    void navigator.clipboard.writeText(text);
  };

  const tabs: Array<StreamType | "all"> = [
    "all",
    "analytical",
    "creative",
    "critical",
    "synthetic",
  ];

  const CodeBlock: Components["code"] = ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className ?? "");
    const isInline = match === null;
    return isInline ? (
      <code className="bg-gray-800/50 px-1 py-0.5 rounded text-yellow-300/90" {...props}>
        {children}
      </code>
    ) : (
      <code
        className="block bg-gray-900 p-2 rounded my-1 text-xs overflow-x-auto text-blue-200"
        {...props}
      >
        {children}
      </code>
    );
  };

  return (
    <div
      className={`flex flex-col h-96 min-h-[300px] md:min-h-[400px] bg-[#0f1115] border border-gray-800 rounded-lg overflow-hidden font-mono text-xs ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1a1d23] border-b border-gray-800">
        <div className="flex items-center gap-2 text-gray-400">
          <Terminal size={14} />
          <span className="font-semibold text-gray-300">Thought Console</span>
          {isProcessing && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-900/30 text-green-400 rounded text-[10px] animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setAutoScroll(!autoScroll);
            }}
            className={`p-1 rounded transition-colors ${autoScroll ? "text-blue-400 bg-blue-900/30" : "text-gray-500 hover:text-gray-300"}`}
            title={autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
          >
            <ArrowDownCircle size={14} />
          </button>
          <button
            onClick={copyToClipboard}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title="Copy log"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#13161a] border-b border-gray-800 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
            }}
            className={`px-3 py-1.5 border-r border-gray-800 hover:bg-[#1a1d23] transition-colors whitespace-nowrap
               ${activeTab === tab ? "text-blue-400 bg-[#1a1d23]" : "text-gray-500"}
             `}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Terminal Output */}
      <div
        ref={scrollRef}
        className="flex-1 p-3 overflow-y-auto space-y-2 text-gray-300 scroll-smooth"
        onScroll={(e) => {
          // Optional: disable auto-scroll if user scrolls up manually
          const target = e.currentTarget;
          if (autoScroll && target.scrollHeight - target.scrollTop - target.clientHeight > 50) {
            setAutoScroll(false);
          }
        }}
      >
        {activeTab === "all" ? (
          logs.map((log) => (
            <div
              key={log.id}
              className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-words border-b border-gray-800/50 pb-1 last:border-0"
            >
              <span className="text-gray-500 opacity-50 mr-2">[{log.timestamp}]</span>
              <span
                className={`${getStreamColor(log.streamType === "system" ? "analytical" : log.streamType)} mr-2 font-bold`}
              >
                [{log.streamType.toUpperCase()}]
              </span>
              <div className="inline-block align-top max-w-full">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <span className="inline">{children}</span>,
                    code: CodeBlock,
                  }}
                >
                  {log.content}
                </ReactMarkdown>
              </div>
            </div>
          ))
        ) : (
          <div className="font-mono text-xs leading-relaxed max-w-full">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: CodeBlock,
              }}
            >
              {buffers[activeTab]}
            </ReactMarkdown>
            {(isProcessing || buffers[activeTab].length === 0) && (
              <span className="animate-pulse inline-block w-1.5 h-3 bg-blue-400 ml-1 translate-y-[2px]"></span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
