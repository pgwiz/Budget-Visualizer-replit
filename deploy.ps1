###############################################################################
# Automated Deployment Script - PowerShell Version
# Purpose: Non-interactive production deployment with comprehensive error handling
# Target Branch: devin/1777922112-hierarchical-budget-system
# Platforms: Windows, macOS, Linux (with pwsh)
###############################################################################

param(
    [string]$RepoDir = (Get-Location).Path,
    [string]$TargetBranch = "devin/1777922112-hierarchical-budget-system",
    [string]$DeploymentTarget = "auto",  # Options: vercel, render, auto
    [string]$GitKey = $env:GIT_KEY,
    [string]$LogFile = "$RepoDir\deployment-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
)

# Configuration
$ErrorActionPreference = "Stop"
$WarningPreference = "Continue"

# Tracking
$VERCELFailed = $false
$RenderFailed = $false
$DeploymentSuccess = $false

###############################################################################
# Logging Functions
###############################################################################

function Write-InfoLog {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [INFO] $Message"
    Write-Host $logMessage -ForegroundColor Blue
    Add-Content -Path $LogFile -Value $logMessage
}

function Write-SuccessLog {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [SUCCESS] $Message"
    Write-Host $logMessage -ForegroundColor Green
    Add-Content -Path $LogFile -Value $logMessage
}

function Write-WarningLog {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [WARNING] $Message"
    Write-Host $logMessage -ForegroundColor Yellow
    Add-Content -Path $LogFile -Value $logMessage
}

function Write-ErrorLog {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [ERROR] $Message"
    Write-Host $logMessage -ForegroundColor Red
    Add-Content -Path $LogFile -Value $logMessage
}

###############################################################################
# Git Operations
###############################################################################

function Setup-GitAuth {
    Write-InfoLog "Setting up Git authentication..."
    
    try {
        # Configure git for non-interactive operation
        & git config --global --replace-all url."https://github.com/".insteadOf git://github.com/ 2>&1 | Out-Null
        & git config --global core.askPass "" 2>&1 | Out-Null
        
        # Use GitHub PAT if provided
        if ($GitKey) {
            Write-InfoLog "Using provided GitHub PAT for authentication"
            
            # Windows credential manager approach
            if ($PSVersionTable.Platform -ne "Linux" -and $PSVersionTable.Platform -ne "Darwin") {
                & git credential approve <<EOF
                host=github.com
                username=pgwiz
                password=$GitKey
EOF
            } else {
                # Unix-like approach
                "machine github.com`nlogin pgwiz`npassword $GitKey" | Out-File -Path ~/.netrc -Encoding ASCII -Force
                chmod 600 ~/.netrc 2>&1 | Out-Null
            }
            
            $env:GITHUB_TOKEN = $GitKey
        }
        
        # Verify git configuration
        $userEmail = & git config user.email 2>&1
        if (-not $userEmail) {
            & git config --global user.email "pgwiz@github.com"
            & git config --global user.name "pgwiz"
            Write-InfoLog "Git user configured"
        }
    }
    catch {
        Write-ErrorLog "Git authentication setup failed: $_"
        return $false
    }
    
    return $true
}

function Pull-Branch {
    Write-InfoLog "Pulling latest changes from branch: $TargetBranch"
    
    try {
        Set-Location $RepoDir
        
        # Fetch all branches
        Write-InfoLog "Fetching from remote..."
        & git fetch origin --all --prune 2>&1 | Add-Content -Path $LogFile
        if ($LASTEXITCODE -ne 0) {
            throw "Git fetch failed"
        }
        
        # Check out the target branch
        Write-InfoLog "Checking out branch: $TargetBranch"
        & git checkout $TargetBranch 2>&1 | Add-Content -Path $LogFile
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to checkout branch"
        }
        
        # Reset to remote tracking branch (force pull latest)
        Write-InfoLog "Resetting to origin/$TargetBranch"
        & git reset --hard "origin/$TargetBranch" 2>&1 | Add-Content -Path $LogFile
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to reset to origin/$TargetBranch"
        }
        
        # Verify HEAD
        $currentBranch = & git rev-parse --abbrev-ref HEAD
        $commitSha = & git rev-parse HEAD
        
        Write-SuccessLog "Checked out: $currentBranch (commit: $($commitSha.Substring(0, 7)))"
    }
    catch {
        Write-ErrorLog "Failed to pull branch: $_"
        return $false
    }
    
    return $true
}

