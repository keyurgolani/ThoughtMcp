/**
 * Example demonstrating performance monitoring capabilities
 */

import {
  CognitiveMetrics,
  PerformanceMonitor,
  createCLIDashboard,
} from "../utils/index.js";

// Create a performance monitor
const monitor = new PerformanceMonitor({
  responseTimeWarning: 1000,
  responseTimeCritical: 5000,
  memoryUsageWarning: 100 * 1024 * 1024, // 100MB
  memoryUsageCritical: 500 * 1024 * 1024, // 500MB
  confidenceThreshold: 0.5,
});

// Example: Simulate some cognitive operations
async function simulateCognitiveOperations() {
  console.log("🧠 Simulating cognitive operations...\n");

  // Simulate different types of operations
  const operations = [
    { name: "think", responseTime: 150, confidence: 0.8 },
    { name: "remember", responseTime: 50, confidence: 1.0 },
    { name: "recall", responseTime: 200, confidence: 0.6 },
    { name: "analyze_reasoning", responseTime: 300, confidence: 0.9 },
    { name: "think", responseTime: 2500, confidence: 0.3 }, // Slow operation
  ];

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    const measurement = monitor.startMeasurement(`req_${i}`, op.name);

    // Simulate processing time
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(op.responseTime / 10, 50))
    );

    // Record cognitive metrics
    measurement.recordCognitiveMetrics({
      confidenceScore: op.confidence,
      reasoningDepth: Math.floor(Math.random() * 5) + 1,
      memoryRetrievals: Math.floor(Math.random() * 3),
      workingMemoryLoad: Math.random(),
      emotionalProcessingTime:
        op.name === "think" ? Math.random() * 100 : undefined,
      metacognitionTime:
        op.name === "analyze_reasoning" ? Math.random() * 200 : undefined,
    } as CognitiveMetrics);

    // Complete measurement
    const metrics = measurement.complete();
    console.log(
      `✅ ${op.name} completed in ${metrics.responseTime}ms (confidence: ${op.confidence})`
    );
  }
}

// Example: Display performance statistics
function displayStatistics() {
  console.log("\n📊 Performance Statistics:");
  console.log("=".repeat(50));

  const stats = monitor.getStatistics();

  console.log(`Total Requests: ${stats.totalRequests}`);
  console.log(
    `Average Response Time: ${stats.averageResponseTime.toFixed(1)}ms`
  );
  console.log(`Median Response Time: ${stats.medianResponseTime.toFixed(1)}ms`);
  console.log(`95th Percentile: ${stats.p95ResponseTime.toFixed(1)}ms`);
  console.log(`99th Percentile: ${stats.p99ResponseTime.toFixed(1)}ms`);
  console.log(
    `Average Confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`
  );
  console.log(`Low Confidence Requests: ${stats.lowConfidenceRequests}`);

  console.log("\n🔧 Tool Usage:");
  Object.entries(stats.toolUsageStats).forEach(([tool, toolStats]) => {
    console.log(
      `  ${tool}: ${
        toolStats.count
      } calls (${toolStats.averageResponseTime.toFixed(1)}ms avg, ${(
        toolStats.averageConfidence * 100
      ).toFixed(1)}% confidence)`
    );
  });

  const currentMemory = monitor.getMemoryUsage();
  console.log(
    `\n💾 Current Memory Usage: ${(
      currentMemory.heapUsed /
      1024 /
      1024
    ).toFixed(1)}MB`
  );
}

// Example: Display alerts
function displayAlerts() {
  const alerts = monitor.getAlerts();

  if (alerts.length > 0) {
    console.log("\n🚨 Performance Alerts:");
    console.log("=".repeat(50));

    alerts.forEach((alert) => {
      const icon = alert.type === "critical" ? "🔴" : "🟡";
      const timestamp = new Date(alert.timestamp).toLocaleTimeString();
      console.log(`${icon} [${timestamp}] ${alert.message}`);
    });
  } else {
    console.log("\n✅ No performance alerts");
  }
}

// Example: Export metrics for external monitoring
function exportMetricsExample() {
  console.log("\n📤 Exporting Metrics:");
  console.log("=".repeat(50));

  const exportedMetrics = monitor.exportMetrics();
  console.log(`Exported ${exportedMetrics.length} metric records`);

  // Example: Save to file (in real usage)
  // fs.writeFileSync('performance-metrics.json', JSON.stringify(exportedMetrics, null, 2));

  // Show sample metric
  if (exportedMetrics.length > 0) {
    console.log("\nSample metric record:");
    console.log(JSON.stringify(exportedMetrics[0], null, 2));
  }
}

// Example: CLI Dashboard
async function dashboardExample() {
  console.log("\n🖥️  Starting CLI Dashboard (5 seconds)...");
  console.log("=".repeat(50));

  const dashboard = createCLIDashboard(monitor);
  dashboard.start();

  // Let it run for a few seconds
  await new Promise((resolve) => setTimeout(resolve, 5000));

  dashboard.stop();
}

// Main example function
async function main() {
  console.log("🚀 Performance Monitoring Example");
  console.log("=".repeat(50));

  try {
    // Simulate operations
    await simulateCognitiveOperations();

    // Display statistics
    displayStatistics();

    // Display alerts
    displayAlerts();

    // Export metrics
    exportMetricsExample();

    // Dashboard example
    await dashboardExample();

    console.log("\n✨ Performance monitoring example completed!");
  } catch (error) {
    console.error("❌ Error running example:", error);
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as runPerformanceMonitoringExample };
