// Assistant Icons from Figma
export const ASSISTANT_ICONS = {
  addCircle: "https://www.figma.com/api/mcp/asset/7ce3b976-eab5-4e5c-a361-c11ed41d7b29",
  mic: "https://www.figma.com/api/mcp/asset/1c86ca7b-7fee-404e-8ddb-65a098165be2",
  voice: "https://www.figma.com/api/mcp/asset/dcd05710-b053-4ba7-8654-448d02d576fb",
  // Header icons
  logo: "https://www.figma.com/api/mcp/asset/8fdc3b5d-3063-4587-90fc-7b0967920aad",
  newThread: "https://www.figma.com/api/mcp/asset/4b8cd4e2-9dc3-43f4-8347-c561e3e2ff28",
  chatHistory: "https://www.figma.com/api/mcp/asset/bcdb1db2-24f5-4295-9da7-d9b8649e8f57",
} as const;

export type AssistantIconKey = keyof typeof ASSISTANT_ICONS;
