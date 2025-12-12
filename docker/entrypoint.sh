#!/bin/sh
# ThoughtMCP MCP Server Entrypoint Script
#
# This script ensures all dependencies are ready before starting the MCP server:
# 1. Waits for Ollama to be ready and responding
# 2. Pulls the embedding model if not already present
# 3. Starts the MCP server and optionally the REST API server
#
# Requirements: 11.3, 9.2, 9.3, 16.1, 16.3
#
# Environment Variables:
#   OLLAMA_HOST         - Ollama API URL (default: http://ollama:11434)
#   EMBEDDING_MODEL     - Model to pull (default: nomic-embed-text)
#   OLLAMA_WAIT_TIMEOUT - Max seconds to wait for Ollama (default: 120)
#   SKIP_MODEL_PULL     - Skip model pull if set to "true" (default: false)
#   MCP_STANDBY_MODE    - If "true", container stays alive without starting server (default: false)
#                         Use this when MCP clients connect via "docker exec -i <container> node dist/index.js"
#   REST_API_ENABLED    - If "true", starts REST API server alongside MCP server (default: false)
#   REST_API_PORT       - Port for REST API server (default: 3000)
#   CORS_ORIGINS        - Comma-separated list of allowed CORS origins (default: http://localhost:5173)
#
# Usage:
#   ./docker/entrypoint.sh
#   OLLAMA_HOST=http://localhost:11434 ./docker/entrypoint.sh
#   REST_API_ENABLED=true REST_API_PORT=3000 ./docker/entrypoint.sh

set -e

# Configuration with defaults
OLLAMA_HOST="${OLLAMA_HOST:-http://ollama:11434}"
EMBEDDING_MODEL="${EMBEDDING_MODEL:-nomic-embed-text}"
OLLAMA_WAIT_TIMEOUT="${OLLAMA_WAIT_TIMEOUT:-120}"
SKIP_MODEL_PULL="${SKIP_MODEL_PULL:-false}"
MCP_STANDBY_MODE="${MCP_STANDBY_MODE:-false}"
REST_API_ENABLED="${REST_API_ENABLED:-false}"
REST_API_PORT="${REST_API_PORT:-3000}"
CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:5173}"

