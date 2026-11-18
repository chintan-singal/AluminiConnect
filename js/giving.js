$('#jobList').innerHTML = DATA.jobs.map(j => `<div class="job"><h3>${j.t}</h3><p>${j.c}</p><p style="margin-top:6px">${j.by}</p></div>`).join('');
const f = DATA.fund;
$('#fundBox').innerHTML = f
  ? `<div class="fund"><h3>${f.t}</h3><p>${f.p}</p><div class="bar"><i style="width:${Math.round(f.raised / f.goal * 100)}%"></i></div><div class="amt"><span><b>${money(f.raised)}</b> raised of ${money(f.goal)}</span><span>${f.donors} donors</span></div><button class="btn" onclick="toast('Payment flow opens here')">Donate</button></div>`
  : '<div class="empty">No active fundraisers. New campaigns will appear here.</div>';
