/* Mock data layer. Replace each block with a fetch() to your API (see docs/API.md). */
const DATA = {
  brand: { name: 'Alumni Connect', letter: 'A' },
  user: { name: 'Alex Morgan', first: 'Alex', batch: 2024, branch: 'Main Campus' },
  stats: [['Connections', 18], ['Batchmates online', 6], ['Mentor requests', 1]],
  profile: [['Add a profile photo', true], ['Current city', true], ['Current job or college', false], ['LinkedIn link', false], ['Areas you can mentor in', false]],
  news: [
    { t: 'Welcome to the alumni portal', d: 'Nov 3', tag: 'Portal', p: 'Reconnect with batchmates, find mentors and follow news from your institution.' },
    { t: 'Annual alumni meet: registrations open', d: 'Nov 10', tag: 'Campus', p: 'Join us for a day of reunions, a student showcase and lunch.' }
  ],
  events: [
    { t: 'Annual Alumni Meet', m: 'Dec', d: 12, w: 'Main campus · 11:00 am' },
    { t: 'Career talk: Careers in finance', m: 'Dec', d: 20, w: 'Online · 6:00 pm' },
    { t: 'Batch 2024 first reunion', m: 'Jan', d: 4, w: 'City centre · 5:00 pm' }
  ],
  mentors: [
    { n: 'Sam Rivera', b: '’22 · North Campus', r: 'Software Developer at a global tech firm', s: ['JavaScript', 'TypeScript', 'React', 'Node.js'] },
    { n: 'Priya Nair', b: '’18 · North Campus', r: 'Investment Banker', s: ['Stocks', 'Bonds'] },
    { n: 'Daniel Okafor', b: '’15 · Main Campus', r: 'Product Designer', s: ['Figma', 'Portfolio reviews'] }
  ],
  jobs: [
    { t: 'Frontend intern', c: 'Fintech startup · Remote', by: 'Shared by Sam R.' },
    { t: 'Analyst, Equity Research', c: 'Investment bank · Mumbai', by: 'Shared by Priya N.' },
    { t: 'UX design intern', c: 'Food delivery app · Bengaluru', by: 'Shared by Daniel O.' }
  ],
  fund: { t: 'New science lab', p: 'Help fund 30 workstations for senior-year practicals.', raised: 312000, goal: 500000, donors: 84 },
  gallery: [['Annual Day', '#9c2f3d,#e0a64f'], ['Sports Day', '#2e5e8c,#8fc1d9'], ['Science Fair', '#2f6b4f,#a8d5b8'], ['Assembly', '#6b3f8f,#c8a5e0'], ['Class of 2024', '#8f5a1f,#e8c78a']]
};
