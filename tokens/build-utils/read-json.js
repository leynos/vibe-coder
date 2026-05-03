import fs from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Read and parse a JSON file from a URL.
 * @param {URL} url - File URL to read.
 * @returns {unknown} Parsed JSON content.
 */
export function readJson(url) {
  const filePath = fileURLToPath(url);
  const content = fs.readFileSync(filePath, "utf8");
  return JSON.parse(content);
}
