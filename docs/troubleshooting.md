# ThoughtMCP Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered when developing, testing, and deploying ThoughtMCP. Issues are organized by category with clear symptoms, causes, and solutions.

## Table of Contents

- [Database Issues](#database-issues)
- [Embedding Issues](#embedding-issues)
- [Performance Issues](#performance-issues)
- [Test Failures](#test-failures)
- [Build Errors](#build-errors)
- [Deployment Issues](#deployment-issues)
- [Memory Issues](#memory-issues)
- [Search Issues](#search-issues)

---

## Database Issues

### Cannot Connect to PostgreSQL

**Symptoms**:

- Error: "Connection refused" or "ECONNREFUSED"
- Application fails to start
- Database queries timeout

**Causes**:

- PostgreSQL not running
- Wrong connection credentials
- Port already in use
- Network/firewall issues

**Solutions**:

1. **Check if PostgreSQL is running**:

   ```bash
   # With Docker
   docker-compose ps postgres

   # Without Docker
   pg_isready -h localhost -p 5432
   ```

2. **Verify connection settings**:

   ```bash
   # Check .env.development
   cat .env.development | grep DB_

   # Test connection manually
   psql -h localhost -p 5432 -U thoughtmcp_dev -d thoughtmcp_dev
   ```

3. **Restart PostgreSQL**:

   ```bash
   # With Docker
   docker-compose restart postgres

   # Without Docker
   sudo systemctl restart postgresql
   ```

4. **Check logs**:

   ```bash
   # Docker logs
   docker-compose logs postgres

   # System logs
   sudo journalctl -u postgresql
   ```

5. **Verify port availability**:

   ```bash
   # Check if port 5432 is in use
   lsof -i :5432

   # Or use netstat
   netstat -an | grep 5432
   ```

### pgvector Extension Not Found

**Symptoms**:

- Error: "extension \"vector\" does not exist"
- Vector operations fail
- Cannot create vector indexes

**Causes**:

- pgvector extension not installed
- Extension not enabled in database
- Wrong PostgreSQL version

**Solutions**:

1. **Install pgvector**:

   ```bash
   # macth Homebrew
   brew install pgvector

   # Ubuntu/Debian
   sudo apt-get install postgresql-16-pgvector
   ```

2. **Enable extension**:

   ```sql
   -- Connect to database
   psql -U thoughtmcp_dev -d thoughtmcp_dev

   -- Enable extension
   CREATE EXTENSION IF NOT EXISTS vector;

   -- Verify
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

3. **Run initialization script**:
   ```bash
   psql -U thoughtmcp_dev -d thoughtmcp_dev -f scripts/db/enable-pgvector.sql
   ```

### Connection Pool Exhausted

**Symptoms**:

- Error: "Connection pool exhausted"
- Slow query performance
- Application hangs

**Causes**:

- Too many concurrent connections
- Connections not released
- Pool size too small
- Connection leaks in code

**Solutions**:

1. **Increase pool size**:

   ```bash
   # In .env.development
   DB_POOL_SIZE=30
   ```

2. **Check active connections**:

   ```sql
   SELECT count(*) as total,
          count(*) FILTER (WHERE state = 'active') as active,
          count(*) FILTER (WHERE state = 'idle') as idle
   FROM pg_stat_activity
   WHERE datname = 'thoughtmcp_dev';
   ```

3. **Find connection leaks**:

   ```typescript
   // Always release connections
   const client = await pool.connect();
   try {
     await client.query(...);
   } finally {
     client.release(); // Important!
   }

   // Or use transactions
   await dbManager.transaction(async (client) => {
     // Automatically released
   });
   ```

4. **Monitor pool stats**:
   ```typescript
   const stats = dbManager.getPoolStats();
   console.log(
     `Total: ${stats.totalCount}, Idle: ${stats.idleCount}, Waiting: ${stats.waitingCount}`
   );
   ```

### Slow Query Performance

**Symptoms**:

- Queries take >1 second
- High CPU usage
- Database locks

**Causes**:

- Missing indexes
- Inefficient queries
- Large result sets
- Table bloat

**Solutions**:

1. **Analyze query performance**:

   ```sql
   EXPLAIN ANALYZE SELECT * FROM memories WHERE user_id = 'user-123';
   ```

2. **Check index usage**:

   ```sql
   SELECT schemaname, tablename, indexname, idx_scan
   FROM pg_stat_user_indexes
   WHERE schemaname = 'public'
   ORDER BY idx_scan DESC;
   ```

3. **Rebuild indexes**:

   ```sql
   REINDEX TABLE memories;
   REINDEX TABLE memory_embeddings;
   ```

4. **Vacuum and analyze**:

   ```sql
   VACUUM ANALYZE memories;
   VACUUM ANALYZE memory_embeddings;
   ```

5. **Optimize vector indexes**:
   ```sql
   -- Rebuild with appropriate lists parameter
   DROP INDEX IF EXISTS idx_embeddings_semantic_vector;
   CREATE INDEX idx_embeddings_semantic_vector
   ON memory_embeddings USING ivfflat (embedding vector_cosine_ops)
   WHERE sector = 'semantic'
   WITH (lists = 316); -- sqrt(100000)
   ```

---

## Embedding Issues

### Ollama Connection Failed

**Symptoms**:

- Error: "Failed to connect to Ollama"
- Embedding generation fails
- Timeout errors

**Causes**:

- Ollama not running
- Wrong host/port
- Model not pulled
- Network issues

**Solutions**:

1. **Check if Ollama is running**:

   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Start Ollama**:

   ```bash
   ollama serve
   ```

3. **Pull required model**:

   ```bash
   ollama pull nomic-embed-text
   ```

4. **Verify configuration**:

   ```bash
   # Check .env.development
   echo $OLLAMA_HOST
   # Should be: http://localhost:11434
   ```

5. **Test embedding generation**:
   ```bash
   curl http://localhost:11434/api/embeddings -d '{
     "model": "nomic-embed-text",
     "prompt": "test"
   }'
   ```

### Embedding Dimension Mismatch

**Symptoms**:

- Error: "Dimension mismatch"
- Vector operations fail
- Cannot insert embeddings

**Causes**:

- Wrong EMBEDDING_DIMENSION setting
- Model changed
- Inconsistent embeddings in database

**Solutions**:

1. **Verify model dimension**:

   ```typescript
   const dimension = embeddingEngine.getDimension();
   console.log(`Model dimension: ${dimension}`);
   ```

2. **Update configuration**:

   ```bash
   # In .env.development
   EMBEDDING_MODEL=ollama/e5
   EMBEDDING_DIMENSION=1536  # Must match model
   ```

3. **Check database embeddings**:

   ```sql
   SELECT DISTINCT dimension, model, count(*)
   FROM memory_embeddings
   GROUP BY dimension, model;
   ```

4. **Clean inconsistent embeddings**:
   ```sql
   -- Backup first!
   DELETE FROM memory_embeddings WHERE dimension != 1536;
   ```

### Slow Embedding Generation

**Symptoms**:

- Embedding generation takes >5 seconds
- Memory creation is slow
- Timeout errors

**Causes**:

- Model not optimized
- CPU/GPU constraints
- Large batch sizes
- No caching

**Solutions**:

1. **Enable caching**:

   ```typescript
   const embeddingEngine = new EmbeddingEngine({
     model: "ollama/e5",
     dimension: 1536,
     cache: true, // Enable caching
     cacheSize: 1000,
   });
   ```

2. **Use batch processing**:

   ```typescript
   // Instead of generating one at a time
   const embeddings = await embeddingEngine.batchGenerate(texts);
   ```

3. **Optimize model**:

   ```bash
   # Use smaller, faster model
   EMBEDDING_MODEL=ollama/e5-small
   EMBEDDING_DIMENSION=384
   ```

4. **Monitor performance**:
   ```typescript
   const start = Date.now();
   const embedding = await embeddingEngine.generate(text, sector);
   console.log(`Generation time: ${Date.now() - start}ms`);
   ```

---

## Performance Issues

### High Memory Usage

**Symptoms**:

- Application uses >2GB RAM
- Out of memory errors
- Slow performance
- System swapping

**Causes**:

- Memory leaks
- Large result sets
- Too many connections
- Inefficient caching

**Solutions**:

1. **Profile memory usage**:

   ```bash
   node --max-old-space-size=4096 --inspect dist/index.js
   ```

2. **Check for leaks**:

   ```typescript
   // Use weak references for caches
   const cache = new WeakMap();

   // Limit cache size
   const cache = new LRUCache({ max: 1000 });
   ```

3. **Limit result sets**:

   ```typescript
   // Always use LIMIT
   const results = await searchEngine.search({
     ...query,
     limit: 100, // Don't fetch everything
   });
   ```

4. **Monitor memory**:

   ```typescript
   const used = process.memoryUsage();
   console.log(`Heap: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
   ```

5. **Reduce connection pool**:
   ```bash
   # In .env.development
   DB_POOL_SIZE=10  # Reduce if memory constrained
   ```

### Slow Retrieval Performance

**Symptoms**:

- Retrieval takes >500ms
- p95 latency >200ms
- Timeout errors

**Causes**:

- Missing indexes
- Large database
- Inefficient queries
- No caching

**Solutions**:

1. **Enable query caching**:

   ```bash
   # In .env.development
   ENABLE_CACHE=true
   CACHE_TTL=300
   ```

2. **Optimize indexes**:

   ```sql
   -- Check index usage
   SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;

   -- Drop unused indexes
   DROP INDEX IF EXISTS unused_index;
   ```

3. **Use composite scoring efficiently**:

   ```typescript
   // Limit vector search first
   const vectorResults = await vectorSearch(embedding, { limit: 100 });

   // Then apply composite scoring
   const scored = applyCompositeScoring(vectorResults);
   ```

4. **Profile queries**:
   ```sql
   EXPLAIN (ANALYZE, BUFFERS)
   SELECT * FROM find_similar_memories(...);
   ```

### High CPU Usage

**Symptoms**:

- CPU at 100%
- Slow response times
- System unresponsive

**Causes**:

- Inefficient algorithms
- Too many concurrent operations
- Infinite loops
- Heavy computation

**Solutions**:

1. **Profile CPU usage**:

   ```bash
   node --prof dist/index.js
   node --prof-process isolate-*.log > profile.txt
   ```

2. **Limit concurrent operations**:

   ```typescript
   // Use concurrency limit
   const results = await Promise.all(items.slice(0, 10).map((item) => process(item)));
   ```

3. **Optimize hot paths**:

   ```typescript
   // Cache expensive computations
   const memoized = memoize(expensiveFunction);
   ```

4. **Use worker threads**:
   ```typescript
   // Offload heavy computation
   const worker = new Worker("./heavy-computation.js");
   ```

---

## Test Failures

### Tests Failing Randomly

**Symptoms**:

- Tests pass sometimes, fail other times
- Different results on different runs
- Race conditions

**Causes**:

- Async operations not awaited
- Shared state between tests
- Timing dependencies
- External service dependencies

**Solutions**:

1. **Await all async operations**:

   ```typescript
   // Bad
   it("should process", () => {
     processAsync(); // Not awaited!
     expect(result).toBeDefined();
   });

   // Good
   it("should process", async () => {
     await processAsync();
     expect(result).toBeDefined();
   });
   ```

2. **Isolate test state**:

   ```typescript
   beforeEach(() => {
     // Reset state for each test
     repo = new MemoryRepository();
   });
   ```

3. **Use test database**:

   ```typescript
   beforeAll(async () => {
     await setupTestDatabase();
   });

   afterAll(async () => {
     await teardownTestDatabase();
   });
   ```

4. **Increase timeouts**:
   ```typescript
   it("should complete", async () => {
     // ...
   }, 10000); // 10 second timeout
   ```

### Coverage Below Target

**Symptoms**:

- Coverage report shows <75% for any metric (lines, branches, functions, statements)
- Build fails on coverage check
- Uncovered code paths

**Causes**:

- Missing tests
- Dead code
- Error paths not tested
- Edge cases not covered

**Solutions**:

1. **Generate coverage report**:

   ```bash
   npm run test:coverage -- --reporter=html
   open development/reports/coverage/index.html
   ```

2. **Identify uncovered code**:

   ```bash
   # Look for red/yellow lines in HTML report
   # Or check terminal output
   npm run test:coverage
   ```

3. **Add missing tests**:

   ```typescript
   // Test error paths
   it("should handle errors", async () => {
     await expect(repo.create(invalidData)).rejects.toThrow();
   });

   // Test edge cases
   it("should handle empty input", async () => {
     const result = await process("");
     expect(result).toEqual([]);
   });
   ```

4. **Remove dead code**:
   ```bash
   # Find unused exports
   npx ts-prune
   ```

### Database Tests Failing

**Symptoms**:

- Tests fail with database errors
- "relation does not exist"
- Connection errors

**Causes**:

- Test database not initialized
- Schema not created
- Stale test data
- Connection pool issues

**Solutions**:

1. **Reset test database**:

   ```bash
   npm run db:reset
   npm run db:setup
   ```

2. **Clear test data**:

   ```typescript
   afterEach(async () => {
     await clearTestData();
   });
   ```

3. **Check test database connection**:

   ```bash
   psql -U thoughtmcp_test -d thoughtmcp_test -c "SELECT 1"
   ```

4. **Use transactions in tests**:

   ```typescript
   beforeEach(async () => {
     await db.query("BEGIN");
   });

   afterEach(async () => {
     await db.query("ROLLBACK");
   });
   ```

---

## Build Errors

### TypeScript Compilation Errors

**Symptoms**:

- Build fails with type errors
- "Cannot find module"
- "Type 'X' is not assignable to type 'Y'"

**Causes**:

- Type mismatches
- Missing type definitions
- Incorrect imports
- Outdated dependencies

**Solutions**:

1. **Run type check**:

   ```bash
   npm run typecheck
   ```

2. **Fix type errors**:

   ```typescript
   // Add explicit types
   const result: Memory = await repo.retrieve(id);

   // Use type assertions carefully
   const data = response as MemoryData;
   ```

3. **Install missing types**:

   ```bash
   npm install --save-dev @types/node @types/pg
   ```

4. **Clean and rebuild**:
   ```bash
   npm run clean
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

### ESLint Errors

**Symptoms**:

- Build fails with linting errors
- "Unexpected any"
- "Missing return type"

**Causes**:

- Code quality issues
- Style violations
- Forbidden patterns

**Solutions**:

1. **Auto-fix issues**:

   ```bash
   npm run lint:fix
   ```

2. **Check specific file**:

   ```bash
   npx eslint src/path/to/file.ts
   ```

3. **Fix common issues**:

   ```typescript
   // Add return types
   function process(data: string): Promise<Result> {
     // ...
   }

   // Remove 'any' types
   function handle(data: unknown): void {
     if (typeof data === "string") {
       // Type guard
     }
   }
   ```

### Build Timeout

**Symptoms**:

- Build takes >5 minutes
- Build hangs
- No progress

**Causes**:

- Large codebase
- Slow tests
- Resource constraints
- Infinite loops

**Solutions**:

1. **Use quick build**:

   ```bash
   npm run build:quick
   ```

2. **Skip tests during iteration**:

   ```bash
   npm run clean
   npm run build:types
   npm run build:bundle
   ```

3. **Increase timeout** (recommended timeouts based on measured execution times as of December 10, 2024):

   ```bash
   # Full build with tests (~180s typical)
   timeout 360s npm run build

   # Full test suite (~78s typical with orchestrator)
   timeout 160s npm test

   # Coverage tests (~89s typical)
   timeout 180s npm run test:coverage

   # Individual test categories
   timeout 75s npm run test:unit         # ~37s typical
   timeout 30s npm run test:integration  # ~10s typical
   timeout 180s npm run test:e2e         # ~60s typical (requires containers)
   ```

4. **Check for infinite loops**:

   ```bash
   # Monitor CPU usage
   top

   # Kill hung process
   pkill -f "node.*build"
   ```

---

## Deployment Issues

### MCP Server Not Starting

**Symptoms**:

- Server fails to start
- No response from tools
- Connection errors

**Causes**:

- Missing dependencies
- Wrong Node version
- Configuration errors
- Port conflicts

**Solutions**:

1. **Check Node version**:

   ```bash
   node --version  # Should be 18+
   ```

2. **Verify build**:

   ```bash
   npm run build
   ls -la dist/index.js
   ```

3. **Test locally**:

   ```bash
   node dist/index.js
   ```

4. **Check MCP configuration**:

   ```json
   {
     "mcpServers": {
       "thoughtmcp": {
         "command": "node",
         "args": ["/absolute/path/to/dist/index.js"],
         "env": {
           "DATABASE_URL": "postgresql://...",
           "NODE_ENV": "production"
         }
       }
     }
   }
   ```

5. **Check logs**:
   ```bash
   # MCP server logs in Kiro
   # Or check system logs
   journalctl -u thoughtmcp
   ```

### Environment Variables Not Loaded

**Symptoms**:

- "DATABASE_URL is not defined"
- Connection errors
- Wrong configuration

**Causes**:

- .env file not loaded
- Wrong environment
- Missing variables

**Solutions**:

1. **Verify .env file**:

   ```bash
   cat .env.production
   ```

2. **Check environment**:

   ```bash
   echo $NODE_ENV
   echo $DATABASE_URL
   ```

3. **Load environment**:

   ```bash
   # In MCP configuration
   "env": {
     "DATABASE_URL": "postgresql://...",
     "NODE_ENV": "production",
     "LOG_LEVEL": "INFO"
   }
   ```

4. **Use absolute paths**:
   ```bash
   # Don't rely on relative paths
   DATABASE_URL=postgresql://localhost:5432/db
   ```

---

## Memory Issues

### Memory Not Found

**Symptoms**:

- retrieve() returns null
- "Memory not found" errors
- Empty search results

**Causes**:

- Memory deleted
- Wrong memory ID
- Database connection issues
- Insufficient permissions

**Solutions**:

1. **Verify memory exists**:

   ```sql
   SELECT * FROM memories WHERE id = 'mem-abc123';
   ```

2. **Check user ID**:

   ```typescript
   // Ensure correct user ID
   const memory = await repo.retrieve(memoryId, userId);
   ```

3. **Check strength**:
   ```sql
   -- Memory may be soft-deleted
   SELECT * FROM memories WHERE id = 'mem-abc123' AND strength > 0;
   ```

### Embeddings Not Generated

**Symptoms**:

- Memory created without embeddings
- Vector search fails
- Null embedding errors

**Causes**:

- Embedding service down
- Generation failed
- Transaction rolled back

**Solutions**:

1. **Check embedding service**:

   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Regenerate embeddings**:

   ```typescript
   const embeddings = await embeddingEngine.generateAllSectorEmbeddings(memory);
   await embeddingStorage.storeEmbeddings(memory.id, embeddings);
   ```

3. **Check logs**:
   ```typescript
   logger.error("Embedding generation failed", { memoryId, error });
   ```

---

## Search Issues

### No Search Results

**Symptoms**:

- Search returns empty array
- Expected memories not found
- Low similarity scores

**Causes**:

- Query too specific
- Embeddings not generated
- Wrong sector
- Threshold too high

**Solutions**:

1. **Lower similarity threshold**:

   ```typescript
   const results = await searchEngine.search({
     ...query,
     similarityThreshold: 0.5, // Lower threshold
   });
   ```

2. **Search multiple sectors**:

   ```typescript
   const results = await searchEngine.search({
     ...query,
     sectors: ["episodic", "semantic", "procedural"],
   });
   ```

3. **Use full-text search**:

   ```typescript
   const results = await fullTextSearch.search("database optimization");
   ```

4. **Check embeddings**:
   ```sql
   SELECT count(*) FROM memory_embeddings WHERE memory_id = 'mem-abc123';
   ```

### Slow Search Performance

**Symptoms**:

- Search takes >1 second
- High CPU usage
- Timeout errors

**Causes**:

- Large database
- Missing indexes
- Inefficient query
- No caching

**Solutions**:

1. **Enable caching**:

   ```bash
   ENABLE_CACHE=true
   CACHE_TTL=300
   ```

2. **Limit results**:

   ```typescript
   const results = await searchEngine.search({
     ...query,
     limit: 20, // Limit results
   });
   ```

3. **Rebuild indexes**:

   ```sql
   REINDEX TABLE memory_embeddings;
   ```

4. **Use composite scoring**:
   ```typescript
   // Composite scoring is more efficient than multiple queries
   const results = await searchEngine.search({
     embedding: queryEmbedding,
     metadata: filters,
     limit: 10,
   });
   ```

---

## Getting Help

If you encounter issues not covered in this guide:

1. **Check Documentation**:
   - [Development Guide](development.md)
   - [API Reference](api.md)
   - [Architecture Guide](architecture.md)

2. **Enable Debug Logging**:

   ```bash
   LOG_LEVEL=DEBUG npm run dev
   ```

3. **Search GitHub Issues**:
   - Look for similar issues
   - Check closed issues for solutions

4. **Create GitHub Issue**:
   - Provide error message and stack trace
   - Include steps to reproduce
   - Share environment details (OS, Node version, etc.)
   - Include relevant logs

5. **Community Support**:
   - GitHub Discussions
   - Stack Overflow (tag: thoughtmcp)

---

**Last Updated**: December 2025
**Version**: 0.5.0
