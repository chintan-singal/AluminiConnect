const $ = s => document.querySelector(s);
const inits = n => n.split(' ').map(w => w[0]).join('').slice(0, 2);
const money = n => '₹' + n.toLocaleString('en-IN');
function toast(m) {
  const t = $('#toast'); if (!t) return;
  t.textContent = m; t.style.display = 'block';
  clearTimeout(t._h); t._h = setTimeout(() => (t.style.display = 'none'), 2200);
}
$('#brandName').innerHTML = DATA.brand.name.replace(' ', '<br>');
$('#brandLetter').textContent = DATA.brand.letter;
$('#meAv').textContent = inits(DATA.user.name);
$('#meName').textContent = DATA.user.name;
$('#meSub').textContent = `Batch ${DATA.user.batch} · ${DATA.user.branch}`;
$('#theme').onclick = () => {
  const r = document.documentElement;
  const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches;
  r.dataset.theme = dark ? 'light' : 'dark';
};
