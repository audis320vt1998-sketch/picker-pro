# 19 — Security

## 1. Security Principles

1. **No secrets in code** — all credentials are environment variables.
2. **Input validation** — all API payloads are validated before processing.
3. **Least privilege** — database user has only the permissions needed.
4. **Auditability** — all reviewer actions are logged with identity and timestamp.
5. **Traceability** — every exported value is linked to its source row (prevents undetected tampering).

## 2. Secret Management

| Secret | Storage |
|---|---|
| `DATABASE_URL` | Environment variable |
| `OPENAI_API_KEY` | Environment variable |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | Environment variables |

- Secrets are **never** committed to the repository.
- `.env.local` is listed in `.gitignore`.
- `.env.example` contains only placeholder values with no real credentials.

## 3. API Security

### 3.1 Input Validation

- All multipart file uploads are validated for MIME type and file size before processing.
- JSON payloads are validated against TypeScript schemas at the API layer.
- File size limits are enforced (`MAX_UPLOAD_SIZE_MB`, default: 20 MB per file).

### 3.2 Error Responses

- API errors return generic messages; internal stack traces are never exposed to clients.
- Sensitive fields (database errors, file paths) are stripped from error responses.

### 3.3 Authentication (Planned)

- v1.0 does not include authentication (single-tenant, internal deployment).
- v1.x will add JWT-based authentication with role-based access control (RBAC).

### 3.4 Rate Limiting

- The `/api/process` endpoint enforces a rate limit per IP (configurable; default: 10 requests/minute).
- The `/api/ai` endpoint enforces a stricter rate limit (default: 5 requests/minute) to control OpenAI API costs.

## 4. File Upload Security

- Uploaded files are stored in object storage, not on the application server filesystem.
- Files are referenced by opaque UUIDs; original filenames are not used in storage paths.
- Uploaded files are scanned for known malicious patterns before OCR processing.
- Files are deleted from storage after a configurable retention period (default: 30 days).

## 5. Data at Rest

- PostgreSQL databases in production use encryption at rest (managed by the hosting provider).
- Object storage buckets use server-side encryption (SSE).

## 6. Data in Transit

- All traffic between the client and server uses TLS 1.2+.
- Database connections use SSL (`sslmode=require`).
- Storage connections use HTTPS.

## 7. Dependency Security

- Dependencies are audited with `npm audit` in CI.
- Dependabot is configured to automatically open PRs for security updates.
- Only dependencies with active maintenance and no known critical vulnerabilities are introduced.

## 8. CodeQL Analysis

- GitHub CodeQL analysis runs on every pull request (see `.github/workflows/`).
- All CodeQL findings must be reviewed and resolved or triaged before merging.

## 9. OCR and AI Security

- OCR is performed on the server; raw image data does not leave the server to a third-party OCR service.
- AI correction via OpenAI API sends only extracted text (not raw images) to OpenAI.
- Users are informed via the Privacy Notice that extracted text may be sent to OpenAI.

## 10. Audit Log

The following actions are recorded in the audit log with user identity and timestamp:

| Action | Logged |
|---|---|
| Job submitted | Yes |
| Page OCR completed | Yes |
| Review item approved / corrected / rejected | Yes |
| Export generated | Yes |
| Catalog updated | Yes |
| Settings changed | Yes |
