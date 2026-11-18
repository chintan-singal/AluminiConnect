const links = [...document.querySelectorAll('#nav a, #tabs a')];
const spy = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
}), { rootMargin: '-30% 0px -60% 0px' });
['home', 'news', 'events', 'mentors', 'jobs', 'give', 'gallery'].forEach(id => { const s = document.getElementById(id); if (s) spy.observe(s); });
