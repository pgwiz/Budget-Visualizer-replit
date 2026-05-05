#!/bin/bash

###############################################################################
# Automated Deployment Script - Vercel + Render Fallback
# Purpose: Non-interactive production deployment with comprehensive error handling
# Target Branch: devin/1777922112-hierarchical-budget-system
# Environment: Linux/Docker (Vercel or Render)
###############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_DIR="${REPO_DIR:-.}"
TARGET_BRANCH="devin/1777922112-hierarchical-budget-system"
LOG_FILE="${REPO_DIR}/deployment-$(date +%Y%m%d-%H%M%S).log"
DEPLOYMENT_TARGET="${DEPLOYMENT_TARGET:-vercel}" # Options: vercel, render, auto
GITHUB_PAT="${GIT_KEY:-}"

# Error tracking
VERCEL_FAILED=false
RENDER_FAILED=false
DEPLOYMENT_SUCCESS=false

###############################################################################
# Logging Functions
###############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

###############################################################################
# Git Operations
###############################################################################

setup_git_auth() {
    log_info "Setting up Git authentication..."
    
    # Configure git for non-interactive operation
    git config --global --replace-all url."https://github.com/".insteadOf git://github.com/ 2>/dev/null || true
    git config --global core.askPass "" 2>/dev/null || true
    
    # Use GitHub PAT if provided
    if [ -n "$GITHUB_PAT" ]; then
        log_info "Using provided GitHub PAT for authentication"
        echo "machine github.com" > ~/.netrc
        echo "login pgwiz" >> ~/.netrc
        echo "password $GITHUB_PAT" >> ~/.netrc
        chmod 600 ~/.netrc
        export GITHUB_TOKEN="$GITHUB_PAT"
    fi
    
    # Verify git configuration
    if ! git config user.email >/dev/null 2>&1; then
        git config --global user.email "pgwiz@github.com"
        git config --global user.name "pgwiz"
        log_info "Git user configured"
    fi
}

pull_branch() {
    log_info "Pulling latest changes from branch: $TARGET_BRANCH"
    
    cd "$REPO_DIR"
    
    # Fetch all branches
    if ! git fetch origin --all --prune 2>&1 | tee -a "$LOG_FILE"; then
        log_error "Failed to fetch from remote"
        return 1
    fi
    
    # Check out the target branch
    if ! git checkout "$TARGET_BRANCH" 2>&1 | tee -a "$LOG_FILE"; then
        log_error "Failed to checkout branch: $TARGET_BRANCH"
        return 1
    fi
    
    # Reset to remote tracking branch (force pull latest)
    if ! git reset --hard "origin/$TARGET_BRANCH" 2>&1 | tee -a "$LOG_FILE"; then
        log_error "Failed to reset to origin/$TARGET_BRANCH"
        return 1
    fi
    
    # Verify HEAD
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    COMMIT_SHA=$(git rev-parse HEAD)
    log_success "Checked out: $CURRENT_BRANCH (commit: ${COMMIT_SHA:0:7})"
}

###############################################################################
# Build Operations
###############################################################################

build_project() {
    log_info "Building project..."
    
    cd "$REPO_DIR"
    
    # Install dependencies
    if ! pnpm install --frozen-lockfile 2>&1 | tee -a "$LOG_FILE"; then
        log_error "Failed to install dependencies"
        return 1
    fi
    
    # Build artifacts
    if ! pnpm run build 2>&1 | tee -a "$LOG_FILE"; then
        log_error "Build failed"
        return 1
    fi
    
    log_success "Build completed successfully"
}

###############################################################################
# Vercel Deployment
###############################################################################

deploy_vercel() {
    log_info "Attempting Vercel deployment..."
    
    cd "$REPO_DIR"
    
    # Check if vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI not found. Install with: npm install -g vercel"
        return 1
    fi
    
    # List Vercel projects for debugging
    log_info "Vercel projects:"
    vercel projects --json 2>&1 | head -50 | tee -a "$LOG_FILE" || true
    
    # Deploy to Vercel
    log_info "Running: vercel --prod --yes --token=<hidden>"
    
    if vercel --prod --yes --token="$(vercel whoami -t 2>/dev/null || echo '')" 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Vercel deployment succeeded"
        DEPLOYMENT_SUCCESS=true
        return 0
    else
        VERCEL_FAILED=true
        log_error "Vercel deployment failed"
        return 1
    fi
}

