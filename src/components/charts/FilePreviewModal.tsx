import React, { useState, useEffect, useRef } from "react";
import ReactPlayer from "react-player";
import { renderAsync } from "docx-preview";
import {
    FileImage,
    FileVideo,
    FileMusic,
    FileText,
    FileSpreadsheet,
    FileType,
    File,
    Download,
    X,
} from "lucide-react";
import { Button } from "../ui";
import { Loader } from "../ui/Loader";

interface FilePreviewModalProps {
    isVisible: boolean;
    fileUrl: string;
    fileName?: string;
    onClose: () => void;
}

const iconClass = "w-6 h-6";

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
    isVisible,
    fileUrl,
    fileName,
    onClose,
}) => {
    const [fileType, setFileType] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [docLoading, setDocLoading] = useState(false);

    useEffect(() => {
        if (fileUrl && isVisible) {
            detectFileType(fileUrl);
        }
    }, [fileUrl, isVisible]);

    const docContainerRef = useRef<HTMLDivElement | null>(null);
    const [csvData, setCsvData] = useState<string[][] | null>(null);

    useEffect(() => {
        if (isVisible) {
            setError("");
            setCsvData(null);
            setDocLoading(false);
        }
        if (fileUrl && fileType === "csv") {
            fetch(fileUrl)
                .then((res) => res.text())
                .then((text) => {
                    const rows = text.split(/\r?\n/).filter(Boolean);
                    const data = rows.map((row) => row.split(","));
                    setCsvData(data);
                })
                .catch(() => setError("Unable to load CSV"));
        }
    }, [fileUrl, fileType, isVisible]);

    useEffect(() => {
        let pollTimer: ReturnType<typeof setTimeout> | null = null;
        function tryRenderDocx() {
            if (fileUrl && fileType === "docx" && isVisible && docContainerRef.current) {
                setDocLoading(true);
                const container = docContainerRef.current;
                container.innerHTML = "";
                fetch(fileUrl)
                    .then((res) => {
                        if (!res.ok) {
                            throw new Error(`HTTP error! status: ${res.status}`);
                        }
                        return res.arrayBuffer();
                    })
                    .then(async (arrayBuffer) => {
                        const currentContainer = docContainerRef.current;
                        if (!currentContainer) return;
                        try {
                            currentContainer.innerHTML = "";
                            await renderAsync(arrayBuffer, currentContainer, undefined, {
                                inWrapper: true,
                                ignoreWidth: false,
                                ignoreHeight: false,
                                breakPages: true,
                                ignoreLastRenderedPageBreak: false,
                            });
                            setDocLoading(false);
                        } catch {
                            setError("Unable to render DOCX file");
                            setDocLoading(false);
                        }
                    })
                    .catch(() => {
                        setError("Unable to load DOCX file");
                        setDocLoading(false);
                    });
            } else if (fileUrl && fileType === "docx" && isVisible) {
                pollTimer = setTimeout(tryRenderDocx, 30);
            }
        }
        tryRenderDocx();
        return () => {
            if (pollTimer) clearTimeout(pollTimer);
        };
    }, [fileUrl, fileType, isVisible]);

    useEffect(() => {
        return () => {
            if (docContainerRef.current) {
                docContainerRef.current.innerHTML = "";
            }
            setDocLoading(false);
            setError("");
        };
    }, [isVisible]);

    const detectFileType = (url: string) => {
        const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase() || "";
        setFileType(ext);
    };

    const getFileIcon = (type: string) => {
        const t = type.toLowerCase();
        if (["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(t)) {
            return <FileImage className={iconClass} style={{ color: "#22c55e" }} />;
        }
        if (["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"].includes(t)) {
            return <FileVideo className={iconClass} style={{ color: "#a855f7" }} />;
        }
        if (["mp3", "wav", "flac", "aac", "ogg", "wma", "m4a"].includes(t)) {
            return <FileMusic className={iconClass} style={{ color: "#f97316" }} />;
        }
        if (t === "pdf") {
            return <FileText className={iconClass} style={{ color: "#ef4444" }} />;
        }
        if (["doc", "docx"].includes(t)) {
            return <FileType className={iconClass} style={{ color: "#2563eb" }} />;
        }
        if (["xls", "xlsx"].includes(t)) {
            return <FileSpreadsheet className={iconClass} style={{ color: "#22c55e" }} />;
        }
        if (["txt", "rtf", "md", "json", "xml", "html", "css", "js"].includes(t)) {
            return <FileText className={iconClass} style={{ color: "#06b6d4" }} />;
        }
        return <File className={iconClass} style={{ color: "#64748b" }} />;
    };

    const isImage = (type: string) =>
        ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(type.toLowerCase());
    const isVideo = (type: string) =>
        ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"].includes(type.toLowerCase());
    const isAudio = (type: string) =>
        ["mp3", "wav", "flac", "aac", "ogg", "wma", "m4a"].includes(type.toLowerCase());
    const isPDF = (type: string) => type.toLowerCase() === "pdf";
    const isDocument = (type: string) =>
        ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(type.toLowerCase());
    const isText = (type: string) =>
        ["txt", "rtf", "md", "json", "xml", "html", "css", "js", "jsx", "ts", "tsx", "py", "java", "cpp", "c"].includes(
            type.toLowerCase()
        );

    const displayName = fileName || fileUrl.split("/").pop()?.split("?")[0] || "File Preview";

    const handleDownload = () => {
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = fileName || "download";
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderPreviewContent = () => {
        if (!fileType && fileUrl) {
            return (
                <div className="flex justify-center items-center h-96 gap-3">
                    <Loader size="lg" message="Loading preview..." />
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col justify-center items-center h-96 text-center">
                    <File className="w-16 h-16 text-[#E8E8E3] mb-4" />
                    <p className="text-[14px] text-[#556179]">{error}</p>
                    <Button variant="primary" onClick={handleDownload} className="mt-4 inline-flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Download File
                    </Button>
                </div>
            );
        }

        if (isImage(fileType)) {
            return (
                <div className="flex items-center justify-center w-full h-full">
                    <img
                        src={fileUrl}
                        alt={displayName}
                        className="h-full w-auto mx-auto object-contain"
                        onError={() => setError("Unable to load image")}
                    />
                </div>
            );
        }

        if (isVideo(fileType)) {
            return (
                <div className="flex items-center justify-center w-full h-full">
                    <div className="w-full h-full aspect-video">
                        <ReactPlayer
                            src={fileUrl}
                            controls
                            width="100%"
                            height="100%"
                            className="!w-full !h-full"
                            config={{
                                html: {
                                    attributes: { controlsList: "nodownload" },
                                },
                            }}
                            onError={() => setError("Unable to load video")}
                        />
                    </div>
                </div>
            );
        }

        if (isAudio(fileType)) {
            return (
                <div className="text-center">
                    <div className="mb-4">
                        <FileMusic className="w-16 h-16 mx-auto text-[#f97316]" />
                    </div>
                    <audio controls className="w-full">
                        <source src={fileUrl} />
                        Your browser does not support the audio element.
                    </audio>
                </div>
            );
        }

        if (isPDF(fileType)) {
            return (
                <div className="h-full">
                    <iframe
                        src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                        className="w-full h-full border border-[#E8E8E3] rounded-lg"
                        title="PDF Preview"
                        onError={() => setError("Unable to load PDF")}
                    />
                </div>
            );
        }

        if (isText(fileType)) {
            return (
                <div className="flex items-center justify-center w-full h-full">
                    <iframe
                        src={fileUrl}
                        className="w-full h-full border border-[#E8E8E3] rounded-lg bg-white"
                        title="Text Preview"
                        onError={() => setError("Unable to load text file")}
                    />
                </div>
            );
        }

        if (isDocument(fileType)) {
            return (
                <>
                    {fileType === "docx" ? (
                        <div className="relative h-full">
                            {docLoading && (
                                <div className="absolute inset-0 flex justify-center items-center bg-white/80 z-10">
                                    <Loader size="lg" message="Loading document..." />
                                </div>
                            )}
                            {error && (
                                <div className="absolute inset-0 flex flex-col justify-center items-center bg-white/80 z-10 text-center">
                                    <File className="w-16 h-16 text-[#E8E8E3] mb-4" />
                                    <p className="text-[14px] text-[#556179]">Unable to load document</p>
                                </div>
                            )}
                            <div
                                ref={docContainerRef}
                                className="h-full border border-[#E8E8E3] rounded-lg bg-white overflow-auto"
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center w-full h-full">
                            <iframe
                                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
                                className="w-full h-full border border-[#E8E8E3] rounded-lg bg-white"
                                title="Document Preview"
                                onError={() => setError("Unable to load document")}
                            />
                        </div>
                    )}
                </>
            );
        }

        if (fileType === "csv") {
            if (csvData) {
                const headers = csvData[0];
                const rows = csvData.slice(1);
                return (
                    <div className="overflow-auto max-h-[60vh] w-full">
                        <table className="min-w-full border border-[#E8E8E3] text-[14px]">
                            <thead>
                                <tr className="bg-[#F0F0ED]">
                                    {headers.map((h, i) => (
                                        <th
                                            key={i}
                                            className="border border-[#E8E8E3] px-4 py-2 text-left font-medium text-[#072929]"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, ri) => (
                                    <tr key={ri} className="hover:bg-gray-50">
                                        {row.map((cell, ci) => (
                                            <td
                                                key={ci}
                                                className="border border-[#E8E8E3] px-4 py-2 text-[#556179]"
                                            >
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            }
            return (
                <div className="flex justify-center items-center h-64">
                    <Loader size="md" message="Loading CSV..." />
                </div>
            );
        }

        return (
            <div className="flex flex-col justify-center items-center h-96 text-center">
                {getFileIcon(fileType)}
                <p className="mt-4 text-lg font-medium text-[#072929]">{displayName}</p>
                <p className="mt-2 text-[14px] text-[#556179]">Preview not available for this file type</p>
                <Button variant="primary" onClick={handleDownload} className="mt-4 inline-flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download File
                </Button>
            </div>
        );
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60"
                onClick={onClose}
                aria-hidden
            />
            <div
                className="relative bg-white rounded-xl shadow-2xl w-full max-w-[100vw] max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col"
                style={{ height: "calc(100vh - 2rem)" }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8E3] shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        {getFileIcon(fileType)}
                        <span className="text-[18px] font-semibold text-[#072929] truncate">
                            {displayName}
                        </span>
                        {fileType && (
                            <span className="shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-[#136D6D]/10 text-[#136D6D]">
                                {fileType.toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={handleDownload}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Download file"
                            aria-label="Download file"
                        >
                            <Download className="w-5 h-5 text-[#556179]" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5 text-[#556179]" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4 min-h-0">
                    {renderPreviewContent()}
                </div>
            </div>
        </div>
    );
};

export default FilePreviewModal;
