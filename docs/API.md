# API contract

The dashboard reads everything from the `DATA` object in `js/data.js`. Replace each key with a call to these endpoints.

| DATA key | Endpoint | Notes |
|---|---|---|
| `user`, `profile` | `GET /api/me` | Profile fields with a `done` flag each |
| `stats` | `GET /api/me/stats` | Connections, online batchmates, pending requests |
| `news` | `GET /api/announcements?limit=5` | Scoped to the user's campus |
| `events` | `GET /api/events?upcoming=true` | `POST /api/events/:id/rsvp`, `DELETE` to cancel |
| `mentors` | `GET /api/mentors` | `POST /api/mentors/:id/connect`, `DELETE` to withdraw |
| `jobs` | `GET /api/jobs` | Posted by verified alumni |
| `fund` | `GET /api/fundraisers?status=active` | `null` when none are active |
| `gallery` | `GET /api/gallery?limit=5` | Image URLs and captions |

Suggested tables: `users`, `batches`, `campuses`, `announcements`, `events`, `event_rsvps`, `mentor_profiles`, `connections`, `jobs`, `fundraisers`, `donations`, `media`.
