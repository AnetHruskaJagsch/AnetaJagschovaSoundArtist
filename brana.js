// Password gate for the whole portfolio. Until the visitor types the password,
// only the green input box and the "zvuk" dot (top left, links to the zvuk site) are visible.
// The password is checked against its SHA-256, so it is not readable here, but this only hides
// the page: the content itself is still in the HTML. Once unlocked, it stays open for the browser tab.
(() => {
  const KEY = 'aj-pristup';
  const HASH = '61d476f25a8e7cdedb86ab4a24df817cda9082e52dd663b280f59749599634e5'; // "hruska"
  try { if (sessionStorage.getItem(KEY) === HASH) return; } catch (e) { /* storage blocked: ask every time */ }

  const root = document.documentElement;
  root.classList.add('zamceno');
  const cs = (root.lang || '').startsWith('cs');

  const style = document.createElement('style');
  style.textContent = `
    html.zamceno body { overflow: hidden; }
    html.zamceno body > *:not(.zvuk-tecka):not(.brana) { visibility: hidden !important; }
    .brana {
      position: fixed;
      inset: 0;
      z-index: 10;
      display: grid;
      place-items: center;
      padding: 16px;
      pointer-events: none;            /* keep the zvuk dot clickable */
    }
    .brana input {
      pointer-events: auto;
      width: min(320px, 80vw);
      min-height: 48px;
      padding: 0 1.4em;
      border: 0;
      border-radius: 999px;
      background: #1f3d2b;
      color: #e3efe6;
      font: 500 16px "IBM Plex Mono", "JetBrains Mono", "Space Mono", ui-monospace, Menlo, monospace;
      letter-spacing: 0.14em;
      text-align: center;
      box-shadow: 0 0 18px rgba(31, 61, 43, 0.7);
      outline: none;
    }
    .brana input::placeholder { color: rgba(227, 239, 230, 0.55); }
    .brana input:focus-visible { box-shadow: 0 0 0 2px #3f7a55, 0 0 22px rgba(63, 122, 85, 0.8); }
    .brana.spatne input { animation: brana-tres 0.35s ease; }
    @keyframes brana-tres { 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
    @media (prefers-reduced-motion: reduce) { .brana.spatne input { animation: none; } }
  `;
  document.head.appendChild(style);

  // Case and diacritics do not matter: "Hruška", "hruska" and "HRUŠKA" all work.
  const normalize = s => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const sha256 = async s => Array.from(new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  )).map(b => b.toString(16).padStart(2, '0')).join('');

  const build = () => {
    const brana = document.createElement('form');
    brana.className = 'brana';
    brana.setAttribute('autocomplete', 'off');
    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = cs ? 'heslo' : 'password';
    input.setAttribute('aria-label', cs ? 'Heslo ke stránce' : 'Password for this site');
    brana.appendChild(input);
    document.body.appendChild(brana);
    input.focus();

    brana.addEventListener('submit', async e => {
      e.preventDefault();
      if (await sha256(normalize(input.value)) === HASH) {
        try { sessionStorage.setItem(KEY, HASH); } catch (err) { /* stays open only on this page */ }
        root.classList.remove('zamceno');
        brana.remove();
        return;
      }
      input.value = '';
      brana.classList.remove('spatne');
      void brana.offsetWidth;            // restart the shake animation
      brana.classList.add('spatne');
    });
  };
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
