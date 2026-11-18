// Fictional people and opportunities for the local project demonstration.
const password = 'AlumniDemo2026!'
const domain = 'sau-alumni.example.test'
const people = [
  ['asha.rao', 'Asha Rao', 2019, 'New Delhi', 'Product design', 'Portfolio reviews and design careers'],
  ['arjun.sen', 'Arjun Sen', 2016, 'Bengaluru', 'Software engineering', 'Backend engineering and technical interviews'],
  ['meera.iyer', 'Meera Iyer', 2017, 'New Delhi', 'Economics', 'Development economics and policy research'],
  ['nabil.rahman', 'Nabil Rahman', 2018, 'Dhaka', 'Data science', 'Applied machine learning and analytics'],
  ['kavya.perera', 'Kavya Perera', 2015, 'Colombo', 'International relations', 'Research proposals and international careers'],
  ['tenzin.dorji', 'Tenzin Dorji', 2020, 'Thimphu', 'Environmental research', 'Climate policy and research pathways'],
  ['sana.malik', 'Sana Malik', 2018, 'Lahore', 'Biotechnology', 'Laboratory research and doctoral applications'],
  ['rohan.shrestha', 'Rohan Shrestha', 2014, 'Kathmandu', 'Public policy', 'Public-sector fellowships and policy writing'],
  ['aisha.latheef', 'Aisha Latheef', 2021, 'Male', 'Sociology', 'Community research and qualitative methods'],
  ['farid.azimi', 'Farid Azimi', 2017, 'New Delhi', 'Mathematics', 'Quantitative research and graduate study'],
  ['ananya.das', 'Ananya Das', 2013, 'Mumbai', 'Finance', 'Early-career finance and interview preparation'],
  ['ishan.kapoor', 'Ishan Kapoor', 2020, 'Hyderabad', 'Cybersecurity', 'Application security and career transitions'],
  ['priya.nair', 'Priya Nair', 2023, 'New Delhi', 'Software engineering', ''],
  ['sameer.khan', 'Sameer Khan', 2022, 'Dhaka', 'Economics', ''],
  ['nila.fernando', 'Nila Fernando', 2024, 'Colombo', 'Biotechnology', ''],
  ['karma.wangmo', 'Karma Wangmo', 2022, 'Thimphu', 'Sociology', ''],
  ['kabir.gurung', 'Kabir Gurung', 2021, 'Kathmandu', 'Data science', ''],
  ['sara.ahmed', 'Sara Ahmed', 2025, 'Lahore', 'International relations', ''],
  ['dev.menon', 'Dev Menon', 2024, 'Bengaluru', 'Product design', ''],
  ['mira.hussain', 'Mira Hussain', 2023, 'Male', 'Public policy', ''],
  ['tashi.lhamo', 'Tashi Lhamo', 2025, 'New Delhi', 'Environmental research', ''],
  ['aditya.bose', 'Aditya Bose', 2021, 'Pune', 'Mathematics', ''],
  ['fariha.noor', 'Fariha Noor', 2024, 'Dhaka', 'Finance', ''],
  ['ravi.thapa', 'Ravi Thapa', 2022, 'Kathmandu', 'Cybersecurity', ''],
].map(([key, name, batch, city, field, mentorTopic]) => ({
  key, name, email: key + '@' + domain,
  batch, city, field, mentorTopic, status: 'approved', role: 'member',
}))

const office = {
  key: 'alumni.office', name: 'Alumni Relations Office',
  email: 'office@' + domain, batch: 2012, city: 'New Delhi',
  field: 'Alumni relations', mentorTopic: '', role: 'organizer', status: 'approved',
}
const applicants = ['Leena Paul', 'Omar Silva', 'Pema Rai'].map((name, index) => ({
  key: 'applicant.' + index, name,
  email: 'applicant.' + index + '@' + domain, batch: 2025,
  city: ['New Delhi', 'Colombo', 'Kathmandu'][index],
  field: 'Recent graduate', mentorTopic: '', role: 'member', status: 'pending',
}))

const events = [
  { key: 'reunion', title: 'South Asian alumni homecoming', days: 21, capacity: 80, kind: 'reunion', venue: 'Maidan Garhi campus', description: 'Reconnect across batches with introductions, a campus walk and conversations over tea.' },
  { key: 'design', title: 'Design portfolio clinic', days: 3, capacity: 3, kind: 'office_hours', mentor: 'asha.rao', venue: 'Online · Meeting details shared by the mentor', description: 'Bring one case study for a focused portfolio review and actionable feedback on your design process.' },
  { key: 'engineering', title: 'Backend careers and interview practice', days: 5, capacity: 6, kind: 'office_hours', mentor: 'arjun.sen', venue: 'Online · Meeting details shared by the mentor', description: 'Discuss API design, database trade-offs and technical interview preparation.' },
  { key: 'policy', title: 'From research question to policy brief', days: 8, capacity: 8, kind: 'office_hours', mentor: 'meera.iyer', venue: 'Online', description: 'A practical workshop on research questions, evidence and a concise policy brief.' },
  { key: 'data', title: 'Your first applied data project', days: 11, capacity: 10, kind: 'office_hours', mentor: 'nabil.rahman', venue: 'Online', description: 'Explore a small data project, reproducible analysis and communicating findings to a nontechnical audience.' },
  { key: 'research', title: 'Doctoral applications roundtable', days: 14, capacity: 12, kind: 'office_hours', mentor: 'sana.malik', venue: 'Online', description: 'Discuss laboratory experience, research statements and doctoral applications.' },
  { key: 'meetup', title: 'Delhi alumni coffee and connections', days: 18, capacity: 30, kind: 'reunion', venue: 'New Delhi', description: 'Meet alumni from different disciplines and exchange ideas in a small, informal gathering.' },
  { key: 'past-reunion', title: 'Cross-batch conversations', days: -25, capacity: 60, kind: 'reunion', venue: 'New Delhi', description: 'A community reunion connecting graduates across disciplines and batches.' },
  { key: 'past-research', title: 'Research to real-world impact', days: -12, capacity: 25, kind: 'reunion', venue: 'Online', description: 'A community conversation about translating academic research into practical projects.' },
]
for (const [index, mentor] of people.filter((person) => person.mentorTopic).entries()) {
  if (events.some((event) => event.mentor === mentor.key)) continue
  events.push({
    key: 'mentoring-' + mentor.key, title: mentor.field + ' mentoring circle',
    days: 6 + index, capacity: 8, kind: 'office_hours', mentor: mentor.key,
    venue: 'Online', description: 'Join ' + mentor.name + ' for guidance on ' + mentor.mentorTopic.toLowerCase() + '.',
  })
}

