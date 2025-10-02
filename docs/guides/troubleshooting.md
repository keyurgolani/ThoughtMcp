# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with ThoughtMCP. Issues are organized by category with step-by-step solutions.

## Quick Diagnostics

### Health Check

First, verify ThoughtMCP is running correctly:

```bash
# Check if server is running
npm run health-check

# Verify configuration
npm run config:validate

# Test basic functionality
npm run test:integration
```

### Common Symptoms

| Symptom            | Likely Cause             | Quick Fix                   |
| ------------------ | ------------------------ | --------------------------- |
| Server won't start | Configuration error      | Check environment variables |
| Slow responses     | Memory overload          | Run memory optimization     |
| Tool errors        | Invalid parameters       | Validate input schemas      |
| Memory issues      | Brain directory problems | Check file permissions      |
| High CPU usage     | Infinite reasoning loops | Reduce max depth settings   |

## Installation and Setup Issues

### Server Won't Start

**Symptoms:**

- Error on `npm start`
- Process exits immediately
- Port binding failures

**Diagnosis:**

```bash
# Check Node.js version
node --version  # Should be 18.0+

# Check dependencies
npm ls

# Check for port conflicts
lsof -i :3000  # Replace with your port
```

**Solutions:**

**Missing Dependencies:**

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

**Port Conflicts:**

```bash
# Use different port
export PORT=3001
npm start

# Or kill conflicting process
kill -9 $(lsof -t -i:3000)
```

**Permission Issues:**

```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### Configuration Errors

**Symptoms:**

- "Invalid configuration" errors
- Environment variables not recognized
- Default values not working

**Diagnosis:**

```bash
# Check environment variables
env | grep COGNITIVE

# Validate configuration
npm run config:validate

# Check .env file
cat .env
```

**Solutions:**

**Missing .env File:**

```bash
# Copy example configuration
cp example.env .env

# Edit with your settings
nano .env
```

**Invalid Values:**

```bash
# Reset to defaults
npm run config:reset

# Check valid ranges
npm run config:help
```

**Environment Variable Issues:**

```bash
# Ensure proper format (no spaces around =)
COGNITIVE_DEFAULT_MODE=balanced  # ✅ Correct
COGNITIVE_DEFAULT_MODE = balanced  # ❌ Wrong

# Check for special characters
# Use quotes for values with spaces
COGNITIVE_BRAIN_DIR="~/my brain"
```

### MCP Integration Issues

**Symptoms:**

- MCP client can't connect
- Tools not appearing
- Authentication failures

**Diagnosis:**

```bash
# Check MCP server status
npm run mcp:status

# Test MCP protocol
npm run mcp:test

# Check client configuration
cat ~/.kiro/settings/mcp.json  # For Kiro
```

**Solutions:**

**Connection Issues:**

```json
// Verify MCP configuration
{
  "mcpServers": {
    "thoughtmcp": {
      "command": "npx",
      "args": ["thoughtmcp@latest"],
      "env": {
        "LOG_LEVEL": "DEBUG" // Enable debug logging
      }
    }
  }
}
```

**Tool Registration Issues:**

```bash
# Restart MCP server
# In your MCP client, reconnect to ThoughtMCP

# Check tool list
npm run tools:list
```

## Performance Issues

### Slow Response Times

**Symptoms:**

- Responses take >30 seconds
- Timeouts on complex requests
- High memory usage

**Diagnosis:**

```bash
# Check system resources
top -p $(pgrep -f thoughtmcp)

# Monitor memory usage
npm run monitor:memory

# Check reasoning depth
grep "max_depth" logs/thoughtmcp.log
```

**Solutions:**

**Reduce Complexity:**

```bash
# Lower reasoning depth
export COGNITIVE_MAX_REASONING_DEPTH=5

# Disable metacognition for speed
export COGNITIVE_ENABLE_METACOGNITION=false

