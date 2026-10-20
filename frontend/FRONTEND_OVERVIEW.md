# SportMate Frontend Overview

## What has been built

SportMate's frontend is built with Next.js 14, React, TypeScript, and Tailwind CSS. It has public landing and account pages, separate player and venue-owner areas, and a shared Supabase client.

### Main user flows

- **Accounts:** Sign-up and sign-in use Supabase Auth. Registration collects a name and account type, then routes users to the player or venue-owner area.
- **Players:** Players can explore games, host a game or request a court booking, view their listings, browse venues, and open a messaging screen.
- **Venue owners:** Venue owners have screens for a dashboard, venues and courts, bookings, messages, reviews, and settings.
- **Shared UI:** Forms use validation, and the app includes reusable empty states, status badges, confirmation dialogs, and toast notifications.

### Current implementation status

- Supabase is used for account sign-up and sign-in.
- Player games, venue-owner data, bookings, and messages are primarily held in React context in browser memory. They do not persist after a refresh.
- `lib/apiClient.ts` is prepared to call the FastAPI backend, but the pages are not currently using it.
- The player venue directory uses an empty venue list in `app/lib/venues.ts`.
- The player messaging page has an empty hardcoded conversation list.
- Several controls are UI-only or incomplete. For example, the player dashboard filters are not connected to results, the landing page still has a hero-image placeholder, and the venue-list Edit action is not wired up.

## File guide

### App shell and public pages

| File | Purpose |
|---|---|
| `app/page.tsx` | Public landing page, product introduction, feature sections, and links to account pages. The hero image is a placeholder. |
| `app/layout.tsx` | Root layout, document metadata, and global stylesheet import. |
| `app/globals.css` | Tailwind CSS base, component, and utility directives. |
| `app/components/Navbar.tsx` | Reusable navigation component. Role-specific layouts currently define their own navigation as well. |
| `app/login/page.tsx` | Validated login form, account-type selection, Supabase sign-in, and post-login routing. |
| `app/register/page.tsx` | Two-step registration form, validation, account-type selection, Supabase sign-up, and confirmation or redirect. |

### Player pages

| File | Purpose |
|---|---|
| `app/player/layout.tsx` | Shared player navigation and provider for player-area data. |
| `app/player/dashboard/page.tsx` | Game discovery screen with sport, location, and skill-level filter controls. Currently displays context data; filters are not connected to results. |
| `app/player/host/page.tsx` | Form to host a game or request a court booking. Adds records to in-memory shared state. |
| `app/player/listings/page.tsx` | Displays games hosted during the current app session. |
| `app/player/messages/page.tsx` | Player messaging interface. Its conversation list is currently hardcoded empty. |
| `app/player/venues/page.tsx` | Venue discovery list with search and filters. The underlying venue data is currently empty. |
| `app/player/venues/[venueId]/page.tsx` | Venue details, discounts, events, and a link to begin booking. |
| `app/player/venues/components/VenueCard.tsx` | Venue card used in the discovery list. |
| `app/player/venues/components/DiscountCard.tsx` | Discount display card. |
| `app/player/venues/components/EventCard.tsx` | Venue event display card. |
| `app/player/venues/components/EmptyState.tsx` | Empty-results UI for player venue screens. |

### Venue-owner pages

| File | Purpose |
|---|---|
| `app/venue-owner/layout.tsx` | Shared venue-owner sidebar, header, and data provider. |
| `app/venue-owner/context/VenueOwnerContext.tsx` | Shared venue-owner data types and in-memory state/actions for venues, courts, bookings, games, messages, reviews, and profile. It also reads the signed-in user's name and email from Supabase Auth. |
| `app/venue-owner/page.tsx` | Dashboard statistics and upcoming bookings. |
| `app/venue-owner/add-venue/page.tsx` | Validated form for adding a venue to the in-memory context. |
| `app/venue-owner/venues/page.tsx` | Venue list, search, and delete flow. The Edit menu action is not implemented. |
| `app/venue-owner/venues/[venueId]/page.tsx` | Venue details and court-management interface. |
| `app/venue-owner/bookings/page.tsx` | Booking list with status and venue filters, player search, and booking actions. |
| `app/venue-owner/messages/page.tsx` | Venue-owner conversation list and chat UI backed by context state. |
| `app/venue-owner/reviews/page.tsx` | Review summary, rating distribution, and filters. |
| `app/venue-owner/settings/page.tsx` | Profile, business, notification, and security settings UI. Some settings are local UI state rather than persisted backend data. |
| `app/venue-owner/components/ui.tsx` | Shared toast, confirmation modal, empty-state, status-badge, and related UI helpers. |

### Shared frontend code and configuration

| File | Purpose |
|---|---|
| `lib/supabaseClient.ts` | Creates the shared Supabase client, configured for persistent sessions and token refresh. |
| `lib/apiClient.ts` | Shared FastAPI request helper for JSON requests, Supabase access-token headers, and API errors. It is not currently used by app pages. |
| `lib/types.ts` | Shared TypeScript data types for users, sports, matches, venues, and courts. |
| `lib/mock-data.ts` | Sample user, match, venue, and court records. |
| `app/lib/venues.ts` | Public venue, discount, and event types plus venue lookup helper. Its exported venue list is empty. |
| `package.json` | Frontend dependencies and development, build, start, and lint scripts. |
| `next.config.js` | Next.js configuration, including React Strict Mode. |
| `SportMate_10Week_Roadmap_Supabase.md` | Product development roadmap and intended frontend/backend responsibilities. |

## Recommended next step

Connect the screens to the FastAPI API client and replace in-memory or empty data with persistent backend data. Start with the core player game flow (browse, host, and list games), then connect venue and booking management. Once those flows use real data, integrate messaging and any Supabase Realtime or Storage features that are needed.
