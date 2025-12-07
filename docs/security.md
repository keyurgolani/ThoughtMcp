# ThoughtMCP Security Guide

This document outlines security best practices, configurations, and considerations for deploying and operating ThoughtMCP in production environments.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Input Validation](#input-validation)
3. [Rate Limiting](#rate-limiting)
4. [Authentication & Authorization](#authentication--authorization)
5. [Database Security](#database-security)
6. [Secrets Management](#secrets-management)
7. [Security Checklist](#security-checklist)
8. [Vulnerability Response](#vulnerability-response)

## Security Overview

ThoughtMCP implements multiple layers of security:

- **Input Validation**: All user inputs are validated and sanitized
- **Rate Limiting**: Prevents abuse and ensures fair resource usage
- **Authentication Hooks**: Extensible framework for custom authentication
- **Database Security**: SSL/TLS connections and parameterized queries
- **Secrets Management**: Secure handling of sensitive configuration

## Input Validation

### Overview

The `InputValidator` class provides comprehensive input validation and sanitization to prevent:

- SQL injection attacks
- Cross-site scripting (XSS)
- Path traversal attacks
- Buffer overflow attacks
- Unicode normalization attacks

### Usage

```typescript
import { InputValidator, createInputValidator } from "thoughtmcp";

const validator = createInputValidator({
  maxLength: 10000,
  allowHtml: false,
  trimWhitespace: true,
});

// Validate user input
const result = validator.validate(userInput);
if (!result.valid) {
  console.error("Validation errors:", result.errors);
  return;
}

// Use sanitized input
const safeInput = result.sanitized;
```

### Validation Methods

| Method                    | Purpose                                |
| ------------------------- | -------------------------------------- |
| `validate()`              | General string validation              |
| `validateMemoryContent()` | Memory content validation              |
| `validateUserId()`        | User ID format validation              |
| `validateSessionId()`     | Session ID format validation           |
| `validateSearchQuery()`   | Search query validation with SQL check |
| `validateNumber()`        | Numeric input validation               |
| `validateStringArray()`   | Array of strings validation            |

### Security Features

- **Null byte stripping**: Removes null bytes that could truncate strings
- **Control character removal**: Strips dangerous control characters
- **HTML sanitization**: Removes HTML/script tags by default
- **Path traversal detection**: Warns about `../` patterns
- **Unicode normalization**: Normalizes to NFC form
- **Length enforcement**: Prevents oversized inputs

## Rate Limiting

### Overview

The `RateLimiter` class implements sliding window rate limiting to prevent:

- Denial of service attacks
- Resource exhaustion
- API abuse

### Configuration

```typescript
import { createRateLimiter, createToolRateLimiter } from "thoughtmcp";

// Custom rate limiter
const limiter = createRateLimiter({
  windowMs: 60000, // 1 minute window
  maxRequests: 100, // 100 requests per window
  keyGenerator: (ctx) => ctx.userId || "anonymous",
});

// Pre-configured for MCP tools
const toolLimiter = createToolRateLimiter(100); // 100 req/min per user/tool

// Pre-configured for memory operations
const memoryLimiter = createMemoryRateLimiter(50); // 50 req/min per user
```

### Usage

```typescript
const context = { userId: "user123", toolName: "store_memory" };

// Check and consume in one operation
const result = limiter.consume(context);

if (!result.allowed) {
  return {
    error: "Rate limit exceeded",
    retryAfter: result.retryAfter,
  };
}
```

### Recommended Limits

| Operation Type    | Recommended Limit | Window   |
| ----------------- | ----------------- | -------- |
| Memory operations | 50 requests       | 1 minute |
| Search operations | 100 requests      | 1 minute |
| Reasoning tasks   | 20 requests       | 1 minute |
| General API calls | 100 requests      | 1 minute |

## Authentication & Authorization

### Overview

ThoughtMCP provides an extensible authentication framework through `AuthManager`:

- **Authentication hooks**: Custom authentication logic
- **Authorization rules**: Role and permission-based access control
- **RBAC support**: Role-based access control with permission expansion

### Basic Setup

```typescript
import { createDefaultAuthManager, createStrictAuthManager } from "thoughtmcp";

// Default: requires user ID
const authManager = createDefaultAuthManager();

// Strict: requires user ID and session ID
const strictAuth = createStrictAuthManager();
```

### Custom Authentication

```typescript
import { AuthManager } from "thoughtmcp";

const authManager = new AuthManager({ defaultAllow: false });

// Add custom authentication hook
authManager.registerAuthHook(async (context, operation) => {
  // Validate API key, JWT token, etc.
  const isValid = await validateToken(context.metadata?.token);

  return {
    authenticated: isValid,
    authorized: isValid,
    context: isValid ? { ...context, roles: ["user"] } : context,
    error: isValid ? undefined : "Invalid authentication token",
  };
});

// Add authorization rules
authManager.registerRule({
  operation: "delete_memory",
  requiredRoles: ["admin"],
});
```

### Role-Based Access Control

```typescript
import { createRBACHook } from "thoughtmcp";

const rolePermissions = new Map([
  ["admin", ["read", "write", "delete", "admin"]],
  ["user", ["read", "write"]],
  ["viewer", ["read"]],
]);

authManager.registerAuthHook(createRBACHook(rolePermissions));
```

## Database Security

### SSL/TLS Configuration

Always use SSL/TLS for database connections in production:

```typescript
import { DatabaseConnectionManager } from "thoughtmcp";

const dbManager = new DatabaseConnectionManager({
  host: "db.example.com",
  port: 5432,
  database: "thoughtmcp",
  user: "app_user",
  password: process.env.DB_PASSWORD,
  ssl: {
    enabled: true,
    rejectUnauthorized: true,
    ca: "/path/to/ca-certificate.crt",
  },
});
```

### Environment Configuration

```bash
# Production database URL with SSL
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require

# SSL configuration
DB_SSL_ENABLED=true
DB_SSL_CA=/path/to/ca-certificate.crt
```

### Best Practices

1. **Use parameterized queries**: All queries use parameter binding
2. **Principle of least privilege**: Database user has minimal permissions
3. **Connection pooling**: Limits concurrent connections
4. **Connection timeouts**: Prevents hanging connections
5. **SSL/TLS**: Encrypts data in transit

## Secrets Management

### Overview

The `SecretsManager` class provides secure access to secrets from multiple sources:

- Environment variables
- Configuration files
- External secret managers (HashiCorp Vault)

### Usage

```typescript
import { SecretsManager, getSecretsManager } from "thoughtmcp";

// Get singleton instance
const secrets = getSecretsManager();

// Get required secret (throws if not found)
const apiKey = await secrets.getRequired("API_KEY");

// Get optional secret with default
const logLevel = await secrets.getWithDefault("LOG_LEVEL", "WARN");

// Check if secret exists
if (await secrets.exists("FEATURE_FLAG")) {
  // Enable feature
}
```

### Database Configuration

```typescript
// Automatically parses DATABASE_URL or individual settings
const dbConfig = await secrets.getDatabaseConfig();
```

### Secret Masking

```typescript
// For logging - masks sensitive values
const masked = SecretsManager.maskSecret("mysecretpassword");
// Output: "myse****word"

// Check if a key looks like a secret
if (SecretsManager.looksLikeSecret("DB_PASSWORD")) {
  // Handle as sensitive
}
```

### Best Practices

1. **Never commit secrets**: Use `.gitignore` for `.env` files
2. **Use environment variables**: Preferred for containerized deployments
3. **Rotate secrets regularly**: Implement secret rotation
4. **Audit secret access**: Log when secrets are accessed
5. **Use secret managers**: HashiCorp Vault, AWS Secrets Manager, etc.

## Security Checklist

### Pre-Deployment

- [ ] All dependencies updated (`npm update`)
- [ ] Security audit passed (`npm audit`)
- [ ] No high/critical vulnerabilities
- [ ] SSL/TLS enabled for database
- [ ] Secrets stored securely (not in code)
- [ ] Rate limiting configured
- [ ] Input validation enabled
- [ ] Authentication configured
- [ ] Logging configured (no sensitive data)

### Production Configuration

- [ ] `NODE_ENV=production`
- [ ] `LOG_LEVEL=WARN` or `ERROR`
- [ ] Database SSL enabled
- [ ] Rate limiting enabled
- [ ] Health checks configured
- [ ] Monitoring enabled
- [ ] Backup strategy in place

### Ongoing Maintenance

- [ ] Regular dependency updates
- [ ] Weekly security audits
- [ ] Log monitoring for anomalies
- [ ] Secret rotation schedule
- [ ] Incident response plan tested

## Vulnerability Response

### Reporting Vulnerabilities

If you discover a security vulnerability:

1. **Do not** open a public issue
2. Email security concerns to the maintainers
3. Include detailed reproduction steps
4. Allow reasonable time for response

### Response Process

1. **Acknowledgment**: Within 48 hours
2. **Assessment**: Severity evaluation within 1 week
3. **Fix Development**: Based on severity
4. **Disclosure**: Coordinated with reporter

### Severity Levels

| Level    | Response Time | Examples                             |
| -------- | ------------- | ------------------------------------ |
| Critical | 24 hours      | Remote code execution, data breach   |
| High     | 1 week        | Authentication bypass, SQL injection |
| Medium   | 2 weeks       | XSS, information disclosure          |
| Low      | 1 month       | Minor information leaks              |

### Security Updates

- Subscribe to security advisories
- Monitor `npm audit` regularly
- Apply patches promptly
- Test updates in staging first

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [MCP Security Considerations](https://modelcontextprotocol.io/docs/security)

---

**Last Updated**: December 2025
**Version**: 0.5.0
