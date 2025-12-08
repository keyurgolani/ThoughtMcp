/**
 * Property Test: Docker Compose Single Source of Truth
 *
 * **Feature: auto-test-containers, Property 1: Docker Compose Single Source of Truth**
 *
 * This property test validates that Docker Compose files are the single source of truth
 * for container configuration. All configurable values must use environment variable
 * substitution (${VAR:-default} syntax) instead of hardcoded values.
 *
 * **Validates: Requirements 15.5, 17.2**
 *
 * - Requirement 15.5: WHEN any Docker Compose file is used THEN the file SHALL reference
 *   environment variables from .env files instead of hardcoded values
 * - Requirement 17.2: WHEN Docker Compose files reference configuration values THEN the
 *   files SHALL use environment variable substitution from .env files
 *
 * @module __tests__/property/containers/compose-single-source.property.test
 */

import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";

/**
 * Patterns that indicate hardcoded values (violations).
 * These patterns should NOT appear in Docker Compose files.
 */
const HARDCODED_PATTERNS = {
  // Hardcoded port mappings without env var substitution
  hardcodedPort: /^\s*-\s*"\d+:\d+"$/m,
  // Hardcoded database credentials (not using ${VAR:-default})
  hardcodedDbUser: /POSTGRES_USER:\s*[a-zA-Z_][a-zA-Z0-9_]*\s*$/m,
  hardcodedDbPassword: /POSTGRES_PASSWORD:\s*[a-zA-Z_][a-zA-Z0-9_]*\s*$/m,
  hardcodedDbName: /POSTGRES_DB:\s*[a-zA-Z_][a-zA-Z0-9_]*\s*$/m,
};

/**
 * Docker Compose files that should be validated.
 */
const COMPOSE_FILES = [
  "docker-compose.test.yml",
  "docker-compose.dev.yml",
  "docker-compose.prod.yml",
];

/**
 * Reads a Docker Compose file and returns its content.
 */