# Use faster mode
export COGNITIVE_DEFAULT_MODE=intuitive
```

**Optimize Memory:**

```json
{
  "tool": "optimize_memory",
  "arguments": {
    "optimization_mode": "aggressive",
    "target_memory_reduction": 0.3
  }
}
```

**Increase Timeouts:**

```bash
# Increase timeout for complex problems
export COGNITIVE_TIMEOUT_MS=60000
```

### High Memory Usage

**Symptoms:**

- RAM usage constantly increasing
- Out of memory errors
- System slowdown

**Diagnosis:**

```bash
# Check memory usage
npm run analyze:memory

# Monitor memory leaks
npm run monitor:leaks

# Check brain directory size
du -sh ~/.brain
```

**Solutions:**

**Memory Cleanup:**

```json
// Analyze memory usage
{
  "tool": "analyze_memory_usage",
  "arguments": {
    "analysis_depth": "deep"
  }
}

// Optimize memory
{
  "tool": "optimize_memory",
  "arguments": {
    "optimization_mode": "aggressive"
  }
}
```

**Configuration Adjustments:**

```bash
# Reduce memory limits
export COGNITIVE_EPISODIC_MEMORY_SIZE=1000
export COGNITIVE_SEMANTIC_MEMORY_SIZE=2000

# Increase consolidation frequency
export COGNITIVE_CONSOLIDATION_INTERVAL=60000  # 1 minute
```

**System-Level Solutions:**

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Monitor and restart if needed
npm run monitor:restart
```

## Tool-Specific Issues

### Think Tool Problems

**Symptoms:**

- Empty or nonsensical responses
- Confidence always 0 or 1
- Reasoning path missing

**Common Issues:**

**Input Too Vague:**

```json
// ❌ Too vague
{
  "tool": "think",
  "arguments": {
    "input": "help"
  }
}

// ✅ Specific and clear
{
  "tool": "think",
  "arguments": {
    "input": "I need to decide between React and Vue for my new web application. The team has 2 junior developers and we need to launch in 3 months."
  }
}
```

**Wrong Mode Selection:**

```json
// ❌ Creative mode for technical analysis
{
  "tool": "think",
  "arguments": {
    "input": "Analyze database performance metrics",
    "mode": "creative"
  }
}

// ✅ Analytical mode for technical analysis
{
  "tool": "think",
  "arguments": {
    "input": "Analyze database performance metrics",
    "mode": "analytical"
  }
}
```

**Missing Context:**

```json
// ✅ Provide relevant context
{
  "tool": "think",
  "arguments": {
    "input": "Should I refactor this code?",
    "context": {
      "domain": "software-development",
      "urgency": 0.3,
      "complexity": 0.7,
      "team_size": 4
    }
  }
}
```

### Memory Tool Problems

**Symptoms:**

- Can't recall stored memories
- Memory storage fails
- Inconsistent retrieval results

**Common Issues:**

**Brain Directory Issues:**

```bash
# Check directory exists and is writable
ls -la ~/.brain
chmod 755 ~/.brain

# Check disk space
df -h ~/.brain
```

**Poor Memory Cues:**

```json
// ❌ Too generic
{
  "tool": "recall",
  "arguments": {
    "cue": "meeting"
  }
}

// ✅ Specific and contextual
{
  "tool": "recall",
  "arguments": {
    "cue": "client meeting prototype feedback Q3 planning",
    "context": {
      "domain": "project-management",
      "timeframe": "recent"
    }
  }
}
```

**Memory Fragmentation:**

```json
// Run memory analysis
{
  "tool": "analyze_memory_usage",
  "arguments": {
    "analysis_depth": "comprehensive"
  }
}

// Consolidate if needed
{
  "tool": "optimize_memory",
  "arguments": {
    "optimization_mode": "moderate"
  }
}
```

### Systematic Analysis Issues

**Symptoms:**

- Wrong framework selected
- Incomplete analysis
- Generic recommendations

**Common Issues:**

**Insufficient Problem Description:**

