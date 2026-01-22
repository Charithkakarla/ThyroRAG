# Quick Start Script for Thyro RAG
# Run this script to set up everything

Write-Host "============================================" -ForegroundColor Green
Write-Host "  Thyro RAG - Quick Setup Script" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

# Check Python installation
Write-Host "[1/6] Checking Python installation..." -ForegroundColor Cyan
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  ✓ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Python not found! Please install Python 3.9+" -ForegroundColor Red
    exit 1
}

# Check if we're in the right directory
Write-Host ""
Write-Host "[2/6] Checking project structure..." -ForegroundColor Cyan
if (Test-Path "thyroidDF (1).csv") {
    Write-Host "  ✓ Dataset found" -ForegroundColor Green
} else {
    Write-Host "  ✗ Dataset not found! Please run from ThyroRAG directory" -ForegroundColor Red
    exit 1
}

# Install Python dependencies
Write-Host ""
Write-Host "[3/6] Installing Python dependencies..." -ForegroundColor Cyan
Write-Host "  This may take 5-10 minutes on first run..." -ForegroundColor Yellow
python -m pip install --upgrade pip
Set-Location backend
pip install -r requirements.txt
Set-Location ..

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Get Gemini API Key
Write-Host ""
Write-Host "[4/6] Gemini API Key Configuration" -ForegroundColor Cyan
Write-Host "  Do you have a Gemini API key? (Y/N)" -ForegroundColor Yellow
$hasKey = Read-Host

if ($hasKey -eq "Y" -or $hasKey -eq "y") {
    Write-Host "  Enter your Gemini API key:" -ForegroundColor Yellow
    $apiKey = Read-Host -AsSecureString
    $apiKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKey)
    )
    
    # Set environment variable
    $env:GEMINI_API_KEY = $apiKeyPlain
    Write-Host "  ✓ API key set for this session" -ForegroundColor Green
    
    # Update files
    (Get-Content "backend/create_vector_db.py") -replace 'YOUR_GEMINI_API_KEY_HERE', $apiKeyPlain | Set-Content "backend/create_vector_db.py"
    (Get-Content "backend/main.py") -replace 'YOUR_GEMINI_API_KEY_HERE', $apiKeyPlain | Set-Content "backend/main.py"
    Write-Host "  ✓ API key updated in files" -ForegroundColor Green
} else {
    Write-Host "  ℹ Get your free API key from: https://makersuite.google.com/app/apikey" -ForegroundColor Yellow
    Write-Host "  You can add it later in backend/create_vector_db.py and backend/main.py" -ForegroundColor Yellow
}

# Create vector database
Write-Host ""
Write-Host "[5/6] Creating vector database..." -ForegroundColor Cyan
Write-Host "  This will take 10-20 minutes (one-time setup)..." -ForegroundColor Yellow
Write-Host "  Press Enter to continue or Ctrl+C to skip" -ForegroundColor Yellow
Read-Host

Set-Location backend
python create_vector_db.py
Set-Location ..

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Vector database created" -ForegroundColor Green
} else {
    Write-Host "  ✗ Failed to create vector database" -ForegroundColor Red
    Write-Host "  You can run 'cd backend && python create_vector_db.py' manually later" -ForegroundColor Yellow
}

# Frontend setup
Write-Host ""
Write-Host "[6/6] Frontend setup..." -ForegroundColor Cyan
if (Test-Path "frontend/package.json") {
    Write-Host "  Do you want to install frontend dependencies? (Y/N)" -ForegroundColor Yellow
    $installFrontend = Read-Host
    
    if ($installFrontend -eq "Y" -or $installFrontend -eq "y") {
        Set-Location frontend
        Write-Host "  Installing npm packages..." -ForegroundColor Yellow
        npm install
        Set-Location ..
        Write-Host "  ✓ Frontend dependencies installed" -ForegroundColor Green
    }
}

# Summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Setup Complete! 🎉" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""cd backend && python main.py" -ForegroundColor White
Write-Host "  2. Start frontend: cd frontend && npm start" -ForegroundColor White
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "  - README.md - Project overview" -ForegroundColor White
Write-Host "  - RAG_SETUP_GUIDE.md - Complete setup guide" -ForegroundColor White
Write-Host "  - backend/README.md - Backend documentation" -ForegroundColor White
Write-Host "  - frontend/README.md - Frontendlete setup guide" -ForegroundColor White
Write-Host "  - SETUP_GUIDE.md - Frontend setup" -ForegroundColor White
Write-Host "  - PROJECT_SUMMARY.md - Full documentation" -ForegroundColor White
Write-Host ""
Write-Host "API endpoints (after starting backend):" -ForegroundColor Cyan
Write-Host "  - http://localhost:8000/ - API info" -ForegroundColor White
Write-Host "  - http://localhost:8000/predict - Disease prediction" -ForegroundColor White
Write-Host "  - http://localhost:8000/chat - RAG chatbot" -ForegroundColor White
Write-Host ""
Write-Host "Frontend (after starting):" -ForegroundColor Cyan
Write-Host "  - http://localhost:3000 - React app" -ForegroundColor White
Write-Host ""
Write-Host "Need help? Check RAG_SETUP_GUIDE.md" -ForegroundColor Yellow
Write-Host ""
