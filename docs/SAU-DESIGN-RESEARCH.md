# SAU alumni portal research and implementation brief

Research reviewed on 18 November 2026.

## Existing application audit

The application uses React 19, TypeScript and Vite. Express 5 exposes cookie-authenticated HTTP endpoints. MySQL owns members, review decisions, sessions, events and transactional bookings. MongoDB owns announcements and private messages. The portal has state-based sidebar navigation, an organizer desk, optional directory visibility and a browser-saved dark/light preference.

| Existing flow | Implementation boundary |
| --- | --- |
| Register, sign in, application review and logout | Existing auth endpoints and organizer permissions |
| Directory and mentoring | Only opted-in members, paginated server results and real mentoring topics |
| Events, schedule and queue | Existing event IDs, booking revisions and transactional promotion |
| Bulletins and direct messages | Existing MongoDB reads and writes, cursor pagination |
| Profile | Current name, batch, email, city, professional field, mentoring topic and visibility fields |
| Careers and giving | Resource pages linked to verified institutional services, existing mentoring and events |
| Gallery | Curated, attributed university photographs from the local asset library |

The frontend contains no institution-issued profile photos, departments, employers, biographies, job listings or campaign records. The design uses member-provided fields and initial-based avatars. Additional profile fields would require a separately justified data-model change. A field filter, location filter and past-event query can use the existing tables through backward-compatible endpoint parameters.

## Alumni ecosystem references

| Platform and pages reviewed | Observations from accessible public content | SAU application | Excluded patterns |
| --- | --- | --- | --- |
| Stanford alumni home, events and career connections | Events, directory discovery, learning and career support have clear destinations. The career entry combines seeking help with offering help. | Persistent sidebar destinations, discovery links on the dashboard and reciprocal mentoring actions. | Membership tiers, travel booking and large institutional mega-menus. |
| MIT alumni home, community/career URLs, public association report and regional club page | The main pages returned HTTP 403. MIT's public 2024 report describes an alumni online community, advisors hub and career design fellowship. The Long Island club page distinguishes upcoming and past events. | Reciprocal mentoring, a past-events view and clear regional context. | Claims of inspecting the protected directory or member account flows. |
| Harvard community and club URLs, public engagement-pathway publication | The main pages returned HTTP 403. The public publication describes regional clubs, interest groups and volunteering. | A people-first directory with explicit profile visibility, separate mentoring discovery and institutionally sourced resources. | Unverified private profile behavior, committee governance and fundraising workflows. |
| Oxford Alumni Online, current Oxford alumni redirects, alumni careers and group handbook | The supplied root redirects to the current Oxford alumni site. Public guidance connects alumni accounts, local groups, careers and volunteering. | Clear institutional context, alumni support links and a useful account/schedule area. | College federation, custom group administration and benefits eligibility rules. |
| HBS alumni home, club directory and career-resource entry | Public navigation distinguishes stories, events, directory, careers and learning. Career networking redirects to sign-in. Clubs are discoverable from a clear public entry. | Editorial photography alongside compact application actions, and a dedicated professional-support page. | Reproducing the authenticated coaching UI or presenting unverified alumni stories. |

The original visual direction combines an institution-led cover, a familiar application sidebar and task-focused member pages. The portal keeps its own composition and components.

