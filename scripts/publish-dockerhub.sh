#!/usr/bin/env bash
# Shell script to build and push ExcaliSpace to Docker Hub
set -e

TAG="${1:-latest}"
DOCKER_USER="${2:-rodrigodanieli}"
IMAGE_NAME="${3:-excalispace}"
FULL_IMAGE="${DOCKER_USER}/${IMAGE_NAME}:${TAG}"

echo "🐳 ExcaliSpace Docker Hub Publisher"
echo "Target Image: ${FULL_IMAGE}"

# Check Docker is accessible
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker daemon is not running."
    exit 1
fi

echo "📦 Building Docker image from ./docker/Dockerfile..."
docker build -f docker/Dockerfile -t "${FULL_IMAGE}" -t "${DOCKER_USER}/${IMAGE_NAME}:latest" .

echo "🔑 Authenticating with Docker Hub..."
docker login

echo "🚀 Pushing ${FULL_IMAGE} to Docker Hub..."
docker push "${FULL_IMAGE}"

if [ "${TAG}" != "latest" ]; then
    echo "🚀 Pushing ${DOCKER_USER}/${IMAGE_NAME}:latest to Docker Hub..."
    docker push "${DOCKER_USER}/${IMAGE_NAME}:latest"
fi

echo "✅ Image published successfully!"
echo "Pull command: docker pull ${FULL_IMAGE}"
