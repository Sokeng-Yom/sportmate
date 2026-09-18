   # API Conventions

   ## Auth
   Every protected endpoint requires `Authorization: Bearer <supabase-access-token>`.
   FastAPI verifies the token against Supabase's JWT secret — it never issues its own tokens
   or stores passwords.

   ## Resource naming
   All endpoints are namespaced under `/api/v1/`, e.g. `/api/v1/matches`.

   ## Pagination
   \`\`\`json
   { "items": [...], "total": 0, "page": 1, "page_size": 20 }
   \`\`\`

   ## Error responses
   \`\`\`json
   { "detail": "Human-readable message" }
   \`\`\`

   ## Status codes
   200 OK · 201 Created · 400 Bad Request · 401 Unauthorized · 403 Forbidden ·
   404 Not Found · 422 Unprocessable Entity · 500 Internal Server Error