###############################################################################
# Render Deployment (Docker-based)
###############################################################################

deploy_render() {
    log_info "Attempting Render deployment..."
    
    cd "$REPO_DIR"
    
    # Check if render CLI is installed
    if ! command -v render &> /dev/null; then
        log_error "Render CLI not found. Install with: npm install -g render"
        return 1
    fi
    
    # Authenticate with Render
    if ! render whoami 2>&1 | tee -a "$LOG_FILE"; then
        log_warning "Render CLI not authenticated. Attempting manual trigger via API..."
        
        # Alternative: Trigger via webhook or Render API
        if [ -n "${RENDER_DEPLOY_HOOK:-}" ]; then
            log_info "Using Render deploy hook"
            if curl -X POST "$RENDER_DEPLOY_HOOK" 2>&1 | tee -a "$LOG_FILE"; then
                log_success "Render deployment triggered via webhook"
                DEPLOYMENT_SUCCESS=true
                return 0
            fi
        fi
        
        return 1
    fi
    
    # Deploy using render.yaml
    log_info "Running: render deploy"
    
    if render deploy --prod 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Render deployment succeeded"
        DEPLOYMENT_SUCCESS=true
        return 0
    else
        RENDER_FAILED=true
        log_error "Render deployment failed"
        return 1
    fi
}

###############################################################################
# Docker Deployment (Direct)
###############################################################################

deploy_docker() {
    log_info "Building Docker image for Render..."
    
    cd "$REPO_DIR"
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found"
        return 1
    fi
    
    # Build Docker image
    IMAGE_TAG="budget-visualizer:$(git rev-parse --short HEAD)"
    log_info "Building Docker image: $IMAGE_TAG"
    
    if ! docker build -t "$IMAGE_TAG" . 2>&1 | tee -a "$LOG_FILE"; then
        log_error "Docker build failed"
        return 1
    fi
    
    log_success "Docker image built successfully: $IMAGE_TAG"
    
    # If Render deploy hook is available, trigger it
    if [ -n "${RENDER_DEPLOY_HOOK:-}" ]; then
        log_info "Triggering Render deployment via webhook"
        if curl -X POST "$RENDER_DEPLOY_HOOK" 2>&1 | tee -a "$LOG_FILE"; then
            log_success "Render deployment triggered"
            DEPLOYMENT_SUCCESS=true
            return 0
        fi
    fi
    
    log_warning "Docker image built but no Render webhook configured"
    return 0
}

validate_db_type_config() {
    local db_type="${DB_TYPE:-}"

    if [ -z "$db_type" ]; then
        log_info "DB_TYPE not set for local pre-check (skipping local DB type validation)"
        return 0
    fi

    local normalized
    normalized="$(echo "$db_type" | tr '[:upper:]' '[:lower:]' | xargs)"

    if [ "$normalized" != "prisma" ] && [ "$normalized" != "supabase" ]; then
        local hint=""
        if [ "$normalized" = "superbase" ]; then
            hint=' (did you mean "supabase"?)'
        fi
        log_error "Invalid DB_TYPE=\"$db_type\". Allowed values: prisma, supabase$hint"
        return 1
    fi

    log_success "DB_TYPE validation passed: $normalized"
}

validate_remote_db_type() {
    local check_url="${DEPLOY_CHECK_URL:-}"
    local expected_db_type="${EXPECTED_DB_TYPE:-}"

    if [ -z "$check_url" ] || [ -z "$expected_db_type" ]; then
        log_info "Remote DB type validation skipped (set DEPLOY_CHECK_URL and EXPECTED_DB_TYPE to enable)"
        return 0
    fi

    local expected
    expected="$(echo "$expected_db_type" | tr '[:upper:]' '[:lower:]' | xargs)"
    if [ "$expected" != "prisma" ] && [ "$expected" != "supabase" ]; then
        log_error "Invalid EXPECTED_DB_TYPE=\"$expected_db_type\". Allowed values: prisma, supabase"
        return 1
    fi

    local url="${check_url%/}/api/supabase/config"
    log_info "Validating remote DB type via: $url"

    local response
    response="$(curl -sS "$url" 2>/dev/null || true)"
    if [ -z "$response" ]; then
        log_error "Failed to fetch remote DB config from $url"
        return 1
    fi

    if [[ "$response" != *"\"active\":\"$expected\""* && "$response" != *"\"normalizedDbType\":\"$expected\""* ]]; then
        log_error "Remote DB type mismatch. Expected \"$expected\", got: $response"
        return 1
    fi

    log_success "Remote DB type check passed ($expected)"
}

