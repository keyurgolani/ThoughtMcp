#!/usr/bin/env node
/**
 * Production build script using esbuild
 * Minifies and bundles TypeScript code for optimal distribution
 */

import * as esbuild from "esbuild";
import { accessSync, constants, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Read package.json for external dependencies
const packageJson = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf-8"));
const dependencies = Object.keys(packageJson.dependencies || {});

// Common build options
const commonOptions = {
  platform: "node",
  target: "node18",
  format: "esm",
  bundle: true,
  minify: true,
  sourcemap: true,
  treeShaking: true,
  external: dependencies,
  logLevel: "info",
  metafile: true,
};

function fileExists(path) {
  try {
    accessSync(join(rootDir, path), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

async function build() {
  console.log("🔨 Building Thought with esbuild...\n");

  try {
    const results = [];

    // Build main entry point
    console.log("📦 Building main entry point...");
    const mainResult = await esbuild.build({
      ...commonOptions,
      entryPoints: ["src/index.ts"],
      outfile: "dist/index.js",
    });
    results.push({ name: "Main", result: mainResult });

    // Build REST API entry point (Requirements: 16.1)
    if (fileExists("src/rest-api-start.ts")) {
      console.log("📦 Building REST API entry point...");
      const restApiResult = await esbuild.build({
        ...commonOptions,
        entryPoints: ["src/rest-api-start.ts"],
        outfile: "dist/rest-api-start.js",
      });
      results.push({ name: "REST API", result: restApiResult });
    }

    // Build cognitive module (if exists)
    if (fileExists("src/cognitive/index.ts")) {
      console.log("📦 Building cognitive module...");
      const cognitiveResult = await esbuild.build({
        ...commonOptions,
        entryPoints: ["src/cognitive/index.ts"],
        outfile: "dist/cognitive/index.js",
      });
      results.push({ name: "Cognitive", result: cognitiveResult });
    }

    // Build server module (if exists)
    if (fileExists("src/server/CognitiveMCPServer.ts")) {
      console.log("📦 Building server module...");
      const serverResult = await esbuild.build({
        ...commonOptions,
        entryPoints: ["src/server/CognitiveMCPServer.ts"],
        outfile: "dist/server/CognitiveMCPServer.js",
      });
      results.push({ name: "Server", result: serverResult });
    }

    // Build utils module (if exists)
    if (fileExists("src/utils/index.ts")) {
      console.log("📦 Building utils module...");
      const utilsResult = await esbuild.build({
        ...commonOptions,
        entryPoints: ["src/utils/index.ts"],
        outfile: "dist/utils/index.js",
      });
      results.push({ name: "Utils", result: utilsResult });
    }

    // Calculate and display bundle sizes
    console.log("\n✅ Build completed successfully!\n");
    console.log("📊 Bundle sizes:");

    let totalSize = 0;
    for (const { name, result } of results) {
      if (result.metafile) {
        const outputs = Object.values(result.metafile.outputs);
        const size = outputs.reduce((sum, output) => sum + output.bytes, 0);
        totalSize += size;
        console.log(`  ${name.padEnd(12)}: ${formatBytes(size)}`);
      }
    }

    console.log(`  ${"Total".padEnd(12)}: ${formatBytes(totalSize)}`);

    // Add shebang to main entry point
    const mainPath = join(rootDir, "dist/index.js");
    const mainContent = readFileSync(mainPath, "utf-8");
    if (!mainContent.startsWith("#!/usr/bin/env node")) {
      writeFileSync(mainPath, `#!/usr/bin/env node\n${mainContent}`);
      console.log("\n✅ Added shebang to main entry point");
    }

    console.log(
      "\n💡 Tip: Use 'npm run build:dev' for faster development builds without minification"
    );
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

// Run build
build();
