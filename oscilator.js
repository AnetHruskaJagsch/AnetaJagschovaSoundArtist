// Soundtrack oscilloscope: three green lines for dialogue, music and foley.
// Tone.js analyses the <audio> element live; each line moves only while its layer is playing,
// so when layers overlap, several lines move at once. Used by sound-design-for-others.html (en + cs).
// The sound itself is encrypted (media/audio/girl-is-monster.enc). Without the password the play button
// runs the lines silently (drawn from the loudness envelope below); the password decrypts the file in the
// browser and the real sound plays. The password is not stored anywhere on the site.

// ---------------------------------------------------------------------------
// WHAT PLAYS WHEN · KDY HRAJE CO
// From–to as m:ss; parts may overlap. These times are a first estimate read from the
// spectrogram of the mix: check them against the film and correct them here.
// Odkdy–dokdy jako m:ss, části se můžou překrývat. Časy jsou první odhad podle
// spektrogramu mixu: porovnej je s filmem a oprav je tady.
// ---------------------------------------------------------------------------
const OSCILATOR_CASTI = {
  'girl-is-monster': {
    dialog: ['0:20-0:34', '0:37-0:48', '1:01-1:38', '2:02-2:24', '3:28-3:41', '3:44-3:58',
             '4:19-4:31', '4:53-5:07', '5:49-5:53', '5:57-6:13'],
    hudba:  ['0:06-0:35', '2:45-3:43', '6:23-7:40'],
    foley:  ['0:33-1:01', '1:33-2:14', '2:25-2:46', '4:00-4:53', '5:07-6:00'],
  },
};

// Loudness of the whole track, one character per 0.512 s (0 = quiet … z = loud).
const OSCILATOR_OBALKY = {
  'girl-is-monster': '0000000000001PVZbbbcedcccecbWflkgigjgcdcfnliTXbZVXYWiikZXXVXdeVhgVXWmhkllfbcnjcSklhelWTVXQIaeUhhUSPRRUVVVTPJD4H0HTf000101fbc0VXSW00RUYC0000000gY0aaWUbYGbhV0ckeaP0Ofdkb20000TVXfUPVTeaegcKLeZTUGTpQCENKDLKUNRSTTQQRRbOPLKFIPJLHTWGQ8QDOLWQZbX00VYdVVVYYT00XkgjXeeZYMYXYbSVVPSORbb00ccZRbZh9eF090000VPPMIULJ7PMMNSYZaGiZZacOdfchZahdZfSPZbWZgZYZfZagddYhegbeYWeaecfbcfcaailnleccgbfbihmnjffpqjjihdgaZcieZgccbgcefjheebYUeYXlfeZUVUVhebWbhgihdhijnpoai4000UaXJV5VXXSRMP0HCTROTK000KR0NQCFIULVKXIXFXFVDYPWBWNYQUQTUVSbTVUTUbaVWghggidhZciigegdfjikemggNKGGKSQNSSQLUijfXLTUUWVYXLWXdZVSPYYTTc90000TLHIQ4UXUOH0LQYDRN0000ZHPe0A010217ZG05A52C6A00000A00244000003L000100F000C00000002233031135355A211880011000063JPLD000000QZSQPPhnlcA2mkkke000hmkmZDfeADD0KMFBP4000000000000000000KQLMdZaficZifdfkfgijkfiecaighihfgjeekjidiffikhhkjlejcbeihgjhhhkeemjgflfgijifojmgjebggdmmkhjmllooghlllonmhnllijbYhfemlfdginjnlcegknojhdjnmleaWgjjeZE00000000000',
};