# Logging functions
log_info() {
    echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo "[WARN] $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

# Wait for Ollama to be ready
wait_for_ollama() {
    log_info "Waiting for Ollama at ${OLLAMA_HOST}..."

    local elapsed=0
    local interval=5

    while [ $elapsed -lt $OLLAMA_WAIT_TIMEOUT ]; do
        # Check if Ollama API is responding
        if curl -sf "${OLLAMA_HOST}/api/tags" > /dev/null 2>&1; then
            log_info "Ollama is ready!"
            return 0
        fi

        log_info "Ollama not ready yet, waiting... (${elapsed}s/${OLLAMA_WAIT_TIMEOUT}s)"
        sleep $interval
        elapsed=$((elapsed + interval))
    done

    log_error "Timeout waiting for Ollama after ${OLLAMA_WAIT_TIMEOUT} seconds"
    log_error "Please ensure Ollama is running at ${OLLAMA_HOST}"
    return 1
}


# Check if model is already present
is_model_present() {
    local model_name="$1"

    # Query Ollama for available models
    local models_response
    models_response=$(curl -sf "${OLLAMA_HOST}/api/tags" 2>/dev/null) || return 1

    # Check if model is in the list (simple string match)
    if echo "$models_response" | grep -q "\"name\":\"${model_name}\""; then
        return 0
    fi

    # Also check for model with :latest tag
    if echo "$models_response" | grep -q "\"name\":\"${model_name}:latest\""; then
        return 0
    fi

    return 1
}

# Pull embedding model if not present
pull_embedding_model() {
    if [ "$SKIP_MODEL_PULL" = "true" ]; then
        log_info "Skipping model pull (SKIP_MODEL_PULL=true)"
        return 0
    fi

    log_info "Checking for embedding model: ${EMBEDDING_MODEL}"

    if is_model_present "$EMBEDDING_MODEL"; then
        log_info "Model ${EMBEDDING_MODEL} is already present"
        return 0
    fi

    log_info "Pulling embedding model: ${EMBEDDING_MODEL}..."
    log_info "This may take several minutes on first run..."

    # Pull the model using Ollama API
    local pull_response
    local http_code

    # Use curl to pull the model, streaming the response
    # The pull endpoint returns JSON lines with status updates
    http_code=$(curl -sf -w "%{http_code}" -o /tmp/pull_output.txt \
        -X POST "${OLLAMA_HOST}/api/pull" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"${EMBEDDING_MODEL}\", \"stream\": false}" 2>/dev/null) || true

    if [ "$http_code" = "200" ]; then
        log_info "Successfully pulled model: ${EMBEDDING_MODEL}"
        rm -f /tmp/pull_output.txt
        return 0
    fi

    # If non-streaming failed, try streaming approach
    log_info "Attempting streaming pull..."

    if curl -sf -X POST "${OLLAMA_HOST}/api/pull" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"${EMBEDDING_MODEL}\"}" 2>&1 | while read -r line; do
            # Parse status from JSON response
            status=$(echo "$line" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
            if [ -n "$status" ]; then
                log_info "Pull status: $status"
            fi
        done; then
        log_info "Successfully pulled model: ${EMBEDDING_MODEL}"
        return 0
    fi

    log_error "Failed to pull model: ${EMBEDDING_MODEL}"
    log_error "Please ensure the model name is correct and Ollama has network access"
    return 1
}

# Verify model is working by generating a test embedding
verify_model() {
    log_info "Verifying model ${EMBEDDING_MODEL} is working..."

    local response
    response=$(curl -sf -X POST "${OLLAMA_HOST}/api/embeddings" \
        -H "Content-Type: application/json" \
        -d "{\"model\": \"${EMBEDDING_MODEL}\", \"prompt\": \"test\"}" 2>/dev/null) || {
        log_warn "Could not verify model, but continuing anyway..."
        return 0
    }

    # Check if response contains embedding
    if echo "$response" | grep -q '"embedding"'; then
        log_info "Model verification successful!"
        return 0
    fi

    log_warn "Model verification returned unexpected response, but continuing..."
    return 0
}

# Start the MCP server
# Requirements: 16.1
start_server() {
    log_info "Starting ThoughtMCP MCP Server..."
    log_info "Database: ${DB_HOST:-postgres}:${DB_PORT:-5432}/${DB_NAME:-thoughtmcp}"
    log_info "Ollama: ${OLLAMA_HOST}"
    log_info "Model: ${EMBEDDING_MODEL}"

    # Start REST API if enabled (Requirements: 16.1)
    # REST API starts first to ensure it's ready before MCP server
    if [ "$REST_API_ENABLED" = "true" ]; then
        log_info "REST API enabled - starting REST API server first..."
        if ! start_rest_api; then
            log_error "Failed to start REST API server"
            exit 1
        fi
    fi

    # Execute the Node.js server, replacing this process
    exec node dist/index.js "$@"
}

# Start REST API server in background
# Requirements: 16.1, 16.3
start_rest_api() {
    if [ "$REST_API_ENABLED" != "true" ]; then
        return 0
    fi

    log_info "Starting REST API server on port ${REST_API_PORT}..."
    log_info "CORS Origins: ${CORS_ORIGINS}"

    # Start REST API server in background
    # The REST API shares cognitive components with MCP server
    # It runs as a separate Node.js process using the rest-api-start script
    node dist/rest-api-start.js &
    REST_API_PID=$!

    # Wait briefly to check if REST API started successfully
    sleep 2
    if kill -0 $REST_API_PID 2>/dev/null; then
        log_info "REST API server started successfully (PID: ${REST_API_PID})"
    else
        log_error "REST API server failed to start"
        return 1
    fi
}

# Standby mode - keep container alive for docker exec connections
# Requirements: 16.3
standby_mode() {
    log_info "Running in MCP_STANDBY_MODE - container ready for MCP client connections"
    log_info "Connect via: docker exec -i thoughtmcp-server node dist/index.js"
    log_info "Database: ${DB_HOST:-postgres}:${DB_PORT:-5432}/${DB_NAME:-thoughtmcp}"
    log_info "Ollama: ${OLLAMA_HOST}"
    log_info "Model: ${EMBEDDING_MODEL}"

    # Start REST API if enabled (Requirements: 16.3)
    if [ "$REST_API_ENABLED" = "true" ]; then
        log_info "REST API enabled in standby mode"
        if ! start_rest_api; then
            log_error "Failed to start REST API in standby mode"
            exit 1
        fi
    fi

    # Keep container alive - sleep indefinitely
    exec tail -f /dev/null
}

# Main execution
main() {
    log_info "ThoughtMCP Entrypoint Script Starting..."
    log_info "Environment: ${NODE_ENV:-development}"

    # Step 1: Wait for Ollama
    if ! wait_for_ollama; then
        log_error "Failed to connect to Ollama. Exiting."
        exit 1
    fi

    # Step 2: Pull embedding model if needed
    if ! pull_embedding_model; then
        log_error "Failed to pull embedding model. Exiting."
        exit 1
    fi

    # Step 3: Verify model is working
    verify_model

    # Step 4: Start the server or enter standby mode
    if [ "$MCP_STANDBY_MODE" = "true" ]; then
        standby_mode
    else
        start_server "$@"
    fi
}

# Run main function with all arguments
main "$@"
