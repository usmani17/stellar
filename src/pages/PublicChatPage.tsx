import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, ChevronDown, Wrench, Clock, MessageCircle, Copy, Check } from "lucide-react";
import { getSharedChat, type SharedChatResponse, type SharedThreadTurn } from "../services/ai/chatShare";
import { ContentWithCharts } from "../components/ai/ContentWithCharts";
import { MessageContent } from "../components/ai/MessageContent";
import StellarLogo from "../assets/images/steller-logo-mini.svg";

type LoadState = "loading" | "error" | "ready";

function SessionIdCopy({ sessionId }: { sessionId: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(sessionId).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <div className="flex items-center gap-2 bg-sandstorm-s0 border border-sandstorm-s40 rounded-lg px-3 py-1.5 w-full min-w-0">
            <span className="text-[9px] text-forest-f30 uppercase tracking-wide shrink-0">Session ID</span>
            <span className="text-[10px] font-mono text-forest-f60 select-all flex-1 whitespace-nowrap overflow-x-auto">{sessionId}</span>
            <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 text-forest-f30 hover:text-forest-f40 transition-colors ml-1"
                aria-label="Copy session ID"
                title="Copy session ID"
            >
                {copied ? <Check className="w-3 h-3 text-forest-f40" /> : <Copy className="w-3 h-3" />}
            </button>
        </div>
    );
}

function ToolsUsed({ tools }: { tools: string[] }) {
    const [open, setOpen] = useState(false);
    if (!tools.length) return null;
    return (
        <div className="w-full">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] text-forest-f30 hover:text-forest-f40 transition-colors"
            >
                <Wrench className="w-3 h-3 shrink-0" />
                <span>{tools.length} tool{tools.length !== 1 ? "s" : ""} used</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <ul className="mt-2 flex flex-col gap-1 pl-4 border-l-2 border-sandstorm-s40">
                    {tools.map((label, i) => (
                        <li key={i} className="text-[11px] text-forest-f30 font-mono truncate">{label}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function ThreadTurn({ turn }: { turn: SharedThreadTurn }) {
    const durationSec = turn.duration_ms != null ? (turn.duration_ms / 1000).toFixed(1) : null;

    return (
        <div className="flex flex-col gap-4">
            {/* User query */}
            <div className="flex justify-end">
                <div className="max-w-[80%] min-w-0 px-4 py-3 bg-[#E8E8E3] rounded-xl shadow-sm">
                    <div className="text-[14px] text-forest-f60 leading-relaxed" style={{ fontFamily: "'GT America Trial', sans-serif" }}>
                        <MessageContent content={turn.user_query} />
                    </div>
                </div>
            </div>

            {/* Assistant response */}
            <div className="flex justify-start">
                <div className="min-w-0 w-full flex flex-col gap-3 px-4 py-4 bg-[#F9F9F6] border border-[#E8E8E3] rounded-xl shadow-sm">
                    {/* Tools used (collapsible) */}
                    <ToolsUsed tools={turn.tools} />

                    {/* Final answer */}
                    {turn.final_text ? (
                        <div className="assistant-message-content w-full" style={{ fontFamily: "'GT America Trial', sans-serif" }}>
                            <ContentWithCharts content={turn.final_text} type="ai" />
                        </div>
                    ) : (
                        <p className="text-sm text-forest-f30 italic">No response recorded.</p>
                    )}

                    {/* Footer: thread ID + duration */}
                    <div className="flex items-center justify-between pt-2 border-t border-sandstorm-s40 mt-1">
                        <span className="text-[10px] font-mono text-forest-f30 select-all" title={`Thread ID: ${turn.id}`}>
                            Thread: {turn.id}
                        </span>
                        {durationSec && (
                            <span className="flex items-center gap-1 text-[10px] text-forest-f30">
                                <Clock className="w-3 h-3" />
                                {durationSec}s
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function PublicChatPage() {
    const { token } = useParams<{ token: string }>();
    const [loadState, setLoadState] = useState<LoadState>("loading");
    const [data, setData] = useState<SharedChatResponse | null>(null);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        if (!token) {
            setErrorMsg("Invalid share link.");
            setLoadState("error");
            return;
        }
        getSharedChat(token)
            .then((res) => {
                setData(res);
                setLoadState("ready");
            })
            .catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : "Unknown error";
                setErrorMsg(
                    msg.includes("404")
                        ? "This share link has expired or been revoked."
                        : "Failed to load conversation. Please try again later."
                );
                setLoadState("error");
            });
    }, [token]);

    const sessionTitle = data?.session?.title || "Shared conversation";

    return (
        <div className="min-h-screen bg-gradient-to-br from-sandstorm-s0 via-sandstorm-s5 to-[#f0f0eb]">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-sandstorm-s40/60">
                <div className="max-w-5xl mx-auto px-6 py-3 flex flex-col gap-2">
                    {/* Row 1: logo + title */}
                    <div className="flex items-center gap-3 min-w-0">
                        <img src={StellarLogo} alt="Stellar" className="h-8 w-8 shrink-0" />
                        <div className="min-w-0">
                            <h1 className="text-lg font-semibold text-forest-f60 leading-tight font-agrandir">
                                {loadState === "ready" ? sessionTitle : "Shared conversation"}
                            </h1>
                            <p className="text-[11px] text-forest-f30">
                                Shared via Stellar
                                {data?.thread_id ? " · Single response" : data?.history?.length ? ` · ${data.history.length} turn${data.history.length !== 1 ? "s" : ""}` : ""}
                            </p>
                        </div>
                    </div>
                    {/* Row 2: session ID pill — full width, never overlaps title */}
                    {data?.session_id && (
                        <SessionIdCopy sessionId={data.session_id} />
                    )}
                </div>
            </header>

            {/* Body */}
            <main className="max-w-5xl mx-auto px-6 py-8">
                {loadState === "loading" && (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="flex gap-1.5">
                            <span className="w-2.5 h-2.5 bg-forest-f40/60 rounded-full animate-bounce" />
                            <span className="w-2.5 h-2.5 bg-forest-f40/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                            <span className="w-2.5 h-2.5 bg-forest-f40/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        </div>
                        <p className="text-sm text-forest-f30">Loading conversation…</p>
                    </div>
                )}

                {loadState === "error" && (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <AlertCircle className="w-10 h-10 text-red-r30" />
                        <p className="text-sm text-forest-f60 text-center max-w-sm">{errorMsg}</p>
                    </div>
                )}

                {loadState === "ready" && data && (
                    <>
                        {/* Session metadata bar */}
                        {data.session && data.session.created_at && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-6 text-[11px] text-forest-f30">
                                <span>Started: <span className="font-medium text-forest-f60">{new Date(data.session.created_at).toLocaleString()}</span></span>
                            </div>
                        )}

                        {data.history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-3">
                                <MessageCircle className="w-10 h-10 text-forest-f30" />
                                <p className="text-sm text-forest-f30">No messages in this conversation yet.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-10">
                                {data.history.map((turn) => (
                                    <ThreadTurn key={turn.id} turn={turn} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Footer */}
            <footer className="max-w-5xl mx-auto px-6 py-8 text-center">
                <p className="text-[11px] text-forest-f30">
                    Powered by{" "}
                    <a href="/" className="text-forest-f40 hover:underline font-medium">
                        Stellar
                    </a>
                </p>
            </footer>
        </div>
    );
}