const announcements = [
  { key: 'welcome', title: 'Welcome to your alumni community', body: 'Reconnect with classmates, share your experience and discover your next opportunity. Explore the directory, book a mentoring session and make time for a community gathering.' },
  { key: 'homecoming', title: 'Homecoming registrations are open', body: 'Homecoming brings together graduates across disciplines. Open Events to explore the programme, reserve a seat and see it appear in My schedule.' },
  { key: 'mentors', title: 'Meet the alumni offering a little guidance', body: 'Our mentors cover software engineering, economics, biotechnology, policy and other fields. Search by location or professional field, view a profile and book one of the mentor’s published office hours.' },
  { key: 'careers', title: 'Explore the alumni opportunity board', body: 'Discover roles and internships shared by alumni businesses. Filter the list, open the role details and contact the alumnus who shared it through Messenger. Business owners can publish opportunities directly from Careers.' },
  { key: 'privacy', title: 'Make your profile easier to discover', body: 'Update your city and professional field in Profile & settings. Directory visibility is your choice. Add a mentoring topic when you would like to offer guidance to other members.' },
  { key: 'waitlist', title: 'A full session still has a fair queue', body: 'When a mentoring session fills up, join its waitlist. A confirmed cancellation automatically promotes the first person waiting. Your current seat or queue position appears in My schedule.' },
]

const jobs = [
  { key: 'backend', title: 'Junior Backend Engineer', company: 'Meridian Labs', location: 'Bengaluru', workMode: 'Hybrid', type: 'full_time', field: 'Software engineering', poster: 'arjun.sen', skills: ['Node.js', 'MySQL', 'REST APIs'], description: 'Build small APIs, improve database queries and work with a product team. Suitable for an early-career engineer with a clear project portfolio.', salaryRange: 'INR 8–12 lakh per year' },
  { key: 'policy', title: 'Policy Research Associate', company: 'Regional Futures Collective', location: 'New Delhi', workMode: 'On-site', type: 'full_time', field: 'Economics', poster: 'meera.iyer', skills: ['Research', 'Policy writing', 'Econometrics'], description: 'Support literature reviews, analyse public datasets and help write short policy briefs on regional development.', salaryRange: 'INR 6–9 lakh per year' },
  { key: 'data', title: 'Data Science Intern', company: 'Riverbend Analytics', location: 'Dhaka', workMode: 'Remote', type: 'internship', field: 'Data science', poster: 'nabil.rahman', skills: ['Python', 'SQL', 'Data visualisation'], description: 'Paid internship. Explore clean datasets, document analysis and present findings with support from a senior analyst.', salaryRange: 'BDT 25,000–35,000 per month' },
  { key: 'design', title: 'Product Designer', company: 'Common Ground Studio', location: 'Remote', workMode: 'Remote', type: 'contract', field: 'Product design', poster: 'asha.rao', skills: ['User research', 'Figma', 'Accessibility'], description: 'Three-month studio project. Research a member journey, prototype a responsive web experience and document accessible interaction patterns.', salaryRange: 'INR 50,000–70,000 per month' },
  { key: 'biotech', title: 'Research Assistant · Biotechnology', company: 'Openleaf Research', location: 'Colombo', workMode: 'On-site', type: 'full_time', field: 'Biotechnology', poster: 'sana.malik', skills: ['Laboratory methods', 'Documentation', 'Data analysis'], description: 'Support a supervised laboratory project, maintain clear experiment records and contribute to weekly research discussions.', salaryRange: 'LKR 90,000–120,000 per month' },
  { key: 'climate', title: 'Climate Programme Intern', company: 'Himalayan Commons', location: 'Kathmandu', workMode: 'Hybrid', type: 'internship', field: 'Environmental research', poster: 'tenzin.dorji', skills: ['Climate policy', 'Writing', 'Community research'], description: 'Internship. Map regional climate projects, summarise public reports and support a small community-research team.', salaryRange: 'NPR 25,000–35,000 per month' },
]

module.exports = { password, domain, people, office, applicants, events, announcements, jobs }
