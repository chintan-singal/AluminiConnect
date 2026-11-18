$('#gal').innerHTML = DATA.gallery.map(([c, g]) => `<figure style="background:linear-gradient(135deg,${g})"><figcaption>${c}</figcaption></figure>`).join('');
