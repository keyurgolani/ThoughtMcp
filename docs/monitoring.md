# ThoughtMCP Monitoring and Observability Guide

This guide covers production monitoring, observability, and troubleshooting for ThoughtMCP.

## Overview

ThoughtMCP includes a comprehensive monitoring system with:

- **Structured Logging** - JSON-formatted logs with log levels and context
- **Metrics Collection** - Counters, gauges, histograms, and summaries
- **Health Checks** - Component health monitoring with configurable checks
- **Error Tracking** - Error aggregation, deduplication, and alerting
- **Resource Monitoring** - CPU, memory, and database connection tracking
- **Alerting** - Configurable alerts based on metric thresholds

## Quick Start

```typescript
import { productionMonitor } from "thoughtmcp/monitoring";

// Start monitoring
productionMonitor.start();

// Register health checks
productionMonitor.registerHealthCheck("database", async () => ({
  component: "database",
  status: (await db.healthCheck()) ? "healthy" : "unhealthy",
  responseTimeMs: 0,
}));

// Track errors
try {
  await riskyOperation();
} catch (error) {
  productionMonitor.trackError(error, {
    component: "memory",
    operation: "store",
    traceId: requestId,
  });
}

// Record metrics
productionMonitor.recordMetric("requests_total", 1, { type: "counter" });
productionMonitor.recordMetric("response_time_ms", 150, { type: "histogram" });
```

## Key Metrics to Monitor

### System Metrics

| Metric                     | Type  | Description                 | Alert Threshold               |
| -------------------------- | ----- | --------------------------- | ----------------------------- |
| `system_cpu_usage_percent` | Gauge | CPU usage percentage        | > 80% warning, > 95% critical |
| `system_memory_used_bytes` | Gauge | Memory usage in bytes       | > 80% of total                |
| `system_heap_used_bytes`   | Gauge | Node.js heap usage          | > 90% of heap total           |
| `db_connections_active`    | Gauge | Active database connections | > 80% of pool size            |
| `db_connections_idle`      | Gauge | Idle database connections   | -                             |

### Application Metrics

| Metric                     | Type      | Description                                           | Alert Threshold |
| -------------------------- | --------- | ----------------------------------------------------- | --------------- |
| `requests_total`           | Counter   | Total requests processed                              | -               |
| `errors_total`             | Counter   | Total errors by component                             | Rate > 10/min   |
| `health_status`            | Gauge     | Overall health (1=healthy, 0.5=degraded, 0=unhealthy) | < 1             |
| `component_health`         | Gauge     | Per-component health status                           | < 1             |
| `health_check_duration_ms` | Histogram | Health check response times                           | p95 > 1000ms    |

### Memory Operations

| Metric                             | Type      | Description               | Alert Threshold |
| ---------------------------------- | --------- | ------------------------- | --------------- |
| `memory_store_duration_ms`         | Histogram | Memory storage latency    | p95 > 500ms     |
| `memory_retrieve_duration_ms`      | Histogram | Memory retrieval latency  | p95 > 200ms     |
| `memory_search_duration_ms`        | Histogram | Memory search latency     | p95 > 500ms     |
| `embedding_generation_duration_ms` | Histogram | Embedding generation time | p95 > 1000ms    |

### Reasoning Operations

| Metric                            | Type      | Description               | Alert Threshold |
| --------------------------------- | --------- | ------------------------- | --------------- |
| `reasoning_duration_ms`           | Histogram | Total reasoning time      | p95 > 30000ms   |
| `stream_duration_ms`              | Histogram | Per-stream reasoning time | p95 > 10000ms   |
| `framework_selection_duration_ms` | Histogram | Framework selection time  | p95 > 2000ms    |

## Alerting Configuration

### Setting Up Alerts

```typescript
productionMonitor.addAlert({
  name: "high_cpu",
  metric: "system_cpu_usage_percent",
  threshold: 90,
  operator: "gt",
  duration: 60, // seconds
  severity: "critical",
  enabled: true,
});

productionMonitor.addAlert({
  name: "high_error_rate",
  metric: "errors_total",
  threshold: 100,
  operator: "gt",
  duration: 300,
  severity: "warning",
  enabled: true,
});
```

