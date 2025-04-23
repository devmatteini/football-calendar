#!/usr/bin/env bash

set -euo pipefail

TAG=$(git log -1 --pretty=%h HEAD)
BASE_IMAGE="ghcr.io/devmatteini/football-calendar"

BASE_IMAGE_TAG="$BASE_IMAGE:$TAG"
BASE_IMAGE_LATEST="$BASE_IMAGE:latest"

echo "Tag: $TAG"
echo "Image: $BASE_IMAGE"

if ! docker info -f '{{ .DriverStatus }}' | grep io.containerd.snapshotter &>/dev/null; then
  echo "Docker is not using containerd snapshotter. Please check your Docker configuration https://docs.docker.com/build/building/multi-platform/#prerequisites"
  exit 1
fi

docker buildx build --platform linux/arm64 --load -t "$BASE_IMAGE" -f Dockerfile .

docker tag "$BASE_IMAGE" "$BASE_IMAGE_TAG"
docker tag "$BASE_IMAGE" "$BASE_IMAGE_LATEST"

echo "$GITHUB_CONTAINER_REGISTRY_TOKEN" | docker login ghcr.io -u devmatteini --password-stdin

docker push "$BASE_IMAGE_TAG"
docker push "$BASE_IMAGE_LATEST"
