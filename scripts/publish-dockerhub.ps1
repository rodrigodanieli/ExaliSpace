# PowerShell script to build and push ExcaliSpace to Docker Hub
param (
    [string]$Tag = "latest",
    [string]$DockerUser = "rodrigodanieli",
    [string]$ImageName = "excalispace"
)

$FullImage = "$DockerUser/$ImageName`:$Tag"

Write-Host "🐳 ExcaliSpace Docker Hub Publisher" -ForegroundColor Cyan
Write-Host "Target Image: $FullImage" -ForegroundColor Yellow

# Check if Docker is running
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker daemon is not running. Please start Docker Desktop first."
        exit 1
    }
} catch {
    Write-Error "Docker CLI not found or Docker is not running."
    exit 1
}

# Build image
Write-Host "📦 Building Docker image from ./docker/Dockerfile..." -ForegroundColor Cyan
docker build -f docker/Dockerfile -t $FullImage -t "$DockerUser/$ImageName`:latest" .

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed!"
    exit 1
}

Write-Host "🔑 Authenticating with Docker Hub (if not already logged in)..." -ForegroundColor Cyan
docker login

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker login failed. Please authenticate before pushing."
    exit 1
}

# Push image
Write-Host "🚀 Pushing $FullImage to Docker Hub..." -ForegroundColor Green
docker push $FullImage

if ($Tag -ne "latest") {
    Write-Host "🚀 Pushing $DockerUser/$ImageName`:latest to Docker Hub..." -ForegroundColor Green
    docker push "$DockerUser/$ImageName`:latest"
}

Write-Host "✅ Image published successfully!" -ForegroundColor Green
Write-Host "You can now run:" -ForegroundColor Cyan
Write-Host "  docker pull $FullImage" -ForegroundColor Yellow
