# Contributing to Nexus

Thank you for your interest in contributing to Nexus! This document covers everything you need to get started.

## Development Environment Setup

### Prerequisites

- **Node.js** >= 20.x (LTS recommended)
- **npm** >= 10.x
- **PostgreSQL** 16
- **Rust** >= 1.83 (for Wings development)
- **Docker** (for Wings runtime and testing)
- **Git**

### Getting Started

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/nexus.git
cd nexus

# Install Node.js dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env — set your local PostgreSQL credentials

# Start the Panel in development mode
npm run dev

# For Wings development (separate terminal)
cd wings
cargo run
```

### Project Structure

```
nexus/
├── packages/
│   ├── shared/       # Shared types, DTOs, and utilities
│   ├── backend/      # NestJS API server
│   └── frontend/     # React + Vite frontend
├── wings/            # Rust Wings daemon
├── docs/             # Documentation
├── scripts/          # Deployment and utility scripts
├── docker-compose.yml
└── package.json      # Workspace root
```

## Code Style

### TypeScript (Panel)

- **ESLint** and **Prettier** are configured in the workspace. Run `npm run lint` to check.
- Use `const` over `let` where possible; never use `var`.
- Prefer named exports over default exports.
- Use TypeScript strict mode — avoid `any`.
- Write JSDoc comments for public API functions and complex logic.

### Rust (Wings)

- Run `cargo fmt` before committing.
- Run `cargo clippy` and address warnings.
- Follow standard Rust naming conventions (`snake_case` for functions/variables, `PascalCase` for types).
- Use `thiserror` for custom error types; avoid `.unwrap()` in production code.
- Keep functions small and focused.

### Commits

- Use [Conventional Commits](https://www.conventionalcommits.org/) format:
  - `feat: add server backup scheduling`
  - `fix: correct memory limit calculation`
  - `docs: update Wings configuration reference`
  - `chore: upgrade TypeORM to 0.3.20`
- Keep commits atomic — one logical change per commit.
- Write clear, descriptive commit messages.

## Pull Request Process

1. **Create a feature branch** from `main`:

   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes** — keep the scope focused.

3. **Run checks locally**:

   ```bash
   # Panel
   npm run lint
   npm run typecheck
   npm run test

   # Wings
   cd wings && cargo fmt --check && cargo clippy && cargo test
   ```

4. **Push and open a PR** against `main`.

5. **Fill out the PR template** — describe what changed and why.

6. **Respond to review feedback** — maintainers may request changes.

7. **Merge** — PRs are squash-merged by a maintainer once approved and CI passes.

### PR Checklist

- [ ] Code compiles without warnings
- [ ] All existing tests pass
- [ ] New functionality includes tests
- [ ] Documentation updated if applicable
- [ ] No unrelated changes included

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests.
- Search existing issues before creating a new one.
- For bugs, include: steps to reproduce, expected behavior, actual behavior, environment details.
- For features, describe the use case and proposed solution.

## Project Governance

Nexus is maintained by its core team. Decisions are made through:

- **Issues and Discussions** — for proposals and community input
- **Pull Request reviews** — for code changes
- **Maintainer consensus** — for architectural decisions

Major changes should be discussed in an issue before implementation to avoid wasted effort.

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](../LICENSE).
