
import type {  ThreadMessageContent } from "../services/ai/threads";

// Helper function to check if content is a string
export const isStringContent = (content: ThreadMessageContent): content is string => {
  return typeof content === "string";
};