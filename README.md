# Alumni Connect

A responsive dashboard for an alumni network portal: announcements, events, mentors, jobs, fundraisers and a campus gallery. Plain HTML, CSS and JavaScript, with no build step.

## Run it
Open `index.html` in a browser, or serve the folder with `npx serve`.

## Structure
- `index.html`: page markup
- `css/`: one stylesheet per area (base, layout, hero, feed, mentors, giving, gallery, responsive)
- `js/data.js`: mock data, the only file to swap for real API calls
- `js/*.js`: one module per dashboard section
- `docs/API.md`: endpoints the backend should provide

## Customise
Edit `DATA.brand` in `js/data.js` for your institution's name. Colours are CSS variables at the top of `css/base.css`.

## Version history
Each tag adds one feature: `v0.1.0` scaffold, `v0.2.0` shell and theming, `v0.3.0` hero and profile strength, `v0.4.0` announcements and events, `v0.5.0` mentors, `v0.6.0` jobs and giving, `v0.7.0` gallery, `v0.8.0` mobile layout, `v1.0.0` API docs.