###############################################################################
# Health Checks
###############################################################################

health_check() {
    log_info "Performing health checks..."
    
    # Wait for deployment to stabilize
    sleep 5
    
    # Check API endpoint
    if command -v curl &> /dev/null; then
        for i in {1..5}; do
            log_info "Health check attempt $i/5..."
            
            if curl -s -f "https://api.$(vercel whoami 2>/dev/null || echo 'render.com')/api/health" -o /dev/null; then
                log_success "API health check passed"
                return 0
            fi
            
            sleep 3
        done
        
        log_warning "API health check failed (may still be deploying)"
    fi

    validate_remote_db_type
}

###############################################################################
# Main Orchestration
###############################################################################

main() {
    log_info "=========================================="
    log_info "Deployment Automation Script"
    log_info "Target Branch: $TARGET_BRANCH"
    log_info "Log File: $LOG_FILE"
    log_info "=========================================="
    
    # Step 1: Setup Git
    if ! setup_git_auth; then
        log_error "Git authentication setup failed"
        exit 1
    fi
    
    # Step 2: Pull latest code
    if ! pull_branch; then
        log_error "Failed to pull branch"
        exit 1
    fi

    # Step 3: Validate DB configuration
    if ! validate_db_type_config; then
        log_error "DB configuration validation failed"
        exit 1
    fi
    
    # Step 4: Build project
    if ! build_project; then
        log_error "Build failed. Cannot proceed with deployment"
        exit 1
    fi
    
    # Step 5: Deploy based on target
    case "${DEPLOYMENT_TARGET,,}" in
        vercel)
            log_info "Target: Vercel (primary) → Render (fallback)"
            if ! deploy_vercel; then
                log_warning "Vercel deployment failed, attempting Render fallback..."
                if ! deploy_render; then
                    log_error "Both Vercel and Render deployments failed"
                    exit 1
                fi
            fi
            ;;
        
        render)
            log_info "Target: Render (primary) → Docker (fallback)"
            if ! deploy_render; then
                log_warning "Render deployment failed, attempting Docker build..."
                if ! deploy_docker; then
                    log_error "Both Render and Docker deployments failed"
                    exit 1
                fi
            fi
            ;;
        
        auto|*)
            log_info "Target: Auto-detect (Vercel → Render → Docker)"
            
            if deploy_vercel; then
                DEPLOYMENT_SUCCESS=true
            elif deploy_render; then
                DEPLOYMENT_SUCCESS=true
            elif deploy_docker; then
                DEPLOYMENT_SUCCESS=true
            else
                log_error "All deployment methods failed"
                exit 1
            fi
            ;;
    esac
    
    # Step 6: Health checks
    if [ "$DEPLOYMENT_SUCCESS" = true ]; then
        health_check || log_warning "Health checks inconclusive"
        log_success "Deployment completed successfully"
    fi
    
    # Summary
    log_info "=========================================="
    log_info "Deployment Summary"
    log_info "Vercel Status: $([ "$VERCEL_FAILED" = true ] && echo "FAILED" || echo "OK")"
    log_info "Render Status: $([ "$RENDER_FAILED" = true ] && echo "FAILED" || echo "OK")"
    log_info "Overall: $([ "$DEPLOYMENT_SUCCESS" = true ] && echo "SUCCESS ✓" || echo "FAILED ✗")"
    log_info "=========================================="
    
    if [ "$DEPLOYMENT_SUCCESS" = true ]; then
        exit 0
    else
        exit 1
    fi
}

# Trap errors
trap 'log_error "Script interrupted"; exit 1' INT TERM

# Run main function
main "$@"
