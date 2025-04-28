/**
 * Simple logger that works in both browser and server environments
 * without any external dependencies
 */
export const logger = {
  info: (...args: any[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[INFO]", ...args)
    }
  },
  error: (...args: any[]) => {
    console.error("[ERROR]", ...args)
  },
  warn: (...args: any[]) => {
    console.warn("[WARN]", ...args)
  },
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[DEBUG]", ...args)
    }
  },
}
