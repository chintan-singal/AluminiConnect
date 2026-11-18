$('#ann').innerHTML = DATA.news.map(n => {
  const [m, d] = n.d.split(' ');
  return `<li><time><b>${d}</b>${m}</time><div><h3>${n.t}</h3><p><span class="tag">${n.tag}</span>${n.p}</p></div></li>`;
}).join('');
$('#evs').innerHTML = DATA.events.map((e, i) => `<div class="ev"><div class="d">${e.m}<b>${e.d}</b></div><div><h3>${e.t}</h3><p>${e.w}</p></div><button class="btn" data-ev="${i}">RSVP</button></div>`).join('');
$('#evs').addEventListener('click', e => {
  const b = e.target.closest('[data-ev]'); if (!b) return;
  const on = b.classList.toggle('done');
  b.textContent = on ? 'Going ✓' : 'RSVP';
  toast(on ? 'You’re on the list' : 'RSVP cancelled');
});