(() => {
  const VRSTVY = [            // top to bottom: dialogue lightest, foley darkest
    { key: 'dialog', barva: '#8cc79c' },
    { key: 'hudba', barva: '#4f8f66' },
    { key: 'foley', barva: '#2f6342' },
  ];
  const ZNAKY = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const KROK = 0.512;
  const sec = s => { const [m, x] = s.trim().split(':'); return +m * 60 + +x; };
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  document.querySelectorAll('.oscilo').forEach(init);

  function init(fig) {
    const audio = fig.querySelector('audio');
    const platno = fig.querySelector('.oscilo-platno'), g = platno.getContext('2d');
    const osa = fig.querySelector('.oscilo-casti'), go = osa.getContext('2d');
    const hraj = fig.querySelector('.oscilo-hraj'), cas = fig.querySelector('.oscilo-cas');
    const ted = fig.querySelector('.oscilo-ted'), posun = fig.querySelector('.oscilo-posun');
    const casti = OSCILATOR_CASTI[fig.dataset.casti] || {};
    const useky = VRSTVY.map(v => (casti[v.key] || []).map(r => r.split(/[-–]/).map(sec)));
    const popisky = VRSTVY.map(v => fig.dataset[v.key] || v.key);
    const obalka = [...(OSCILATOR_OBALKY[fig.dataset.casti] || '')].map(c => Math.max(0, ZNAKY.indexOf(c)) / 61);
    let delka = +fig.dataset.delka || 0;

    // ---- audio graph (built on the first play, inside the click) ----
    let analyzatory = null, zive = false;
    function zapoj() {
      if (analyzatory) return;
      analyzatory = [];
      if (typeof Tone === 'undefined' || location.protocol === 'file:') return;   // plain playback, lines simulated
      try {
        const zdroj = Tone.getContext().rawContext.createMediaElementSource(audio);
        Tone.connect(zdroj, Tone.getDestination());                 // what you hear stays untouched
        const dx = new Tone.Waveform(1024), mx = new Tone.Waveform(1024), fx = new Tone.Waveform(1024);
        const hlas = new Tone.Filter(300, 'highpass');              // dialogue line: the voice band
        hlas.chain(new Tone.Filter(3400, 'lowpass'), dx);
        const spodek = new Tone.Filter(1200, 'lowpass');            // music line: the smoother low/mid part
        spodek.connect(mx);
        Tone.connect(zdroj, hlas); Tone.connect(zdroj, spodek); Tone.connect(zdroj, fx);   // foley: the full mix
        analyzatory = [dx, mx, fx]; zive = true;
      } catch (e) { analyzatory = []; zive = false; }
    }

    // ---- player: a silent clock while the sound is locked, the real <audio> once unlocked ----
    let odemceno = false;
    const tiche = { t: 0, od: 0, hraje: false };
    const prehrava = () => odemceno ? !audio.paused : tiche.hraje;
    const kdy = () => odemceno ? audio.currentTime
      : Math.min(delka || Infinity, tiche.hraje ? tiche.t + (performance.now() - tiche.od) / 1000 : tiche.t);
    function ticho(hrat) {
      tiche.t = kdy(); tiche.od = performance.now();
      if (hrat && tiche.t >= delka - 0.2) tiche.t = 0;
      tiche.hraje = hrat; stav();
    }
    function skoc(t) {
      if (odemceno) audio.currentTime = t; else { tiche.t = t; tiche.od = performance.now(); }
      rozbeh();
    }

    hraj.addEventListener('click', () => {
      if (!odemceno) { ticho(!tiche.hraje); return; }          // without the password: lines only, no sound
      if (audio.paused) {
        zapoj();
        if (zive) Tone.start();
        audio.play().catch(() => {});
      } else audio.pause();
    });
    function stav() {
      const hraje = prehrava();
      hraj.classList.toggle('hraje', hraje);
      hraj.setAttribute('aria-label', hraje ? hraj.dataset.pauza : hraj.dataset.hraj);
      rozbeh();
    }
    audio.addEventListener('play', stav);
    audio.addEventListener('pause', stav);
    audio.addEventListener('error', stav);
    audio.addEventListener('seeked', rozbeh);
    audio.addEventListener('loadedmetadata', () => { if (audio.duration) { delka = audio.duration; posun.max = delka; zaklad(); rozbeh(); } });

    let tahne = false;
    posun.addEventListener('pointerdown', () => { tahne = true; });
    addEventListener('pointerup', () => { tahne = false; });
    posun.addEventListener('input', () => skoc(+posun.value));

    // ---- unlocking: the sound file on the site is encrypted with the password ----
    // File layout: salt (16) | iv (16) | AES-256-CBC ciphertext | HMAC-SHA256 of iv+ciphertext (32).
    // Keys: PBKDF2-SHA256(password, salt, 200 000) → 64 bytes (32 for AES, 32 for HMAC).
    const zamek = fig.querySelector('.oscilo-zamek');
    if (zamek) {
      const pole = zamek.querySelector('input'), tlacitko = zamek.querySelector('button');
      const zprava = zamek.querySelector('.oscilo-zprava'), d = zamek.dataset;
      let sifra = null;                                         // the encrypted bytes, downloaded once
      const stahni = () => sifra || (sifra = (async () => {
        const r = await fetch(fig.dataset.zamek);
        if (!r.ok) throw new Error('http ' + r.status);
        const celkem = +r.headers.get('content-length') || 0, cteni = r.body.getReader(), kusy = [];
        let mam = 0;
        for (;;) {
          const { done, value } = await cteni.read();
          if (done) break;
          kusy.push(value); mam += value.length;
          if (celkem) zprava.textContent = `${d.nacitam} ${Math.round(mam / celkem * 100)} %`;
        }
        const vse = new Uint8Array(mam); let o = 0;
        for (const k of kusy) { vse.set(k, o); o += k.length; }
        return vse;
      })().catch(e => { sifra = null; throw e; }));
      async function rozsifruj(b, heslo) {
        const zHesla = await crypto.subtle.importKey('raw', new TextEncoder().encode(heslo), 'PBKDF2', false, ['deriveBits']);
        const bity = new Uint8Array(await crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: b.subarray(0, 16), iterations: 200000, hash: 'SHA-256' }, zHesla, 512));
        const mk = await crypto.subtle.importKey('raw', bity.slice(32), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
        if (!await crypto.subtle.verify('HMAC', mk, b.subarray(b.length - 32), b.subarray(16, b.length - 32))) return null;
        const ek = await crypto.subtle.importKey('raw', bity.slice(0, 32), 'AES-CBC', false, ['decrypt']);
        return crypto.subtle.decrypt({ name: 'AES-CBC', iv: b.subarray(16, 32) }, ek, b.subarray(32, b.length - 32));
      }
      zamek.addEventListener('submit', async e => {
        e.preventDefault();
        if (!pole.value) { pole.focus(); return; }
        tlacitko.disabled = true; zamek.classList.remove('spatne');
        zprava.textContent = d.nacitam;
        try {
          if (!window.crypto || !crypto.subtle) throw new Error('no crypto');
          const zvuk = await rozsifruj(await stahni(), pole.value);
          if (!zvuk) {
            zprava.textContent = d.spatne; zamek.classList.add('spatne');
            pole.select(); tlacitko.disabled = false; return;
          }
          const pozice = kdy();
          if (tiche.hraje) ticho(false);
          audio.src = URL.createObjectURL(new Blob([zvuk], { type: 'audio/mp4' }));
          audio.addEventListener('loadedmetadata', () => { audio.currentTime = pozice; rozbeh(); }, { once: true });
          audio.load();
          odemceno = true; sifra = null; pole.value = '';
          fig.classList.add('odemceno');
          zprava.textContent = d.odemceno;
          audio.addEventListener('play', () => { zprava.textContent = ''; }, { once: true });
          stav(); hraj.focus();
        } catch (err) {
          zprava.textContent = d.chyba; tlacitko.disabled = false;
        }
      });
    }

    // ---- sizes ----
    let W = 0, H = 0, OW = 0, OH = 0, dpr = 1;
    const zaklad_ = document.createElement('canvas');
    function velikost() {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = platno.clientWidth; H = platno.clientHeight; OW = osa.clientWidth; OH = osa.clientHeight;
      platno.width = Math.round(W * dpr); platno.height = Math.round(H * dpr);
      osa.width = Math.round(OW * dpr); osa.height = Math.round(OH * dpr);
      zaklad(); kresli(0);
    }
    // timeline base: loudness of the whole track + where each layer plays
    function zaklad() {
      zaklad_.width = osa.width; zaklad_.height = osa.height;
      const c = zaklad_.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, OW, OH);
      const vrsek = 24, x = t => t / (delka || 1) * OW;
      c.fillStyle = 'rgba(79, 143, 102, 0.55)';
      obalka.forEach((v, i) => {
        const h = Math.max(1, v * vrsek);
        c.fillRect(x(i * KROK), vrsek - h, Math.max(1, x(KROK) - 0.5), h);
      });
      VRSTVY.forEach((v, k) => {
        const y = vrsek + 6 + k * 9;
        c.fillStyle = 'rgba(31, 61, 43, 0.35)'; c.fillRect(0, y, OW, 5);
        c.fillStyle = v.barva;
        for (const [a, b] of useky[k]) c.fillRect(x(a), y, Math.max(2, x(b) - x(a)), 5);
      });
    }

    // ---- drawing ----
    const brany = [0, 0, 0], vrcholy = [0.1, 0.1, 0.1];
    let posledni = performance.now(), raf = 0, dobeh = 0, tedText = null, sekunda = -1;
    const aktivni = t => useky.map(u => u.some(([a, b]) => t >= a && t < b));
    function rozbeh() {
      dobeh = performance.now() + 700;
      if (!raf) { posledni = performance.now(); raf = requestAnimationFrame(snimek); }
    }
    function snimek(now) {
      const dt = Math.min(0.1, (now - posledni) / 1000); posledni = now;
      kresli(dt);
      raf = (prehrava() || now < dobeh) ? requestAnimationFrame(snimek) : 0;
    }
    function hladina(t) {
      const i = Math.floor(t / KROK);
      return obalka.length ? obalka[Math.min(obalka.length - 1, Math.max(0, i))] : 0.5;
    }
    function kresli(dt) {
      if (!odemceno && tiche.hraje && kdy() >= delka) ticho(false);   // the silent run ends with the film
      const t = kdy() || 0, hraje = prehrava();
      const akt = aktivni(t);
      akt.forEach((a, k) => { brany[k] += ((a ? 1 : 0) - brany[k]) * (dt ? 1 - Math.exp(-dt / 0.15) : 1); });

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const LH = H / 3, pad = 16;
      g.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
      VRSTVY.forEach((v, k) => {
        const y0 = k * LH, stred = y0 + LH * 0.42, amp = LH * 0.33, b = brany[k];
        let data = null, start = 0, n = 0;
        if (zive && hraje) {
          data = analyzatory[k].getValue();
          let p = 0; for (let i = 0; i < data.length; i++) p = Math.max(p, Math.abs(data[i]));
          vrcholy[k] = Math.max(p, vrcholy[k] * 0.97);
          for (let i = 1; i < data.length / 2; i++) if (data[i - 1] < 0 && data[i] >= 0) { start = i; break; }
          n = Math.round(Math.min(data.length / 2, Math.max(160, (W - pad * 2) * 0.8)));   // fewer samples on narrow screens
        }
        const zisk = 0.9 / Math.max(vrcholy[k], 0.05);
        g.strokeStyle = v.barva; g.lineWidth = 1.6; g.lineJoin = 'round';
        g.globalAlpha = 0.4 + 0.6 * b; g.shadowColor = v.barva; g.shadowBlur = 2 + 8 * b;
        g.beginPath();
        const kusu = data ? n : 240, sir = W - pad * 2, h = hladina(t), fa = t * 6.283;
        for (let i = 0; i < kusu; i++) {
          let s;
          if (data) s = Math.max(-1, Math.min(1, data[start + i] * zisk));
          else {                                   // simulated line (no Tone.js or page opened from a file)
            const u = i / kusu * 6.283;
            s = hraje ? h * (k === 0 ? 0.6 * Math.sin(u * 9 + fa * 3) * Math.sin(u * 1.5 + fa) + 0.3 * Math.sin(u * 23 - fa * 5)
                          : k === 1 ? 0.7 * Math.sin(u * 3 + fa) + 0.25 * Math.sin(u * 5 - fa * 0.7)
                          : 0.45 * Math.sin(u * 13 + fa * 4) + 0.4 * (Math.random() - 0.5)) : 0;
          }
          const x = pad + i / (kusu - 1) * sir, y = stred - s * b * amp;
          i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
        g.shadowBlur = 0; g.globalAlpha = 0.6 + 0.4 * b; g.fillStyle = v.barva;
        g.fillText(popisky[k], pad, y0 + LH * 0.88);                      // the label under each line
      });
      g.globalAlpha = 1;

      // what is playing now, in words
      const slova = akt.map((a, k) => a ? k : -1).filter(k => k >= 0);
      const klic = (hraje || t > 0) ? slova.join(',') || 'x' : '';
      if (klic !== tedText) {
        tedText = klic;
        ted.replaceChildren();
        if (klic === 'x') ted.textContent = fig.dataset.ticho || '';
        else slova.forEach((k, i) => {
          if (i) ted.append(' · ');
          const s = document.createElement('span'); s.textContent = popisky[k]; s.style.color = VRSTVY[k].barva; ted.append(s);
        });
      }

      // timeline + time
      go.setTransform(1, 0, 0, 1, 0, 0);
      go.clearRect(0, 0, osa.width, osa.height);
      if (zaklad_.width && zaklad_.height) go.drawImage(zaklad_, 0, 0);   // skip while the canvas has no size yet
      go.setTransform(dpr, 0, 0, dpr, 0, 0);
      const px = Math.round(t / (delka || 1) * OW);
      go.fillStyle = '#8cc79c'; go.shadowColor = '#8cc79c'; go.shadowBlur = 6;
      go.fillRect(px - 1, 0, 2, OH); go.shadowBlur = 0;
      if (!tahne) posun.value = t;
      const s = Math.floor(t);
      if (s !== sekunda) {
        sekunda = s;
        cas.textContent = `${fmt(t)} / ${fmt(delka)}`;
        posun.setAttribute('aria-valuetext', `${fmt(t)} / ${fmt(delka)}`);
      }
    }

    { const ro = new ResizeObserver(velikost); ro.observe(platno); ro.observe(osa); }
    if (document.fonts) document.fonts.ready.then(() => kresli(0));
  }
})();
