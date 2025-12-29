#!/bin/sh
# Ollama Container Entrypoint Script
#
# This script ensures required models are pulled before the container is considered ready:
# 1. Starts Ollama server in background
# 2. Waits for Ollama API to be ready
# 3. Pulls the embedding model from EMBEDDING_MODEL env var
# 4. Pulls the inference model from LLM_MODEL env var
# 5. Keeps Ollama running in foreground
#
# Environment Variables:
#   EMBEDDING_MODEL     - Embedding model to pull (default: nomic-embed-text)
#   LLM_MODEL           - Inference model to pull (default: llama3.2:1b)
#   OLLAMA_WAIT_TIMEOUT - Max seconds to wait for Ollama startup (default: 60)
#   SKIP_MODEL_PULL     - Skip model pull if set to "true" (default: false)
#
# Usage:
#   ./ollama-entrypoint.sh
#   EMBEDDING_MODEL=nomic-embed-text LLM_MODEL=llama3.2:1b ./ollama-entrypoint.sh

set -e

# Configuration with defaults
EMBEDDING_MODEL="${EMBEDDING_MODEL:-nomic-embed-text}"
LLM_MODEL="${LLM_MODEL:-llama3.2:1b}"
OLLAMA_WAIT_TIMEOUT="${OLLAMA_WAIT_TIMEOUT:-60}"
SKIP_MODEL_PULL="${SKIP_MODEL_PULL:-false}"

# Logging functions
log_info() {
    echo "[OLLAMA-INIT] $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo "[OLLAMA-INIT] $(date '+%Y-%m-%d %H:%M:%S') - WARN: $1"
}

log_error() {
    echo "[OLLAMA-INIT] $(date '+%Y-%m-%d %H:%M:%S') - ERROR: $1" >&2
}

# Wait for Ollama API to be ready using ollama list command
wait_for_ollama_ready() {
    log_info "Waiting for Ollama API to be ready..."

    elapsed=0
    interval=2

    while [ $elapsed -lt $OLLAMA_WAIT_TIMEOUT ]; do
        # Use ollama list to check if server is ready (curl not available in image)
        if ollama list > /dev/null 2>&1; then
            log_info "Ollama API is ready!"
            return 0
        fi

        sleep $interval
        elapsed=$((elapsed + interval))
    done

    log_error "Timeout waiting for Ollama API after ${OLLAMA_WAIT_TIMEOUT} seconds"
    return 1
}

# Check if model is already present using ollama list
is_model_present() {
    model_name="$1"

    # Use ollama list and grep for the model name
    if ollama list 2>/dev/null | grep -q "$model_name"; then
        return 0
    fi

    return 1
}

# Pull a model
pull_model() {
    model_name="$1"
    model_type="$2"

    if [ "$SKIP_MODEL_PULL" = "true" ]; then
        log_info "Skipping ${model_type} model pull (SKIP_MODEL_PULL=true)"
        return 0
    fi

    log_info "Checking for ${model_type} model: ${model_name}"

    if is_model_present "$model_name"; then
        log_info "${model_type} model ${model_name} is already present"
        return 0
    fi

    log_info "Pulling ${model_type} model: ${model_name}..."
    log_info "This may take several minutes on first run..."

    # Use ollama pull command directly
    if ollama pull "$model_name"; then
        log_info "Successfully pulled ${model_type} model: ${model_name}"
        return 0
    fi

    log_error "Failed to pull ${model_type} model: ${model_name}"
    return 1
}

# Main execution
main() {
    log_info "Ollama Entrypoint Script Starting..."
    log_info "Embedding Model: ${EMBEDDING_MODEL}"
    log_info "Inference Model: ${LLM_MODEL}"

    # Start Ollama server in background
    log_info "Starting Ollama server..."
    ollama serve &
    OLLAMA_PID=$!

    # Wait for Ollama to be ready
    if ! wait_for_ollama_ready; then
        log_error "Ollama failed to start. Exiting."
        exit 1
    fi

    # Pull embedding model (required)
    if ! pull_model "$EMBEDDING_MODEL" "embedding"; then
        log_error "Failed to pull required embedding model. Exiting."
        kill $OLLAMA_PID 2>/dev/null || true
        exit 1
    fi

    # Pull inference model (optional - warn but don't fail)
    if ! pull_model "$LLM_MODEL" "inference"; then
        log_warn "Inference model not available. AI-augmented reasoning may be limited."
    fi

    log_info "All models ready. Ollama initialization complete."
    log_info "Ollama server running (PID: ${OLLAMA_PID})"

    # Wait for Ollama process (keep container running)
    wait $OLLAMA_PID
}

# Run main function
main "$@"
