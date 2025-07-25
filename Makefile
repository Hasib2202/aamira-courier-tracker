.PHONY: help install dev build test clean docker-up docker-down

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies for both server and client
	@echo "Installing server dependencies..."
	cd server && pnpm install
	@echo "Installing client dependencies..."
	cd client && pnpm install

dev: ## Start development servers
	@echo "Starting development environment..."
	docker-compose -f docker-compose.dev.yml up -d mongodb
	@echo "Starting server in development mode..."
	cd server && pnpm dev &
	@echo "Starting client in development mode..."
	cd client && pnpm dev &
	@echo "Development servers started!"

build: ## Build both applications
	@echo "Building server..."
	cd server && pnpm build
	@echo "Building client..."
	cd client && pnpm build

test: ## Run tests
	@echo "Running server tests..."
	cd server && pnpm test
	@echo "Running client tests..."
	cd client && pnpm test

lint: ## Lint code
	@echo "Linting server code..."
	cd server && pnpm lint
	@echo "Linting client code..."
	cd client && pnpm lint

docker-up: ## Start with Docker Compose
	docker-compose up -d
	@echo "Application started at:"
	@echo "- Client: http://localhost:5173"
	@echo "- Server: http://localhost:3000"
	@echo "- API Health: http://localhost:3000/health"

docker-down: ## Stop Docker containers
	docker-compose down

docker-build: ## Build Docker images
	docker-compose build

clean: ## Clean build artifacts and node_modules
	@echo "Cleaning server..."
	cd server && rm -rf dist node_modules logs/*
	@echo "Cleaning client..."
	cd client && rm -rf dist node_modules
	@echo "Cleaning Docker..."
	docker-compose down -v
	docker system prune -f

setup: install ## Complete setup for development
	@echo "Setting up environment files..."
	cd server && cp .env.example .env
	cd client && cp .env.example .env
	@echo "Creating logs directory..."
	mkdir -p server/logs
	@echo "Setup complete! Run 'make dev' to start development servers."
