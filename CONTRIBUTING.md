# Contributing to Nexus Panel

Thanks for your interest in contributing! This guide will help you get started.

## Development Environment

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 16
- Rust 1.83+ (for Wings)
- Docker 20+ (for Wings runtime)
- `protoc` (Protocol Buffers compiler)

### Setup

```bash
# Clone the repo
git clone https://github.com/qrjhamron/nexus-panel.git
cd nexus-panel

# Install JS dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Start the backend in dev mode
npm run dev -w packages/backend

# Start the frontend in dev mode (separate terminal)
npm run dev -w packages/frontend

# Start Wings (separate terminal)
cd wings && cargo run
```

### Project Structure

```
nexus/
├── packages/
│   ├── shared/       # Shared types, proto definitions
│   ├── backend/      # NestJS API server
│   └── frontend/     # React SPA
├── wings/            # Rust daemon (Axum + Tonic)
├── scripts/          # Installer scripts
└── install.sh        # Unified installer
```

## Running Tests

```bash
# Backend tests
npm run test -w packages/backend

# Frontend tests
npm run test -w packages/frontend

# Wings tests
cd wings && cargo test

# Type checking
npm run typecheck -w packages/shared
npm run typecheck -w packages/backend
npm run typecheck -w packages/frontend
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes with clear commit messages
4. Ensure all tests pass
5. Push to your fork and open a Pull Request

### Commit Messages

Use conventional commits:

- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `refactor: restructure code`
- `test: add tests`
- `chore: update dependencies`

## Code Style

- **TypeScript**: Follow existing ESLint configuration
- **Rust**: Use `cargo fmt` and `cargo clippy`
- **Comments**: Only when code needs clarification

## Questions?

Open an issue if you have questions about the codebase or need guidance on a contribution.
