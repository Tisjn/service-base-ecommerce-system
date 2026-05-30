CI / Registry & Secrets Setup Guide

This document explains how to securely provide registry credentials and CI secrets for GitLab CI (and short notes for Jenkins).

1) GitLab (recommended)
- Use Project > Settings > CI/CD > Variables to add variables.
  - Add `CI_REGISTRY_USER` and `CI_REGISTRY_PASSWORD` if you need custom credentials (GitLab provides them automatically for GitLab Container Registry).
  - Add `DOCKER_USERNAME` / `DOCKER_PASSWORD` if using external registries (Docker Hub, AWS ECR, GCR).
  - For tokens: use Deploy Tokens (Repository > Settings > Repository > Deploy Tokens) or Personal Access Tokens.
- Important flags:
  - "Protected": only available on protected branches/tags.
  - "Masked": value is hidden from job logs. Use for passwords and tokens.

2) Variables to set (examples used by .gitlab-ci.yml):
- `CI_REGISTRY` (GitLab provides)
- `CI_REGISTRY_USER` (GitLab provides)
- `CI_REGISTRY_PASSWORD` (GitLab provides)
- `CI_REGISTRY_IMAGE` (optional, e.g. registry.gitlab.com/<group>/<project>)
- `DOCKER_AUTH_CONFIG` (optional, full JSON auth for advanced docker login)

3) Example GitLab snippet (already used in pipeline):

before_script:
  - echo "$CI_REGISTRY_PASSWORD" | docker login -u "$CI_REGISTRY_USER" --password-stdin $CI_REGISTRY

4) Docker layer cache tips
- Push a tagged image (e.g. `...:cache`) after successful build and use `--cache-from $CI_REGISTRY_IMAGE:cache` when building.
- Keep cache tags short-lived or update them on major base-image changes.

5) Jenkins notes
- Use Jenkins Credentials (Username with password / Secret text) and reference them in pipelines via credentials binding.
- For Docker builds, store DockerHub or registry credentials and use `docker.withRegistry()` in a `Jenkinsfile`.

6) Best practices
- Rotate tokens periodically; prefer scoped deploy tokens over personal tokens.
- Use least-privilege tokens (pull/push only as needed).
- Protect variables used for deployments and production tags.
- Avoid printing secrets; use masked variables and avoid `set -x` in scripts.

7) Troubleshooting
- "denied: requested access to the resource is denied": verify registry path and that the token has push rights.
- Login failures in CI but works locally: check masked/protected flag and runner environment.

If you want, I can:
- Add a `Jenkinsfile` example showing Docker login with credentials.
- Configure example GitLab variables in a README or generate `.gitlab/variables.example` (without real secrets).
