# Alumni portal API

All routes use the `/api` prefix. The sign-in response sets a seven-day HttpOnly session cookie. Member and organizer access require an approved account. Only the service assigns member IDs, roles, booking status and queue tickets.

| Method and path | Access | Request and response |
| --- | --- | --- |
| GET /health | Public | Returns ready when both MySQL and MongoDB respond. |
| POST /auth/register | Public | Email, password (10–256 characters), name and graduation batch. Returns 201 with ID and pending status. |
| POST /auth/login | Public | Email and password. Returns 204 and a session cookie. |
| POST /auth/logout | Signed in | Revokes the current session and expires its cookie. Returns 204. |
| GET /me | Signed in | Own profile, email, role and review state. |
| PATCH /me | Member | Submit name, city, field, visible and mentorTopic together. Hiding a profile clears its mentoring topic. |
| GET /members | Member | Directory array, optionally filtered by q, batch, mentor=true, city, field and page. City and professional-field matches are applied by MySQL before pagination. |
| GET /applications | Organizer | Pending applicants, ordered by ID. |
| PATCH /applications/:id | Organizer | Supply status of approved or declined. Only a pending applicant can be reviewed. |
| GET /events | Member | Upcoming events with available seats, optionally filtered by kind, mentorId and page. Add period=past for the archive. The default is period=upcoming. |
| POST /events | Organizer | Title, description, kind (reunion or office_hours), startsAt with UTC offset, venue, capacity and mentorId for office hours. Returns 201 with ID. |
| POST /mentor-sessions | Visible approved mentor | Title, description, startsAt, venue and capacity. The service assigns the current member as host and office_hours as the kind. |
| GET /events/:id | Member | Event details and caller’s status, revision and queuePosition. |
| PUT /events/:id/rsvp | Member | Supply intent (join or leave) and expectedRevision. Returns the caller’s committed booking. |
| GET /me/bookings | Member | Personal schedule including cancelled bookings, with current queue positions. |
| GET /events/:id/roster | Session host or organizer | Confirmed attendees followed by waiters in ticket order. |
| GET /announcements | Member | Newest announcements first. Optional before cursor. |
| GET /jobs | Member | Open, unexpired listings. Optional q, location, type and page. mine=true includes the caller's own closed and expired listings. Literal text filters and pages of up to 30. |
| POST /jobs | Member | Title, company, location, workMode, type, field, description, skills, salaryRange, future closesAt and businessOwner=true. The service supplies poster identity and publication time. |
| PATCH /jobs/:key | Posting owner | Edit validated posting fields or set status to open or closed. An expired role needs a future closing date before reopening. |
| POST /announcements | Organizer | Title and body. Returns 201 with the published document. |
| GET /messages | Member | Caller’s conversation summaries, newest first. Optional page. |
| GET /messages/:peer | Member | Messages between the caller and this peer. Optional before cursor. |
| POST /messages/:peer | Member | Body text up to 32,000 characters. Returns 201 with the saved message. |

Page numbers start at one. Directory, event and inbox pages contain up to 30 items. Announcement and thread reads return `{items, next}`. Pass the opaque `next` value as `before` for the next older page. A null cursor means the end.

## Final-seat example

```http
PUT /api/events/42/rsvp
Content-Type: application/json

{"intent":"join","expectedRevision":0}
```

A full event returns HTTP 200 with `{"status":"waitlisted","revision":1,"queuePosition":1}`. When the seat holder withdraws, the first waiter’s booking becomes `{"status":"confirmed","revision":2,"queuePosition":null}`. A delayed withdrawal carrying revision one receives 409 with `code: "STALE_BOOKING"` and the latest state under `current`. Refresh before confirming another action.

Validation errors use 422, malformed JSON uses 400, oversized request bodies use 413, missing sessions use 401 and insufficient access uses 403. Unknown events or unavailable recipients use 404. Closed events and stale writes use 409. Rate-limited authentication uses 429. A failed database operation returns 503. All errors provide a machine-readable code.