The additional public MIT sources are the [2024 association report](https://alum.mit.edu/sites/default/files/2024-09/FY24_MITAA_Report_to_the_President.pdf) and [MIT Club of Long Island](https://encompass.alum.mit.edu/?cid=6955&gid=192&pgid=61&sid=1314).

Sources reviewed include [Stanford alumni](https://alumni.stanford.edu/), [Stanford events](https://alumni.stanford.edu/events/), [Stanford career connections](https://alumni.stanford.edu/career-connections/), [MIT alumni](https://alum.mit.edu/), [Harvard community](https://alumni.harvard.edu/community), [Harvard engagement pathways](https://www.alumni.harvard.edu/sites/default/files/page/content/Harvard%20Alumni%20Engagement%20Pathways_5.29.2025.docx.pdf), [Oxford Alumni Online](https://www.alumniweb.ox.ac.uk/), [Oxford alumni careers](https://www.ox.ac.uk/alumni/careers), [Oxford group handbook](https://www.ox.ac.uk/alumni/community/network/handbook), [HBS alumni](https://www.alumni.hbs.edu/) and [HBS clubs](https://www.alumni.hbs.edu/get-involved/clubs).

## Visual-reference review

| Source | Access observed | Design decision |
| --- | --- | --- |
| Siteinspire | Public category navigation includes typographic, minimal, photography and grid-layout references. | Use an editorial serif for institutional introductions and deliberate photographic crops. |
| Mobbin | Public preview page and screen previews available. Detailed flows require access. | Keep app controls compact, distinguish active navigation and use clearly labeled account actions. |
| Land-book | The requested public root returned 403. | No claims about protected screens. Use the independently defined layout system. |
| Awwwards | The root timed out in the research tool. | Avoid basing interaction requirements on unverified award examples. |
| Refero | The root returned no readable page content. | Detailed screen inspection remains unavailable. |
| Dribbble | Public discovery page, dashboard and landing-page categories available. | Give cards a consistent anatomy and make hierarchy work without decorative metrics. |

These are visual principles selected for this product. A public preview does not establish that a specific production interaction works.

Reference links include [Siteinspire](https://www.siteinspire.com/), [Mobbin](https://mobbin.com/), [Land-book](https://land-book.com/), [Awwwards](https://www.awwwards.com/), [Refero](https://refero.design/) and [Dribbble](https://dribbble.com/).

## Institutional evidence

The [structured SAU information file](../web/src/sau-information.json) records official URLs alongside concise verified facts. The university's overview describes the 2007 agreement, academic opening in 2010 and move to Maidan Garhi in January 2023. The older alumni-association page still names Akbar Bhawan as the current campus. The current overview and contact page govern the address shown in this portal.

The source register includes the university [overview](https://sau.int/about/), [vision](https://sau.int/about/vision/), [faculties](https://sau.int/faculties-departments/), [research](https://sau.int/r-and-d/home/), [laboratories](https://sau.int/academics/labs/), [placements](https://sau.int/placements/), [contact](https://sau.int/contact/), [press releases](https://sau.int/press-release/), [annual reports](https://sau.int/annual-reports/) and [alumni association](https://sau.int/about/alumni-association/).

## Image provenance and permitted use

SAU's media-download page publishes logo links and its footer reserves rights. The privacy/terms page supplies no general image-republication license. The official gallery and convocation archives therefore remain source links pending permission. The robots file permits uploads but disallows the theme directory used by the official GIF logo. The implementation uses a typographic SAU identity and records the official logo as pending.

Four individually reviewed Wikimedia file pages publish open licenses. Their optimized WebP variants are local to this project. The gallery supplies author, source, license and conversion/crop notices. The modern campus image is published as CC0 by the Commons file page and credits an SAU YouTube source. The other images retain their published attribution/share-alike terms. Historical images retain their date and campus context. The proposed-campus rendering is labeled as an architectural concept.

The current library covers campus, historical student life, a former-campus library entrance and the campus concept. Convocation, sports, laboratories, auditorium interiors and current student portraits need cleared media from SAU. These missing categories are recorded in the manifest. No stock photograph is presented as SAU.

Rights references include [SAU media downloads](https://sau.int/media-coverages/media-downloads/), [SAU terms](https://sau.int/privacy-terms/), [SAU robots](https://sau.int/robots.txt), [campus image](https://commons.wikimedia.org/wiki/File:South_asian_university_campus_photo.png), [2013 celebration](https://commons.wikimedia.org/wiki/File:Students_of_South_Asian_University,_New_Delhi.JPG), [2015 library](https://commons.wikimedia.org/wiki/File:Prof._G._K._Chadha_Library.jpg) and [2014 campus concept](https://commons.wikimedia.org/wiki/File:Proposed_Campus_of_SAU.jpg).

## Design system established before page implementation

- Deep blue navigation and warm gold accents connect the experience to a university identity. Dark surfaces use blue-black tones. Light surfaces use ivory and white. The preference remains in Profile.
- Self-hosted Inter carries forms and application text. DM Serif Text carries institutional and editorial headings.
- An eight-pixel spacing rhythm, restrained six-to-twelve-pixel radii, fine borders and consistent page widths align the application.
- A photographic CampusImage component renders local responsive sizes. Institutional captions distinguish a campus photograph from an event photograph.
- Shared page headers, empty states, status badges, cards, dialogs and form controls carry the same type and spacing.
- A compact hero establishes place. Live schedule, announcements and people remain the primary member tasks.
- Mobile uses a drawer, stacked filter controls, single-column cards and full-width forms. Keyboard focus, reduced motion and dialog dismissal are part of the shared behavior.

## Content and implementation decisions

The public landing page communicates the purpose of the portal and offers registration/sign-in. Institutional facts and photographs have visible source links. Authenticated announcements, bookings, messages and member profiles continue to come from the API. Curated official-university links are visibly institutional resources. The gallery is a credited university collection.

The redesign adds a University destination and a credits view. Directory filters use the existing professional-field and city columns. A past-events filter uses the current event timestamp. These are additive API extensions with tests. Career resources route members toward actual university placements, alumni mentoring and scheduled sessions. Giving links to the verified association and volunteering through mentoring. The interface makes no promises of a payment or job-application service.

The subsequent request for synthetic data adds an opt-in local seed command. It supplies labeled fictional members, events, bookings, announcements and conversations. Careers now also reads searchable opportunity documents from MongoDB, with role details and a message-the-sharing-alumnus action. The demonstration roles, companies and compensation are explicitly fictional. Existing accounts and member actions survive repeated seed runs.
