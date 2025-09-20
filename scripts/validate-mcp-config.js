#!/usr/bin/env node

/**
 * ThoughtMCP Configuration Validator
 *
 * This script helps validate MCP server configurations for different environments.
 * Run this to test if your ThoughtMCP setup is working correctly.
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

class MCPConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.success = [];
  }

  log(message, type = "info") {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: "📋",
      success: "✅",
      warning: "⚠️",
      error: "❌",
    }[type];

    console.log(`${prefix} ${message}`);

    if (type === "error") this.errors.push(message);
    if (type === "warning") this.warnings.push(message);
    if (type === "success") this.success.push(message);
  }

  async validateNodeVersion() {
    this.log("Checking Node.js version...");

    return new Promise((resolve) => {
      const nodeProcess = spawn("node", ["--version"]);
      let version = "";

      nodeProcess.stdout.on("data", (data) => {
        version += data.toString();
      });

      nodeProcess.on("close", (code) => {
        if (code !== 0) {
          this.log("Node.js not found or not working", "error");
          resolve(false);
          return;
        }

        const versionMatch = version.match(/v(\d+)\.(\d+)\.(\d+)/);
        if (!versionMatch) {
          this.log("Could not parse Node.js version", "error");
          resolve(false);
          return;
        }

        const major = parseInt(versionMatch[1]);
        if (major < 18) {
          this.log(
            `Node.js ${version.trim()} found, but version 18+ required`,
            "error"
          );
          resolve(false);
        } else {
          this.log(`Node.js ${version.trim()} ✓`, "success");
          resolve(true);
        }
      });
    });
  }

  async validateThoughtMCPBuild() {
    this.log("Checking ThoughtMCP build...");

    const distPath = path.join(process.cwd(), "dist", "index.js");

    if (!fs.existsSync(distPath)) {
      this.log("ThoughtMCP not built. Run: npm run build", "error");
      return false;
    }

    this.log("ThoughtMCP build found ✓", "success");
    return true;
  }

  async testServerStart() {
    this.log("Testing server startup...");

    return new Promise((resolve) => {
      const serverProcess = spawn(
        "node",
        [path.join(process.cwd(), "dist", "index.js")],
        {
          stdio: ["pipe", "pipe", "pipe"],
        }
      );

      let output = "";
      let errorOutput = "";

      serverProcess.stdout.on("data", (data) => {
        output += data.toString();
      });

      serverProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      // Send a simple test request
      setTimeout(() => {
        const testRequest =
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/list",
          }) + "\n";

        serverProcess.stdin.write(testRequest);
      }, 1000);

      setTimeout(() => {
        serverProcess.kill();

        if (output.includes("tools") || output.includes("think")) {
          this.log("Server startup test ✓", "success");
          resolve(true);
        } else {
          this.log("Server startup failed", "error");
          if (errorOutput) {
            this.log(`Error: ${errorOutput}`, "error");
          }
          resolve(false);
        }
      }, 3000);
    });
  }

  validateKiroConfig() {
    this.log("Checking Kiro IDE configuration...");

    const workspaceConfig = path.join(
      process.cwd(),
      ".kiro",
      "settings",
      "mcp.json"
    );
    const userConfig = path.join(os.homedir(), ".kiro", "settings", "mcp.json");

    let found = false;

    if (fs.existsSync(workspaceConfig)) {
      this.log("Workspace Kiro config found ✓", "success");
      this.validateConfigFile(workspaceConfig, "Kiro workspace");
      found = true;
    }

    if (fs.existsSync(userConfig)) {
      this.log("User Kiro config found ✓", "success");
      this.validateConfigFile(userConfig, "Kiro user");
      found = true;
    }

    if (!found) {
      this.log("No Kiro configuration found", "warning");
      this.log("Create .kiro/settings/mcp.json for workspace config", "info");
    }

    return found;
  }

  validateClaudeConfig() {
    this.log("Checking Claude Desktop configuration...");

    let configPath;
    const platform = os.platform();

    if (platform === "darwin") {
      configPath = path.join(
        os.homedir(),
        "Library",
        "Application Support",
        "Claude",
        "claude_desktop_config.json"
      );
    } else if (platform === "win32") {
      configPath = path.join(
        os.homedir(),
        "AppData",
        "Roaming",
        "Claude",
        "claude_desktop_config.json"
      );
    } else {
      configPath = path.join(
        os.homedir(),
        ".config",
        "Claude",
        "claude_desktop_config.json"
      );
    }

    if (fs.existsSync(configPath)) {
      this.log("Claude Desktop config found ✓", "success");
      this.validateConfigFile(configPath, "Claude Desktop");
      return true;
    } else {
      this.log("No Claude Desktop configuration found", "warning");
      this.log(`Expected at: ${configPath}`, "info");
      return false;
    }
  }

  validateConfigFile(configPath, configType) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

      if (!config.mcpServers) {
        this.log(`${configType}: No mcpServers section found`, "warning");
        return false;
      }

      const thoughtMcpServers = Object.entries(config.mcpServers).filter(
        ([name, server]) =>
          name.includes("thought") ||
          (server.args && server.args.some((arg) => arg.includes("ThoughtMcp")))
      );

      if (thoughtMcpServers.length === 0) {
        this.log(`${configType}: No ThoughtMCP server configured`, "warning");
        return false;
      }

      for (const [name, server] of thoughtMcpServers) {
        this.log(
          `${configType}: Found ThoughtMCP server "${name}" ✓`,
          "success"
        );

        // Validate server configuration
        if (!server.command) {
          this.log(`${configType}: Server "${name}" missing command`, "error");
        }

        if (!server.args || server.args.length === 0) {
          this.log(`${configType}: Server "${name}" missing args`, "error");
        }

        // Check if the path exists
        if (server.args && server.args.length > 0) {
          const scriptPath = server.args[0];
          if (!path.isAbsolute(scriptPath)) {
            this.log(
              `${configType}: Server "${name}" should use absolute path`,
              "warning"
            );
          } else if (!fs.existsSync(scriptPath)) {
            this.log(
              `${configType}: Server "${name}" script not found: ${scriptPath}`,
              "error"
            );
          } else {
            this.log(
              `${configType}: Server "${name}" script path valid ✓`,
              "success"
            );
          }
        }

        // Check environment variables
        if (server.env) {
          const recommendedEnvVars = [
            "COGNITIVE_DEFAULT_MODE",
            "COGNITIVE_ENABLE_EMOTION",
            "COGNITIVE_ENABLE_METACOGNITION",
          ];

          const missingEnvVars = recommendedEnvVars.filter(
            (envVar) => !server.env[envVar]
          );
          if (missingEnvVars.length > 0) {
            this.log(
              `${configType}: Consider adding env vars: ${missingEnvVars.join(
                ", "
              )}`,
              "info"
            );
          }
        }
      }

      return true;
    } catch (error) {
      this.log(
        `${configType}: Invalid JSON configuration: ${error.message}`,
        "error"
      );
      return false;
    }
  }

  generateSampleConfigs() {
    this.log("Generating sample configurations...");

    const currentDir = process.cwd();
    const distPath = path.join(currentDir, "dist", "index.js");

    const configs = {
      kiro: {
        mcpServers: {
          "thought-mcp": {
            command: "node",
            args: [distPath],
            env: {
              COGNITIVE_DEFAULT_MODE: "balanced",
              COGNITIVE_ENABLE_EMOTION: "true",
              COGNITIVE_ENABLE_METACOGNITION: "true",
              COGNITIVE_BRAIN_DIR: "./brain",
              LOG_LEVEL: "INFO",
            },
            disabled: false,
            autoApprove: ["think", "remember", "recall"],
            disabledTools: [],
          },
        },
      },
      claude: {
        mcpServers: {
          "thought-mcp": {
            command: "node",
            args: [distPath],
            env: {
              COGNITIVE_DEFAULT_MODE: "deliberative",
              COGNITIVE_ENABLE_EMOTION: "true",
              COGNITIVE_ENABLE_METACOGNITION: "true",
              COGNITIVE_BRAIN_DIR: "~/.brain/claude",
              LOG_LEVEL: "INFO",
            },
          },
        },
      },
    };

    // Write sample configs
    const samplesDir = path.join(currentDir, "config-samples");
    if (!fs.existsSync(samplesDir)) {
      fs.mkdirSync(samplesDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(samplesDir, "kiro-mcp.json"),
      JSON.stringify(configs.kiro, null, 2)
    );

    fs.writeFileSync(
      path.join(samplesDir, "claude-desktop-config.json"),
      JSON.stringify(configs.claude, null, 2)
    );

    this.log("Sample configurations written to config-samples/", "success");
    this.log("Copy and modify these for your environment", "info");
  }

  printSummary() {
    console.log("\n" + "=".repeat(50));
    console.log("VALIDATION SUMMARY");
    console.log("=".repeat(50));

    if (this.success.length > 0) {
      console.log("\n✅ SUCCESS:");
      this.success.forEach((msg) => console.log(`  • ${msg}`));
    }

    if (this.warnings.length > 0) {
      console.log("\n⚠️  WARNINGS:");
      this.warnings.forEach((msg) => console.log(`  • ${msg}`));
    }

    if (this.errors.length > 0) {
      console.log("\n❌ ERRORS:");
      this.errors.forEach((msg) => console.log(`  • ${msg}`));
    }

    console.log("\n" + "=".repeat(50));

    if (this.errors.length === 0) {
      console.log(
        "🎉 Configuration looks good! ThoughtMCP should work in your environment."
      );
    } else {
      console.log("🔧 Please fix the errors above before using ThoughtMCP.");
    }

    console.log("\nFor detailed setup instructions, see:");
    console.log("📖 docs/integration/agentic-environments.md");
  }

  async run() {
    console.log("🧠 ThoughtMCP Configuration Validator\n");

    // Basic system checks
    const nodeOk = await this.validateNodeVersion();
    if (!nodeOk) return this.printSummary();

    const buildOk = await this.validateThoughtMCPBuild();
    if (!buildOk) return this.printSummary();

    const serverOk = await this.testServerStart();

    // Configuration checks
    this.validateKiroConfig();
    this.validateClaudeConfig();

    // Generate sample configs
    this.generateSampleConfigs();

    this.printSummary();
  }
}

// Run the validator
if (require.main === module) {
  const validator = new MCPConfigValidator();
  validator.run().catch(console.error);
}

module.exports = MCPConfigValidator;