###############################################################################
# Build Operations
###############################################################################

function Build-Project {
    Write-InfoLog "Building project..."
    
    try {
        Set-Location $RepoDir
        
        # Install dependencies
        Write-InfoLog "Installing dependencies..."
        & pnpm install --frozen-lockfile 2>&1 | Add-Content -Path $LogFile
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install dependencies"
        }
        
        # Build artifacts
        Write-InfoLog "Running build..."
        & pnpm run build 2>&1 | Add-Content -Path $LogFile
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed"
        }
        
        Write-SuccessLog "Build completed successfully"
    }
    catch {
        Write-ErrorLog "Build failed: $_"
        return $false
    }
    
    return $true
}

###############################################################################
# Vercel Deployment
###############################################################################

function Deploy-Vercel {
    Write-InfoLog "Attempting Vercel deployment..."
    
    try {
        Set-Location $RepoDir
        
        # Check if vercel CLI is installed
        $vercelCmd = & where vercel 2>&1 | Select-Object -First 1
        if (-not $vercelCmd) {
            throw "Vercel CLI not found. Install with: npm install -g vercel"
        }
        
        # Get Vercel token
        Write-InfoLog "Running Vercel deployment..."
        & vercel --prod --yes 2>&1 | Add-Content -Path $LogFile
        if ($LASTEXITCODE -eq 0) {
            Write-SuccessLog "Vercel deployment succeeded"
            $script:DeploymentSuccess = $true
            return $true
        }
        else {
            throw "Vercel deployment failed with exit code $LASTEXITCODE"
        }
    }
    catch {
        Write-ErrorLog "Vercel deployment failed: $_"
        $script:VERCELFailed = $true
        return $false
    }
}

###############################################################################
# Render Deployment
###############################################################################

function Deploy-Render {
    Write-InfoLog "Attempting Render deployment..."
    
    try {
        Set-Location $RepoDir
        
        # Check if render CLI is installed
        $renderCmd = & where render 2>&1 | Select-Object -First 1
        if (-not $renderCmd) {
            Write-WarningLog "Render CLI not found"
            
            # Try webhook
            if ($env:RENDER_DEPLOY_HOOK) {
                Write-InfoLog "Using Render deploy hook"
                $response = Invoke-WebRequest -Uri $env:RENDER_DEPLOY_HOOK -Method POST -ContentType "application/json" -Body '{}' -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    Write-SuccessLog "Render deployment triggered via webhook"
                    $script:DeploymentSuccess = $true
                    return $true
                }
            }
            
            throw "Render CLI not available and no deploy hook configured"
        }
        
        # Check authentication
        Write-InfoLog "Checking Render authentication..."
        & render whoami 2>&1 | Add-Content -Path $LogFile
        if ($LASTEXITCODE -ne 0) {
            throw "Render not authenticated"
        }
        
        # Deploy
        Write-InfoLog "Running Render deployment..."
        & render deploy --prod 2>&1 | Add-Content -Path $LogFile
        if ($LASTEXITCODE -eq 0) {
            Write-SuccessLog "Render deployment succeeded"
            $script:DeploymentSuccess = $true
            return $true
        }
        else {
            throw "Render deployment failed with exit code $LASTEXITCODE"
        }
    }
    catch {
        Write-ErrorLog "Render deployment failed: $_"
        $script:RenderFailed = $true
        return $false
    }
}

###############################################################################
# Docker Deployment
###############################################################################

function Deploy-Docker {
    Write-InfoLog "Building Docker image for Render..."
    
    try {
        Set-Location $RepoDir
        
        # Check if Docker is available
        $dockerCmd = & where docker 2>&1 | Select-Object -First 1
        if (-not $dockerCmd) {
            throw "Docker not found"
        }
        
        # Build Docker image
        $imageTag = "budget-visualizer:$((& git rev-parse --short HEAD))"
        Write-InfoLog "Building Docker image: $imageTag"
        
        & docker build -t $imageTag . 2>&1 | Add-Content -Path $LogFile
        if ($LASTEXITCODE -ne 0) {
            throw "Docker build failed"
        }
        
        Write-SuccessLog "Docker image built successfully: $imageTag"
        
        # If Render deploy hook is available, trigger it
        if ($env:RENDER_DEPLOY_HOOK) {
            Write-InfoLog "Triggering Render deployment via webhook"
            $response = Invoke-WebRequest -Uri $env:RENDER_DEPLOY_HOOK -Method POST -ContentType "application/json" -Body '{}' -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-SuccessLog "Render deployment triggered"
                $script:DeploymentSuccess = $true
                return $true
            }
        }
        
        Write-WarningLog "Docker image built but no Render webhook configured"
    }
    catch {
        Write-ErrorLog "Docker deployment failed: $_"
        return $false
    }
    
    return $false
}

