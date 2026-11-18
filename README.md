# South Asian University · Alumni Network

A working alumni portal for a single institution. Members find classmates, book reunions and mentor office hours, read bulletins, and exchange direct messages. Organizers review applications, publish events and inspect the queue.

The SAU redesign includes a photographic welcome page, editorial dashboard, directory filters, past-event discovery, a university section and a credited gallery. Verified facts live in `web/src/sau-information.json`. Local responsive photographs and their source/license manifest live in `web/public/assets/sau/`. The [design research](docs/SAU-DESIGN-RESEARCH.md) records reference findings, access limits, rights decisions and implementation boundaries.

## Run locally

Use Node 22.14 or newer. The Compose file starts MySQL and MongoDB bound to loopback and keeps data in named volumes. Run the following from the directory containing `package.json`. The copy commands below use PowerShell.

```powershell
npm ci
Copy-Item .env.example .env
Copy-Item .env.test.example .env.test
docker compose up -d
docker compose logs mysql
```

Once MySQL reports ready for connections, run the initializer, build the client and start Express.

```powershell
npm run db:init
npm run build
npm start
```

Open [the portal](http://localhost:3000). Sign in with the organizer email and password in the local `.env`. Use **Organizer desk** to create a gathering or announcement. In another browser profile, apply to join, approve the application from the organizer desk, and press **Check status** in the applicant’s window. Members who enable directory visibility can be found under **People**. Adding a mentoring topic makes that member available as an office-hours host. For a frontend development server, keep Express running and use `npm run dev` at [the development address](http://localhost:5173).

**Native databases.** An existing local MySQL 8.0.16+ or 8.4 server and MongoDB 8.0 can also be used. Create an empty MySQL database, give the initialization account rights to create its tables, and set `MYSQL_URL`, `MONGO_URL` and `MONGO_DB` in `.env`. Run the same three application commands. The test runner needs a separate local SQL account that can create and drop scratch databases and create fixture triggers. Test runs generate their own random database names.

## Populate the local demonstration

Run `npm run db:seed` after database initialization. It creates 24 approved synthetic alumni, an alumni office account, three pending applicants, 12 mentoring profiles, 16 events, bookings, six announcements, six career listings and populated conversations. Existing approved accounts receive four incoming conversations. The script preserves existing accounts, profile edits and booking actions on subsequent runs. A failed run can be retried with the same command.

Use `asha.rao@sau-alumni.example.test` for a member with a populated schedule or `office@sau-alumni.example.test` for organizer access. Newly created seed accounts use the password `AlumniDemo2026!`. Set `DEMO_PASSWORD` before the first seed run to choose another password. Subsequent runs preserve account passwords. Seeded people, companies, compensation and activities are synthetic. Their presentation uses normal names and content. Internal metadata and the test report record their provenance. Existing seed email addresses migrate to the new domain while retaining member IDs and sessions.

The seed uses MySQL for members, events and bookings. Announcements, messages and career listings live in MongoDB. Careers supports alumni business posting, owner-only editing and closing, discovery filters, role details and contacting the sharing alumnus through Messenger. Publishers confirm that they own or represent the business.

## Book or offer mentoring

Open **Mentors**, find a mentor and choose **View office hours**. Select a published session to open its booking dialog, then choose **Reserve or join waitlist**. Check the result in **My schedule**. Releasing a confirmed seat promotes the first waiter automatically.

To host, add a mentoring topic and enable directory visibility in **Profile & settings**. Return to **Mentors** and use **Publish office hours** to set a time, location and capacity. A capacity of one provides a one-to-one appointment. Your **My office hours** panel shows published sessions and their attendee lists. Organizers can also publish sessions through their desk.

## Application layout

The portal opens in dark mode with all sections in the left sidebar. Open **Profile & settings → Appearance** to choose Dark or Light. The preference is saved on the current device. On mobile, use the top-left menu button to open the sidebar. Gallery contains the credited university collection. Careers and Donations connect members with verified university resources and alumni mentoring.

To regenerate the curated responsive asset library, run `node scripts/collect-sau-assets.js`. The script downloads four individually reviewed, openly licensed files and respects source retry requests. Additional official SAU media and the institutional logo are listed as pending permission in the manifest. Font files are self-hosted through Fontsource. The interface uses a typographic SAU wordmark.

| Location | Responsibility |
| --- | --- |
| `web/src` | React and TypeScript member pages, organizer desk and direct messaging |
| `server/app.js` | Express routes, validation, cookie sessions and access controls |
| `server/booking.js` | MySQL seat allocation, waitlisting and transactional promotion |
| `server/schema.sql` | MySQL members, sessions, events and bookings |
| `server/content.js` | MongoDB announcement and message documents, inbox and pagination |
| `tests` and `scripts/load.js` | Unit, HTTP, database integration, component, browser and concurrent-user tests |

The original static dashboard is available in the root `index.html`, `css` and `js` as a design reference. The built portal uses `web/index.html` and loads its data through the API.

## Run the tests

| Command | What it verifies |
| --- | --- |
| `npm test` | Fast Jest unit, API contract and React component tests. Database connections are mocked where needed. |
| `npm run test:integration` | Real HTTP handlers with real MySQL and MongoDB. Includes the final-seat race, stale retries, queue ordering, rollback during promotion and private message pagination. |
| `npm run test:coverage` | All Jest projects together with line, statement, function and branch coverage. HTML and LCOV files appear under `coverage/`. Measurements cover application modules and components. Entry points, setup scripts and the load generator are exercised separately. |
| `npm run test:browser` | After `npm run build`, tests the compiled application with two independent Chromium sessions, desktop and mobile sizes, a real login, a cancellation and a promotion. Set `BROWSER_PATH` if Chrome or Chromium is in a nonstandard location. |
| `npm run test:ui` | After `npm run build`, verifies sidebar destinations, both saved themes, and desktop, tablet and mobile layouts in Chromium using controlled API responses. |
| `npm run test:load` | Starts a local API on a free port, creates 1,000 distinct approved users and sessions and runs two concurrent HTTP workloads. Checks the stored seat and queue invariants and queries both databases after load. |

Database-backed runs read `.env.test` and only accept loopback test hosts. Each run provisions and removes its own databases. The browser and stress tests are separate commands so their resource usage does not distort a coverage run.

**Stress workload.** The default run opens a connection for each signed-in member, then releases 1,000 booking requests together against one seat. A second burst distributes the same users across events, bookings, announcements and inbox reads. The generator prints errors, throughput and p50/p95/p99 latency for each burst. Its default pass conditions are zero failed requests, all invariants satisfied, post-load readiness and p95 at or below 10,000 ms per burst. Change `LOAD_USERS` or `LOAD_P95_MS` for a named experiment. Set `LOAD_COLD=1` to include opening all connections in the first burst. The load generator, API and databases run on the same machine. Seeded sessions exclude login/password-hashing costs.

See [the product requirements](docs/PRD.md) and [the implemented API](docs/API.md).

## Capture verification evidence and generate the report

`npm run verify` runs type checking, production compilation, all Jest projects with coverage, three integrated browser journeys, the responsive/theme suite and the 1,000-user stress workloads in sequence. Use `npm run verify -- jest` or another phase name (`build`, `browser`, `ui`, `load`) for a focused rerun. Every invocation appends its timestamp, command, result and complete console output under a dated directory in `output/test-results`. Jest JSON includes each individual test result and passing assertion count. Stress runs retain per-request timing summaries.

The reporting utility requires Python with `reportlab` and `pypdf`. Run `python scripts/test-report.py output/test-results/YYYY-MM-DD` against the desired dated evidence directory. It writes the detailed PDF and complete evidence ZIP under `output/pdf`. Earlier failed attempts remain in the report. PDF rendering for visual review uses `pypdfium2`.
