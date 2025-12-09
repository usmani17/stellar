import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge to handle conflicts
 * 
 * @param inputs - Class values (strings, objects, arrays, etc.)
 * @returns Merged class string
 * 
 * @example
 * cn("px-2 py-1", "bg-red-500", isActive && "bg-blue-500")
 * cn("px-2", { "bg-red-500": isActive })
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