```json
// ❌ Too brief
{
  "tool": "analyze_systematically",
  "arguments": {
    "input": "Team problems"
  }
}

// ✅ Detailed problem description
{
  "tool": "analyze_systematically",
  "arguments": {
    "input": "Our 8-person development team is missing 40% of sprint commitments. Standups run long, code reviews are delayed 2-3 days, and team members seem disengaged. This started 6 weeks ago after we switched to remote work."
  }
}
```

**Wrong Framework Expectations:**

```json
// ✅ Let system choose optimal framework
{
  "tool": "analyze_systematically",
  "arguments": {
    "input": "Detailed problem description...",
    "mode": "auto" // Let system select best framework
  }
}
```

## Error Messages and Solutions

### Common Error Messages

**"Invalid input schema"**

- **Cause**: Missing required parameters or wrong data types
- **Solution**: Check API documentation for correct parameter format
- **Example**: Ensure `input` parameter is a string, not object

**"Timeout exceeded"**

- **Cause**: Request took longer than configured timeout
- **Solution**: Increase timeout or simplify request

```bash
export COGNITIVE_TIMEOUT_MS=60000
```

**"Memory storage failed"**

- **Cause**: Brain directory not writable or disk full
- **Solution**: Check permissions and disk space

```bash
chmod 755 ~/.brain
df -h ~/.brain
```

**"Configuration validation failed"**

- **Cause**: Invalid environment variable values
- **Solution**: Check configuration guide for valid ranges

```bash
npm run config:validate
npm run config:reset  # Reset to defaults
```

**"Tool not found"**

- **Cause**: MCP client not properly connected or tool not registered
- **Solution**: Restart MCP connection and verify tool list

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Enable MCP protocol debugging
export DEBUG=mcp:*

# Enable cognitive process debugging
export DEBUG_COGNITIVE=true

# Start with debug output
npm run dev
```

**Debug Output Analysis:**

```bash
# Check for common patterns in logs
grep "ERROR" logs/thoughtmcp.log
grep "TIMEOUT" logs/thoughtmcp.log
grep "MEMORY" logs/thoughtmcp.log

# Monitor real-time
tail -f logs/thoughtmcp.log | grep ERROR
```

## Environment-Specific Issues

### Docker Issues

**Container Won't Start:**

```dockerfile
# Check Dockerfile configuration
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

**Volume Mount Issues:**

```yaml
# docker-compose.yml
version: "3.8"
services:
  thoughtmcp:
    image: thoughtmcp:latest
    volumes:
      - ./brain:/app/brain # Ensure brain directory is mounted
    environment:
      - COGNITIVE_BRAIN_DIR=/app/brain
```

### Cloud Deployment Issues

**Serverless Timeouts:**

```bash
# Reduce complexity for serverless
export COGNITIVE_DEFAULT_MODE=intuitive
export COGNITIVE_TIMEOUT_MS=10000
export COGNITIVE_ENABLE_METACOGNITION=false
```

**Memory Limits:**

```bash
# Optimize for limited memory
export COGNITIVE_EPISODIC_MEMORY_SIZE=500
export COGNITIVE_SEMANTIC_MEMORY_SIZE=1000
export NODE_OPTIONS="--max-old-space-size=512"
```

## Performance Optimization

### Speed Optimization

**For Fast Responses:**

```bash
# Speed-focused configuration
export COGNITIVE_DEFAULT_MODE=intuitive
export COGNITIVE_ENABLE_METACOGNITION=false
export COGNITIVE_WORKING_MEMORY_CAPACITY=5
export COGNITIVE_TIMEOUT_MS=5000
export COGNITIVE_TEMPERATURE=0.3
```

**For Quality Responses:**

```bash
# Quality-focused configuration
export COGNITIVE_DEFAULT_MODE=deliberative
export COGNITIVE_ENABLE_METACOGNITION=true
export COGNITIVE_WORKING_MEMORY_CAPACITY=12
export COGNITIVE_TIMEOUT_MS=30000
export COGNITIVE_TEMPERATURE=0.8
```

### Memory Optimization

**Regular Maintenance:**