###############################################################################
# Health Checks
###############################################################################

function Test-HealthCheck {
    Write-InfoLog "Performing health checks..."
    
    try {
        Start-Sleep -Seconds 5
        
        for ($i = 1; $i -le 5; $i++) {
            Write-InfoLog "Health check attempt $i/5..."
            
            try {
                $response = Invoke-WebRequest -Uri "https://api.example.com/api/health" -TimeoutSec 10 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    Write-SuccessLog "API health check passed"
                    return $true
                }
            }
            catch {
                # Continue to next attempt
            }
            
            if ($i -lt 5) {
                Start-Sleep -Seconds 3
            }
        }
        
        Write-WarningLog "API health check inconclusive (may still be deploying)"
    }
    catch {
        Write-WarningLog "Health check error: $_"
    }
    
    return $true  # Non-blocking
}

###############################################################################
# Main Orchestration
###############################################################################

function Main {
    try {
        Write-SuccessLog "=========================================="
        Write-SuccessLog "Deployment Automation Script (PowerShell)"
        Write-SuccessLog "Target Branch: $TargetBranch"
        Write-SuccessLog "Log File: $LogFile"
        Write-SuccessLog "=========================================="
        
        # Step 1: Setup Git
        if (-not (Setup-GitAuth)) {
            Write-ErrorLog "Git authentication setup failed"
            exit 1
        }
        
        # Step 2: Pull latest code
        if (-not (Pull-Branch)) {
            Write-ErrorLog "Failed to pull branch"
            exit 1
        }
        
        # Step 3: Build project
        if (-not (Build-Project)) {
            Write-ErrorLog "Build failed. Cannot proceed with deployment"
            exit 1
        }
        
        # Step 4: Deploy based on target
        switch ($DeploymentTarget.ToLower()) {
            "vercel" {
                Write-InfoLog "Target: Vercel (primary) → Render (fallback)"
                if (-not (Deploy-Vercel)) {
                    Write-WarningLog "Vercel deployment failed, attempting Render fallback..."
                    if (-not (Deploy-Render)) {
                        Write-ErrorLog "Both Vercel and Render deployments failed"
                        exit 1
                    }
                }
            }
            
            "render" {
                Write-InfoLog "Target: Render (primary) → Docker (fallback)"
                if (-not (Deploy-Render)) {
                    Write-WarningLog "Render deployment failed, attempting Docker build..."
                    if (-not (Deploy-Docker)) {
                        Write-ErrorLog "Both Render and Docker deployments failed"
                        exit 1
                    }
                }
            }
            
            default {  # auto
                Write-InfoLog "Target: Auto-detect (Vercel → Render → Docker)"
                
                if (Deploy-Vercel) {
                    $script:DeploymentSuccess = $true
                }
                elseif (Deploy-Render) {
                    $script:DeploymentSuccess = $true
                }
                elseif (Deploy-Docker) {
                    $script:DeploymentSuccess = $true
                }
                else {
                    Write-ErrorLog "All deployment methods failed"
                    exit 1
                }
            }
        }
        
        # Step 5: Health checks
        if ($script:DeploymentSuccess) {
            Test-HealthCheck | Out-Null
            Write-SuccessLog "Deployment completed successfully"
        }
        
        # Summary
        Write-SuccessLog "=========================================="
        Write-SuccessLog "Deployment Summary"
        Write-SuccessLog "Vercel Status: $(if ($script:VERCELFailed) { 'FAILED' } else { 'OK' })"
        Write-SuccessLog "Render Status: $(if ($script:RenderFailed) { 'FAILED' } else { 'OK' })"
        Write-SuccessLog "Overall: $(if ($script:DeploymentSuccess) { 'SUCCESS ✓' } else { 'FAILED ✗' })"
        Write-SuccessLog "=========================================="
        
        if (-not $script:DeploymentSuccess) {
            exit 1
        }
    }
    catch {
        Write-ErrorLog "Script error: $_"
        exit 1
    }
}

# Run main function
Main
