/**
 * Version utility that provides centralized version management
 * All version references should use this utility instead of hardcoded strings
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache for the version to avoid repeated file reads
let cachedVersion: string | null = null;

/**
 * Get the current package version from package.json
 * @returns The version string from package.json
 */
export function getVersion(): string {
  if (cachedVersion !== null) {
    return cachedVersion;
  }

  try {
    // Navigate up to the project root and read package.json
    const packageJsonPath = join(__dirname, "../../package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

    if (!packageJson.version || typeof packageJson.version !== "string") {
      throw new Error("Invalid or missing version in package.json");
    }

    cachedVersion = packageJson.version;
    return cachedVersion as string;
  } catch (error) {
    console.error("Failed to read version from package.json:", error);
    // Fallback version - should never be used in production
    return "0.0.0";
  }
}

/**
 * Get version info with additional metadata
 * @returns Object containing version and metadata
 */
export function getVersionInfo(): {
  version: string;
  major: number;
  minor: number;
  patch: number;
  isPrerelease: boolean;
} {
  const version = getVersion();
  const parts = version.split(".");

  return {
    version,
    major: parseInt(parts[0] ?? "0", 10),
    minor: parseInt(parts[1] ?? "0", 10),
    patch: parseInt(parts[2] ?? "0", 10),
    isPrerelease: version.includes("-") ?? version.includes("+"),
  };
}

/**
 * Clear the version cache (useful for testing)
 */
export function clearVersionCache(): void {
  cachedVersion = null;
}