### Alert Callbacks

```typescript
productionMonitor.onAlert((event) => {
  if (event.resolved) {
    console.log(`Alert resolved: ${event.alert.name}`);
  } else {
    console.error(`Alert triggered: ${event.alert.name}`, {
      metric: event.alert.metric,
      threshold: event.alert.threshold,
      currentValue: event.currentValue,
      severity: event.alert.severity,
    });

    // Send to external alerting system
    sendToSlack(event);
    sendToPagerDuty(event);
  }
});
```

### Recommended Alerts

| Alert Name                 | Metric                            | Threshold      | Severity |
| -------------------------- | --------------------------------- | -------------- | -------- |
| `high_cpu`                 | `system_cpu_usage_percent`        | > 90%          | critical |
| `high_memory`              | `system_heap_used_bytes`          | > 90% of total | critical |
| `db_connections_exhausted` | `db_connections_active`           | > 18 (of 20)   | warning  |
| `high_error_rate`          | `errors_total`                    | > 100/5min     | warning  |
| `health_degraded`          | `health_status`                   | < 1            | warning  |
| `slow_responses`           | `memory_retrieve_duration_ms` p95 | > 500ms        | warning  |

## Troubleshooting Procedures

### High CPU Usage

**Symptoms:**

- `system_cpu_usage_percent` > 80%
- Slow response times
- Request timeouts

**Investigation:**

1. Check active operations: `productionMonitor.getSummary()`
2. Review recent errors: `errorTracker.getRecentErrors({ limit: 10 })`
3. Check for runaway processes or infinite loops

**Resolution:**

- Scale horizontally if load is legitimate
- Identify and fix inefficient code paths
- Add caching for expensive operations

### High Memory Usage

**Symptoms:**

- `system_heap_used_bytes` approaching `system_heap_total_bytes`
- Garbage collection pauses
- Out of memory errors

**Investigation:**

1. Check heap statistics: `resourceMonitor.getCurrentMetrics()`
2. Review memory growth over time: `resourceMonitor.getSnapshots()`
3. Look for memory leaks in error tracking

**Resolution:**

- Increase Node.js heap size: `--max-old-space-size=4096`
- Fix memory leaks (unclosed connections, unbounded caches)
- Implement memory limits on caches

### Database Connection Issues

**Symptoms:**

- `db_connections_active` at pool maximum
- Connection timeout errors
- Slow queries

**Investigation:**

1. Check connection pool stats: `databaseManager.getPoolStats()`
2. Review slow queries in database logs
3. Check for connection leaks

**Resolution:**

- Increase pool size: `DB_POOL_SIZE=30`
- Fix connection leaks (ensure connections are released)
- Optimize slow queries
- Add connection timeout handling

### High Error Rate

**Symptoms:**

- `errors_total` increasing rapidly
- Error alerts triggering
- User-reported issues

**Investigation:**

1. Get error summary: `errorTracker.exportSummary()`
2. Review top errors: `errorTracker.getTopErrors(10)`
3. Check error patterns by component

**Resolution:**

- Fix root cause of errors
- Add retry logic for transient failures
- Implement circuit breakers for failing dependencies

### Health Check Failures

**Symptoms:**

- `health_status` < 1
- Component health checks failing
- Service unavailable errors

**Investigation:**

1. Get health report: `healthChecker.generateReport()`
2. Check individual component status
3. Review component-specific logs

**Resolution:**

- Restart failing components
- Fix underlying issues (database, external services)
- Implement graceful degradation

## Runbook: Common Issues

### Issue: Server Not Starting

**Check:**

```bash
# Check environment variables
echo $DATABASE_URL
echo $EMBEDDING_MODEL

# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check logs
npm run start:debug 2>&1 | head -100
```

**Resolution:**

1. Verify all required environment variables are set
2. Ensure database is accessible
3. Check for port conflicts

### Issue: Slow Memory Retrieval

**Check:**

```typescript
const stats = metrics.getHistogramStats("memory_retrieve_duration_ms");
console.log("p50:", stats.buckets);
console.log("p95:", stats.buckets);
```

**Resolution:**