```bash
# Weekly memory optimization
npm run memory:optimize

# Monthly deep analysis
npm run memory:analyze --deep

# Quarterly full cleanup
npm run memory:cleanup --aggressive
```

**Automated Optimization:**

```json
// Set up automatic optimization
{
  "tool": "forgetting_policy",
  "arguments": {
    "action": "create",
    "policy_data": {
      "policy_name": "auto_cleanup",
      "rules": [
        {
          "rule_name": "archive_old_memories",
          "conditions": [
            {
              "condition_type": "age_days",
              "operator": "greater_than",
              "value": 90
            }
          ],
          "action": "allow"
        }
      ]
    }
  }
}
```

## Monitoring and Maintenance

### Health Monitoring

**Set Up Monitoring:**

```bash
# Enable performance monitoring
export COGNITIVE_ENABLE_MONITORING=true
export COGNITIVE_METRICS_INTERVAL=60000

# Set up health checks
npm run monitor:setup
```

**Key Metrics to Watch:**

- Response time (target: <5 seconds for simple requests)
- Memory usage (should not continuously increase)
- Error rate (target: <1%)
- Tool success rate (target: >95%)

### Preventive Maintenance

**Daily:**

- Check error logs
- Monitor response times
- Verify disk space

**Weekly:**

- Run memory analysis
- Check configuration drift
- Update dependencies

**Monthly:**

- Deep memory optimization
- Performance benchmarking
- Configuration review

### Backup and Recovery

**Backup Brain Directory:**

```bash
# Create backup
tar -czf brain-backup-$(date +%Y%m%d).tar.gz ~/.brain

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/thoughtmcp"
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "$BACKUP_DIR/brain-$DATE.tar.gz" ~/.brain
find "$BACKUP_DIR" -name "brain-*.tar.gz" -mtime +30 -delete
```

**Recovery:**

```bash
# Restore from backup
tar -xzf brain-backup-20241001.tar.gz -C ~/

# Verify integrity
npm run brain:verify
```

## Getting Help

### Self-Diagnosis Checklist

Before seeking help, try these steps:

1. **Check the basics:**

   - [ ] Server is running
   - [ ] Configuration is valid
   - [ ] Dependencies are installed
   - [ ] Disk space available

2. **Review logs:**

   - [ ] Check error messages
   - [ ] Look for patterns
   - [ ] Enable debug mode if needed

3. **Test systematically:**

   - [ ] Try simple requests first
   - [ ] Isolate the problem
   - [ ] Test with default configuration

4. **Check resources:**
   - [ ] Memory usage reasonable
   - [ ] CPU not maxed out
   - [ ] Network connectivity good

### Community Support

**GitHub Issues:**

- Search existing issues first
- Provide detailed error messages
- Include configuration and logs
- Specify environment details

**Discussions:**

- Ask questions in GitHub Discussions
- Share troubleshooting experiences
- Help others with similar issues

**Documentation:**

- Check API documentation
- Review configuration guide
- Read integration examples

### Professional Support

For production deployments or complex issues:

- **Enterprise Support**: Available for commercial users
- **Consulting Services**: Custom implementation assistance
- **Training Programs**: Team training and best practices

## Troubleshooting Checklist

### Quick Fixes (Try First)

- [ ] Restart the server
- [ ] Check configuration with `npm run config:validate`
- [ ] Clear and reinstall dependencies
- [ ] Check disk space and permissions
- [ ] Try with default configuration

### Systematic Diagnosis

- [ ] Enable debug logging
- [ ] Reproduce the issue consistently
- [ ] Check system resources
- [ ] Review recent changes
- [ ] Test with minimal configuration

### Advanced Troubleshooting

- [ ] Analyze memory usage patterns
- [ ] Profile performance bottlenecks
- [ ] Check for memory leaks
- [ ] Review cognitive processing logs
- [ ] Test with different thinking modes

---

_Still having issues? Check our [GitHub Issues](https://github.com/keyurgolani/ThoughtMcp/issues) or start a [Discussion](https://github.com/keyurgolani/ThoughtMcp/discussions)._
