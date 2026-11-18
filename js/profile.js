$('#greet').textContent = 'Welcome back, ' + DATA.user.first;
$('#stats').innerHTML = DATA.stats.map(([l, v]) => `<div><strong>${v}</strong>${l}</div>`).join('');
const checks = DATA.profile.map(([l, d]) => ({ l, d }));
function drawStrength() {
  const p = Math.round(checks.filter(c => c.d).length / checks.length * 100);
  $('#pct').textContent = p + '%'; $('#fill').style.width = p + '%';
}
$('#checks').innerHTML = checks.map((c, i) => `<li><label><input type="checkbox" data-i="${i}" ${c.d ? 'checked' : ''}>${c.l}</label></li>`).join('');
$('#checks').addEventListener('change', e => { checks[e.target.dataset.i].d = e.target.checked; drawStrength(); });
drawStrength();
