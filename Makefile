# プロジェクト設定
PROJECT_ID := daily-report-482808
REGION := asia-northeast1
SERVICE_NAME := daily-report
IMAGE_REGISTRY := $(REGION)-docker.pkg.dev
IMAGE_NAME := $(IMAGE_REGISTRY)/$(PROJECT_ID)/$(SERVICE_NAME)/$(SERVICE_NAME)

# Git情報
GIT_SHA := $(shell git rev-parse --short HEAD)
IMAGE_TAG := $(IMAGE_NAME):$(GIT_SHA)
IMAGE_LATEST := $(IMAGE_NAME):latest

.PHONY: help build push deploy deploy-full clean logs

help: ## ヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: ## Dockerイメージをビルド
	docker build -t $(IMAGE_TAG) -t $(IMAGE_LATEST) .

push: ## イメージをArtifact Registryにプッシュ
	docker push $(IMAGE_TAG)
	docker push $(IMAGE_LATEST)

deploy: ## Cloud Runにデプロイ（イメージは既にプッシュ済みの想定）
	gcloud run deploy $(SERVICE_NAME) \
		--image $(IMAGE_TAG) \
		--platform managed \
		--region $(REGION) \
		--project $(PROJECT_ID) \
		--allow-unauthenticated \
		--port 8080 \
		--memory 512Mi \
		--cpu 1 \
		--min-instances 0 \
		--max-instances 10

deploy-full: build push deploy ## ビルド→プッシュ→デプロイを一括実行

clean: ## ローカルのDockerイメージを削除
	docker rmi $(IMAGE_TAG) $(IMAGE_LATEST) 2>/dev/null || true

logs: ## Cloud Runのログを表示
	gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$(SERVICE_NAME)" \
		--project $(PROJECT_ID) \
		--limit 50 \
		--format "table(timestamp,textPayload)"

configure-docker: ## Docker認証を設定
	gcloud auth configure-docker $(IMAGE_REGISTRY)

set-project: ## GCPプロジェクトを設定
	gcloud config set project $(PROJECT_ID)
