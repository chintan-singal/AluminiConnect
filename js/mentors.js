$('#mentorRail').innerHTML = DATA.mentors.map((m, i) => `<article class="mentor"><div class="row"><div class="av">${inits(m.n)}</div><div><h3>${m.n}</h3><small>Batch ${m.b}</small></div></div><div class="role">${m.r}</div><div class="chips">${m.s.map(s => `<span>${s}</span>`).join('')}</div><button class="btn" data-m="${i}">Connect</button></article>`).join('');
$('#mentorRail').addEventListener('click', e => {
  const b = e.target.closest('[data-m]'); if (!b) return;
  const on = b.classList.toggle('done');
  b.textContent = on ? 'Request sent' : 'Connect';
  toast(on ? 'Request sent to ' + DATA.mentors[b.dataset.m].n : 'Request withdrawn');
});