function readComposeFile(filename: string): string {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Docker Compose file not found: ${filename}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Extracts all port mappings from a Docker Compose file.
 */
function extractPortMappings(content: string): string[] {
  const portLines: string[] = [];
  const lines = content.split("\n");
  let inPorts = false;

  for (const line of lines) {
    if (line.trim() === "ports:") {
      inPorts = true;
      continue;
    }
    if (inPorts) {
      if (line.match(/^\s+-\s/)) {
        portLines.push(line);
      } else if (line.trim() && !line.startsWith(" ") && !line.startsWith("\t")) {
        inPorts = false;
      } else if (line.match(/^\s+[a-z_]+:/i) && !line.match(/^\s+-/)) {
        inPorts = false;
      }
    }
  }

  return portLines;
}

describe("Property 1: Docker Compose Single Source of Truth", () => {
  /**
   * **Feature: auto-test-containers, Property 1: Docker Compose Single Source of Truth**
   * **Validates: Requirements 15.5, 17.2**
   *
   * For any Docker Compose file, all configurable values (ports, credentials, etc.)
   * SHALL use environment variable substitution from .env files.
   */
  describe("All Docker Compose files use environment variable substitution", () => {
    it.each(COMPOSE_FILES)(
      "should use env var substitution for configurable values in %s",
      (composeFile) => {
        const content = readComposeFile(composeFile);

        // Check port mappings
        const portMappings = extractPortMappings(content);
        for (const portLine of portMappings) {
          // Skip internal-only ports (like pgadmin's internal port)
          if (portLine.includes('"80"') || portLine.includes("'80'")) {
            continue;
          }

          // External ports must use env var substitution
          const hasEnvVar = portLine.includes("${");
          expect(hasEnvVar).toBe(true);
        }

        // Check that no hardcoded patterns exist
        for (const [name, pattern] of Object.entries(HARDCODED_PATTERNS)) {
          const match = content.match(pattern);
          if (match) {
            // Allow specific exceptions
            const isException =
              // pgadmin internal port
              (name === "hardcodedPort" && match[0].includes('"80:80"')) ||
              // Internal Docker network ports
              (name === "hardcodedPort" && match[0].includes('"5432"'));

            if (!isException) {
              expect(match).toBeNull();
            }
          }
        }
      }
    );
  });

  /**
   * Property-based test: For any generated configuration key-value pair,
   * if it appears in a Docker Compose file, it should use env var substitution.
   */
  describe("Property: Configurable values use environment variable substitution", () => {
    // Map of compose files to their expected configurable keys
    const composeFileKeys: Record<string, string[]> = {
      "docker-compose.test.yml": [
        "TEST_DB_PORT",
        "TEST_OLLAMA_PORT",
        "TEST_DB_USER",
        "TEST_DB_PASSWORD",
        "TEST_DB_NAME",
        "TEST_CONTAINER_PREFIX",
      ],
      "docker-compose.dev.yml": [
        "DB_PORT",
        "OLLAMA_PORT",
        "DB_USER",
        "DB_PASSWORD",
        "DB_NAME",
        "PGADMIN_EMAIL",
        "PGADMIN_PASSWORD",
        "PGADMIN_PORT",
      ],
      "docker-compose.prod.yml": [
        "POSTGRES_PORT",
        "OLLAMA_PORT",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "POSTGRES_DB",
        "EMBEDDING_MODEL",
        "EMBEDDING_DIMENSION",
        "LOG_LEVEL",
        "LOG_FORMAT",
      ],
    };

    // Generate arbitrary (composeFile, configKey) pairs
    const composeFileKeyArb = fc.constantFrom(...COMPOSE_FILES).chain((composeFile) => {
      const keys = composeFileKeys[composeFile] || [];
      if (keys.length === 0) {
        return fc.constant({ composeFile, configKey: "" });
      }
      return fc.constantFrom(...keys).map((configKey) => ({ composeFile, configKey }));
    });

    it("should reference configurable keys via ${KEY:-default} syntax in compose files", () => {
      fc.assert(
        fc.property(composeFileKeyArb, ({ composeFile, configKey }) => {
          if (!configKey) return true; // Skip if no keys for this file

          const content = readComposeFile(composeFile);

          // If the key is referenced, it should be via ${KEY:-default} syntax
          if (content.includes(configKey)) {
            const envVarPattern = new RegExp(`\\$\\{${configKey}:-[^}]+\\}`);
            const hasProperSubstitution = envVarPattern.test(content);

            // The key should appear in ${KEY:-default} format
            expect(hasProperSubstitution).toBe(true);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Docker Compose files should not contain hardcoded sensitive values.
   */
  describe("Property: No hardcoded sensitive values", () => {
    const sensitivePatterns = [
      // Hardcoded passwords (not using ${VAR:-default})
      /password:\s*[a-zA-Z0-9_]+\s*$/im,
      // Hardcoded secrets
      /secret:\s*[a-zA-Z0-9_]+\s*$/im,
    ];

    it.each(COMPOSE_FILES)("should not have hardcoded sensitive values in %s", (composeFile) => {
      const content = readComposeFile(composeFile);

      for (const pattern of sensitivePatterns) {
        const match = content.match(pattern);
        // If there's a match, it should be using env var substitution
        if (match) {
          const line = match[0];
          const hasEnvVar = line.includes("${");
          expect(hasEnvVar).toBe(true);
        }
      }
    });
  });

  /**
   * Property: All compose files should have consistent structure.
   */
  describe("Property: Consistent Docker Compose structure", () => {
    it("all compose files should define services section", () => {
      fc.assert(
        fc.property(fc.constantFrom(...COMPOSE_FILES), (composeFile) => {
          const content = readComposeFile(composeFile);
          expect(content).toContain("services:");
        }),
        { numRuns: 100 }
      );
    });

    it("all compose files should define networks section", () => {
      fc.assert(
        fc.property(fc.constantFrom(...COMPOSE_FILES), (composeFile) => {
          const content = readComposeFile(composeFile);
          expect(content).toContain("networks:");
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Port mappings should follow the ${VAR:-default}:internal pattern.
   */
  describe("Property: Port mapping format", () => {
    it("external port mappings should use environment variable substitution", () => {
      fc.assert(
        fc.property(fc.constantFrom(...COMPOSE_FILES), (composeFile) => {
          const content = readComposeFile(composeFile);
          const portMappings = extractPortMappings(content);

          for (const portLine of portMappings) {
            // Skip internal-only ports
            if (portLine.includes('"80"') || portLine.includes("'80'")) {
              continue;
            }

            // External ports should use ${VAR:-default}:internal format
            const hasEnvVar = portLine.includes("${");
            expect(hasEnvVar).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
