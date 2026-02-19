# PowerShell Initialization Script
# Run: .\init.ps1

Write-Host "🚀 Starting initialization..." -ForegroundColor Green

# Install backend dependencies
Write-Host "`n📦 Installing backend dependencies..." -ForegroundColor Yellow
cd backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend installation failed!" -ForegroundColor Red
    exit 1
}
cd ..

# Install frontend dependencies
Write-Host "`n📦 Installing frontend dependencies..." -ForegroundColor Yellow
cd frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend installation failed!" -ForegroundColor Red
    exit 1
}
cd ..

# Copy environment files
Write-Host "`n📝 Setting up environment files..." -ForegroundColor Yellow
if (Test-Path "backend\.env.example") {
    if (-not (Test-Path "backend\.env")) {
        Copy-Item "backend\.env.example" "backend\.env"
        Write-Host "✅ Backend .env created" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Backend .env already exists" -ForegroundColor Yellow
    }
}
if (Test-Path "frontend\.env.example") {
    if (-not (Test-Path "frontend\.env")) {
        Copy-Item "frontend\.env.example" "frontend\.env"
        Write-Host "✅ Frontend .env created" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Frontend .env already exists" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Initialization complete!" -ForegroundColor Green
Write-Host "`n📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit backend/.env with your database credentials"
Write-Host "2. Edit frontend/.env with API URL (VITE_API_URL=http://localhost:5000)"
Write-Host "3. Create PostgreSQL database (or use Railway)"
Write-Host "4. Run: node backend/scripts/initDatabase.js"
Write-Host "5. Run: node backend/scripts/createAdmin.js"
Write-Host "6. Start backend (Terminal 1): cd backend; npm run dev"
Write-Host "7. Start frontend (Terminal 2): cd frontend; npm run dev"
Write-Host "`n🌐 Access: http://localhost:3000" -ForegroundColor Green

