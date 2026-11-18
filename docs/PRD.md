# South Asian University alumni portal · Product requirements

**First release · revised 18 November 2026**

A graduate should be able to discover a mentor, book an office hour, and know exactly where they stand when the session fills. The same booking workflow serves reunions. The product assumes one institution, free events and one seat per member per event.

## The two hard problems

**1. Who gets the last seat?** Suppose a mentor has one portfolio-review seat. Asha and Dev both see it as available and tap Reserve. Reading a count in the browser cannot settle that race. The first transaction to acquire the event’s MySQL row lock gets to decide against committed bookings. The next transaction sees the seat taken and gives its applicant a numbered place on the waitlist. Fairness means order of admission by the database. Network arrival times are not authoritative.

**2. What if a cancellation stops halfway through?** Suppose Asha holds the seat, Dev is first in line and Mira is second. Releasing Asha’s seat changes two people’s records. If the server stops between those changes, the seat could go unused or a newcomer could jump the queue. A single MySQL transaction releases Asha and confirms Dev together. When promotion fails, the database rolls the cancellation back. Mira still has exactly one person ahead of her.

The project demonstrates **concurrency control** and **multi-row atomicity**. A revision on a booking protects a member against delayed or repeated browser actions. The release stores current booking state. Historical roster reconstruction is outside its scope.

## Requirements and acceptance

| User | Capability | Observable result |
| --- | --- | --- |
| Applicant | Register with name, batch, email and password. | An organizer can approve or decline the application. A pending applicant can sign in and check their review state. |
| Approved member | Edit a profile, opt into directory discovery and add a mentoring topic. | Members can search by name, batch, location or professional field and open the upcoming office hours for a mentor. |
| Attendee | See availability, reserve or join a queue, withdraw and check a personal schedule. | With one seat and twenty simultaneous applicants, MySQL contains one confirmation and nineteen ordered waiters. |
| Waitlisted member | Be promoted automatically when the next seat opens. | Cancelling the seat holder confirms the first remaining waiter in the same commit. Rejoining goes to the tail. |
| Member | Read bulletins and send private text messages. | Each conversation is scoped to its two participants. New conversations target visible members. Members can continue an existing exchange after hiding their profile. Older messages load by cursor. |
| Organizer | Review members, publish a gathering or bulletin and inspect the roster. | A reunion needs capacity, venue and a future start. Office hours also require a visible mentor who has supplied a topic. |
| Team | Run repeatable tests on a clean installation. | The repository includes functional tests, coverage instrumentation, a real-browser journey and concurrent-user experiments. The later test report can cite measurements from a named run. |

## Architecture and data ownership

Use one Express application, one React/TypeScript client, MySQL with InnoDB and MongoDB. The service receives an authenticated request, validates the fields, checks access and delegates to a feature module. Static client assets share the API origin. Each database has a bounded connection pool.

| Store | Owned data | Why it belongs there |
| --- | --- | --- |
| MySQL | Member ID, name, batch, profile and opt-in flags, application state, sessions, events, bookings and waitlist tickets | Keys link an attendee to an event. A unique member/event pair prevents duplicate bookings. Seat and promotion decisions share one transaction. |
| MongoDB | Announcements, individual direct messages and career opportunity documents | A bulletin or opportunity is read as one item. A thread is read in pages. Content records grow independently of transactional bookings. |

Text length alone does not require MongoDB. The division follows which records change together. The booking service can complete a reservation while the content store is unavailable. A new message checks current membership in MySQL, then writes a single document to MongoDB. Display names on messages are snapshots. Account identity stays in MySQL. The app limits a message to 32,000 characters and a bulletin body to 50,000. MongoDB’s BSON limit is 16 MiB per document. [MongoDB limits](https://www.mongodb.com/docs/manual/reference/limits/)

## Booking contract

- The client submits its intent and the booking revision it last read. A missing booking starts at revision zero.
- Inside an explicit transaction, the service locks the event by ID, checks the database clock and counts seats and waiting tickets. Every booking writer uses this same lock. [MySQL locking reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)
- If capacity remains, joining confirms the member. Otherwise the member receives a ticket after the last current waiter. Current waitlist position counts the waiting tickets ahead of that member.
- A withdrawal clears the member’s ticket. A confirmed cancellation also promotes the lowest waiting ticket, when present. Both revisions advance and the server replies after commit. A stale revision returns HTTP 409 with the latest booking.
- Changing a booking after the event starts is rejected. The published capacity and event time are fixed for the first release. Members can inspect their saved booking after a restart.
- No network call to MongoDB occurs while MySQL holds an event lock. The backend keeps transaction retries bounded and releases the borrowed connection.

## Frontend and scope

The client opens on a photographic SAU dashboard with navy, ivory and muted gold, self-hosted Inter for application text and DM Serif Text for editorial headings. A persistent left sidebar provides Dashboard, Events, Announcements, Donations, Messenger, Careers, Mentors, Gallery, Alumni directory and My schedule. Profile & settings includes a dark/light appearance preference saved on the current device. Organizers also see an organizer desk. Our university and Sources & credits provide verified institutional information and image attribution. The sidebar becomes a collapsible drawer on mobile. The event action explains automatic promotion before signup. Booking state refreshes on page focus, after an action and every 30 seconds while the page is visible. Text labels distinguish confirmed and waitlisted states on small screens.

The source screenshots and original fixture dashboard informed the choice of features. The [design research](SAU-DESIGN-RESEARCH.md) records the reference audit and institutional sources. Gallery presents a local collection of licensed SAU photography with dated descriptions and credits. Careers supports business-owner declarations, member-authored postings, owner-only editing and closing, discovery filters and messaging. Synthetic seed content uses normal presentation while provenance remains in stored metadata and test documentation. Visible mentors publish their own office hours and inspect their attendee lists. Booking dialogs expose confirmed seats and fair waitlists. Donations provides the university alumni association resource and a mentoring contribution path. Campaign management and photo uploads remain future features.

## Demonstration and verification

1. Publish a portfolio review with one seat. Sign in two graduates and submit their requests together. Inspect the confirmed and waitlisted rows.
2. Add a third member. Release the confirmed seat. The first waiter’s schedule now shows the confirmation and the other member stays in line.
3. Run the integration test that makes the promotion write fail. Verify both original booking states and revisions survive, then retry successfully.
4. Run the 1,000-user experiment against both databases. Inspect error rates, latency percentiles, stored confirmations, distinct queue tickets and post-load health separately. Use the exact workload and environment when writing the test report.

The [API reference](API.md) describes each route. The [run instructions](../README.md) include database setup and test commands.