1. Check database indexes exist
2. Verify pgvector extension is installed
3. Optimize query parameters (limit, filters)
4. Add caching for frequent queries

### Issue: Embedding Generation Timeout

**Check:**

```bash
# Check Ollama service
curl http://localhost:11434/api/tags

# Check embedding model
curl http://localhost:11434/api/generate -d '{"model":"nomic-embed-text","prompt":"test"}'
```

**Resolution:**

1. Restart Ollama service
2. Verify model is downloaded
3. Increase timeout: `EMBEDDING_TIMEOUT=60000`
4. Use mock embeddings for testing

## Prometheus Integration

Export metrics in Prometheus format:

```typescript
// Endpoint handler
app.get("/metrics", (req, res) => {
  res.set("Content-Type", "text/plain");
  res.send(productionMonitor.exportPrometheusMetrics());
});
```

Example output:

```
# TYPE requests_total counter
requests_total 1234

# TYPE response_time_ms histogram
response_time_ms_bucket{le="10"} 100
response_time_ms_bucket{le="50"} 450
response_time_ms_bucket{le="100"} 800
response_time_ms_bucket{le="500"} 1200
response_time_ms_sum 45678
response_time_ms_count 1234

# TYPE system_cpu_usage_percent gauge
system_cpu_usage_percent 45.2
```

## Logging Best Practices

### Log Levels

| Level   | Use Case                                          |
| ------- | ------------------------------------------------- |
| `debug` | Detailed debugging information (development only) |
| `info`  | Normal operational messages                       |
| `warn`  | Warning conditions that should be investigated    |
| `error` | Error conditions that need attention              |
| `fatal` | Critical errors requiring immediate action        |

### Structured Logging

```typescript
import { logger } from "thoughtmcp/monitoring";

// Good: Structured with context
logger.info("Memory stored successfully", {
  operation: "memory.store",
  traceId: requestId,
  context: { memoryId, userId, sector },
  durationMs: 150,
});

// Good: Error with full context
logger.error("Memory storage failed", {
  operation: "memory.store",
  traceId: requestId,
  error: err,
  context: { userId, content: content.substring(0, 100) },
});
```

### Production Configuration

```bash
# Production logging
LOG_LEVEL=warn
NODE_ENV=production

# Development logging
LOG_LEVEL=debug
NODE_ENV=development
```

## Incident Response Guide

### Severity Levels

| Level         | Description                  | Response Time     |
| ------------- | ---------------------------- | ----------------- |
| P1 - Critical | Service down, data loss risk | Immediate         |
| P2 - High     | Major feature broken         | < 1 hour          |
| P3 - Medium   | Minor feature broken         | < 4 hours         |
| P4 - Low      | Cosmetic issues              | Next business day |

### Incident Response Steps

1. **Acknowledge** - Confirm incident and assign owner
2. **Assess** - Determine severity and impact
3. **Communicate** - Notify stakeholders
4. **Investigate** - Use monitoring tools to identify root cause
5. **Mitigate** - Apply temporary fix if needed
6. **Resolve** - Implement permanent fix
7. **Review** - Post-incident review and documentation

### Useful Commands

```bash
# Check service health
curl http://localhost:3000/health

# Get metrics
curl http://localhost:3000/metrics

# Check database
psql $DATABASE_URL -c "SELECT count(*) FROM memories"

# Check logs
tail -f /var/log/thoughtmcp/app.log | jq .

# Restart service
systemctl restart thoughtmcp
```

## Environment Variables

| Variable                | Description                      | Default                      |
| ----------------------- | -------------------------------- | ---------------------------- |
| `LOG_LEVEL`             | Minimum log level                | `warn` (prod), `debug` (dev) |
| `NODE_ENV`              | Environment                      | `development`                |
| `HEALTH_CHECK_INTERVAL` | Health check interval (ms)       | `30000`                      |
| `METRICS_INTERVAL`      | Metrics collection interval (ms) | `10000`                      |
| `MAX_METRICS_HISTORY`   | Maximum metrics to retain        | `1000`                       |
| `MAX_ERROR_HISTORY`     | Maximum errors to retain         | `100`                        |

---

**Last Updated**: December 2025
**Version**: 0.5.0
