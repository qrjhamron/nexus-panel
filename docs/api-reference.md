# API Reference

The Nexus Panel exposes a versioned REST API under `/api/v1/`.

## API Versioning

All endpoints are prefixed with `/api/v1/`. Future breaking changes will be introduced under `/api/v2/`, with the previous version maintained for a deprecation period.

## Authentication

### JWT (Session-based)

Used by the frontend. Obtain a token by posting credentials to the login endpoint:

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-password"
}
```

Response:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "admin@example.com", "role": "admin" }
}
```

Include the token in subsequent requests:

```
Authorization: Bearer <accessToken>
```

### API Keys

For programmatic access. Create an API key in the Panel UI under **Account → API Keys**.

```
Authorization: Bearer nxs_aBcDeFgHiJkLmNoPqRsTuVwXyZ
```

API keys can be scoped to specific permissions (read-only, server management, admin, etc.).

## Common Patterns

### Pagination

List endpoints support cursor-based pagination:

```http
GET /api/v1/servers?page=1&perPage=25
```

Response includes pagination metadata:

```json
{
  "data": [...],
  "meta": {
    "total": 42,
    "page": 1,
    "perPage": 25,
    "lastPage": 2
  }
}
```

### Error Responses

All errors follow a consistent format:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Server with ID abc-123 not found"
}
```

Common status codes:

| Code | Meaning                  |
|------|--------------------------|
| 400  | Bad Request / Validation |
| 401  | Unauthorized             |
| 403  | Forbidden                |
| 404  | Not Found                |
| 409  | Conflict                 |
| 422  | Unprocessable Entity     |
| 429  | Rate Limited             |
| 500  | Internal Server Error    |

### Sorting & Filtering

```http
GET /api/v1/servers?sort=name&order=asc&search=minecraft
```

## Key Endpoints

| Method | Endpoint                            | Description                |
|--------|-------------------------------------|----------------------------|
| POST   | `/api/v1/auth/login`                | Authenticate               |
| POST   | `/api/v1/auth/register`             | Register (if enabled)      |
| GET    | `/api/v1/users`                     | List users (admin)         |
| GET    | `/api/v1/servers`                   | List servers               |
| POST   | `/api/v1/servers`                   | Create server (admin)      |
| GET    | `/api/v1/servers/:id`               | Get server details         |
| POST   | `/api/v1/servers/:id/power`         | Power action               |
| WS     | `/api/v1/servers/:id/console`       | Console WebSocket          |
| GET    | `/api/v1/servers/:id/files`         | List files                 |
| GET    | `/api/v1/nodes`                     | List nodes (admin)         |
| POST   | `/api/v1/nodes`                     | Create node (admin)        |
| GET    | `/api/v1/eggs`                      | List eggs                  |
| POST   | `/api/v1/eggs`                      | Create egg (admin)         |

## Swagger UI

When running in development mode, interactive API documentation is available at:

```
http://localhost:3000/api/docs
```

The OpenAPI specification can be downloaded at:

```
http://localhost:3000/api/docs-json
```
