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

   ## Venue offers and events
   Approved venue owners can manage offers and events with the authenticated endpoints:
   `GET /api/v1/venues/browse` returns approved venues with their courts, discounts, and events.
   `GET/POST /api/v1/venues/{venue_id}/discounts`,
   `PATCH/DELETE /api/v1/venues/{venue_id}/discounts/{discount_id}`,
   `GET/POST /api/v1/venues/{venue_id}/events`, and
   `PATCH/DELETE /api/v1/venues/{venue_id}/events/{event_id}`.
   Players can read these resources only for approved venues. Match listings support the
   optional `skill_level` filter.