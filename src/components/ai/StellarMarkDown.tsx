import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface StellarMarkDownProps {
    content: string;
    type?: "human" | "ai" | "tool" | "system";
}

export const StellarMarkDown: React.FC<StellarMarkDownProps> = ({ content, type }) => {
    // Ensure content is always a string
    const stringContent = typeof content === "string" ? content : String(content);

    return (
        <>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code:({ className, children, ...props }) => (
                        <code
                            className={`${className} ${type === "human" ? "text-white" : "text-gray500"
                                }`}
                            {...props}
                        >
                            {children}
                        </code>
                    ),
                    p: ({ children }) => (
                        <p className="text-sm last:mb-0">{children}</p>
                    ),
                    ul: ({ children }) => (
                        <ul className="text-sm list-disc pl-5 mb-2 last:mb-0">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="text-sm list-decimal pl-5 mb-2 last:mb-0">
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => (
                        <li className="text-sm mb-1 last:mb-0">{children}</li>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote
                            className={`border-l-4 ${type === "human" ? "border-white/30" : "border-gray-300"
                                } pl-4 italic my-2`}
                        >
                            {children}
                        </blockquote>
                    ),
                    a: ({ href, children }) => {

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
                        <div className="overflow-x-auto max-w-[490px]">
                            <table className="min-w-full my-2 border border-gray">{children}</table>
                        </div>
                    ),
                    th: ({ children }) => <th className="border border-gray px-4 py-2">{children}</th>,
                    td: ({ children }) => <td className="border border-gray px-4 py-2">{children}</td>,
                }}
            >
                {stringContent}
            </ReactMarkdown>
        </>
    )
}

export default StellarMarkDown;