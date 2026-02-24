import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import FilePreviewModal from "../charts/FilePreviewModal";

// Custom: Detect and render [export_report](url) links from backend as downloadable report button.
const EXPORT_REPORT_LABEL = "export_report";

function getLinkText(children: React.ReactNode): string {
    if (typeof children === "string") return children.trim();
    return React.Children.toArray(children)
        .map((c) => (typeof c === "string" ? c : ""))
        .join("")
        .trim();
}

function getFileNameFromUrl(url: string): string {
    try {
        const pathname = new URL(url).pathname;
        const segment = pathname.split("/").filter(Boolean).pop();
        if (!segment) return "Download Excel report";
        
        // Pattern to match run_id (UUID format): _[uuid].extension
        const runIdPattern = /_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[^.]+)$/i;
        
        // If there's a sheet name followed by run_id, remove the run_id part
        if (runIdPattern.test(segment)) {
            const match = segment.match(runIdPattern);
            if (match) {
                const withoutRunId = segment.replace(runIdPattern, match[1]); // Keep the extension
                // Only return cleaned name if there's content before the run_id
                if (withoutRunId !== match[1]) {
                    return withoutRunId;
                }
            }
        }
        
        return segment;
    } catch {
        return "Download Excel report";
    }
}

function getFileIcon(fileName: string): React.ReactNode {
    const extension = fileName.toLowerCase().split('.').pop();
    
    switch (extension) {
        case 'xlsx':
        case 'xls':
            return (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 13L12 17L8 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 13V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            );
        case 'pdf':
            return (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 16H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            );
        case 'docx':
        case 'doc':
            return (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 16H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            );
        case 'csv':
            return (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="9" cy="13" r="1" fill="currentColor"/>
                    <circle cx="12" cy="13" r="1" fill="currentColor"/>
                    <circle cx="15" cy="13" r="1" fill="currentColor"/>
                    <circle cx="9" cy="16" r="1" fill="currentColor"/>
                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                    <circle cx="15" cy="16" r="1" fill="currentColor"/>
                </svg>
            );
        default:
            return (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            );
    }
}

interface StellarMarkDownProps {
    content: string;
    type?: "human" | "ai" | "tool" | "system";
}

export const StellarMarkDown: React.FC<StellarMarkDownProps> = ({ content, type }) => {
    const stringContent = typeof content === "string" ? content : String(content);
    const [previewFile, setPreviewFile] = useState<{ url: string; fileName: string } | null>(null);

    return (
        <>
            <FilePreviewModal
                isVisible={!!previewFile}
                fileUrl={previewFile?.url ?? ""}
                fileName={previewFile?.fileName}
                onClose={() => setPreviewFile(null)}
            />
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code:({ className, children, ...props }) => (
                        <code
                            style={{ whiteSpace: "pre-wrap" , wordBreak: "break-word"}}
                            className={`${className} ${type === "human" ? "text-white" : "text-gray-500"
                                }`}
                            {...props}
                        >
                            {children}
                        </code>
                    ),
                    p: ({ children }) => (
                        <p className="text-[14px] leading-[1.6] last:mb-0">{children}</p>
                    ),
                    ul: ({ children }) => (
                        <ul className="text-[14px] list-disc list-outside pl-5 mb-2 last:mb-0 space-y-1.5 [&_li::marker]:text-[#6b7280]">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="text-[14px] list-decimal list-outside pl-5 mb-2 last:mb-0 space-y-3 [&_li::marker]:text-[14px] [&_li::marker]:font-normal [&_li::marker]:text-[#6b7280]">
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => (
                        <li className="text-[14px] leading-[1.6] mb-0.5 last:mb-0 pl-0.5 [&>ul]:mt-2 [&>ol]:mt-2 [&>ul]:ml-4 [&>ol]:ml-4 [&>p]:mb-0.5">
                            {children}
                        </li>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote
                            className={`border-l-4 pl-4 my-2 ${type === "human" ? "border-white/30 italic" : "border-[#E8E8E3] text-[#556179] not-italic"
                                }`}
                        >
                            {children}
                        </blockquote>
                    ),
                    a: ({ href, children }) => {
                        const isExportReport =
                            href && getLinkText(children) === EXPORT_REPORT_LABEL;

                        if (isExportReport) {
                            const fileName = getFileNameFromUrl(href);
                            return (
                                <a
                                    href={href}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setPreviewFile({ url: href!, fileName });
                                    }}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f0f0eb] hover:bg-[#e8e8e3] text-[#136D6D] border border-[#e8e8e3] text-sm font-medium no-underline cursor-pointer transition-colors"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    role="button"
                                    aria-label={`Download ${fileName}`}
                                >
                                    {getFileIcon(fileName)}
                                    {fileName}
                                </a>
                            );
                        }

                        return (
                            <a
                                href={href}
                                className={`${type === "human" ? "text-blue-500 underline" : "text-blue-500"
                                    } hover:opacity-80 cursor-pointer`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {children}
                            </a>
                        );
                    },
                    h1: ({ children }) => (
                        <h1 className="text-2xl font-bold my-2">{children}</h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-xl font-bold my-2">{children}</h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-lg font-bold my-2">{children}</h3>
                    ),
                    h4: ({ children }) => (
                        <h4 className="text-base font-bold my-2">{children}</h4>
                    ),
                    h5: ({ children }) => (
                        <h5 className="text-sm font-bold my-2">{children}</h5>
                    ),
                    h6: ({ children }) => (
                        <h6 className="text-xs font-bold my-2">{children}</h6>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-bold">{children}</strong>
                    ),
                    em: ({ children }) => <em className="italic">{children}</em>,
                    del: ({ children }) => (
                        <del className="line-through">{children}</del>
                    ),
                    table: ({ children }) => (
                        <div className="overflow-x-auto w-full max-w-full my-3 rounded-lg border border-[#E8E8E3] shadow-sm">
                            <table className="assistant-table w-full min-w-full border-collapse text-[14px]">
                                {children}
                            </table>
                        </div>
                    ),
                    th: ({ children }) => (
                        <th className="assistant-table-th">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="assistant-table-td">
                            {children}
                        </td>
                    ),
                }}
            >
                {stringContent}
            </ReactMarkdown>
        </>
    )
}

export default StellarMarkDown;