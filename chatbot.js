// ============================================================
//  LIM Factory — Chatbot Widget
//  Drop-in script: add <script src="./chatbot.js"></script>
//  just before </body> in index.html
// ============================================================

(function () {

  /* ── Knowledge Base ─────────────────────────────────────── */
  const QA = [
    {
      keywords: ["what is terrazzo", "terrazzo mean", "define terrazzo", "about terrazzo"],
      q: "What is terrazzo?",
      a: "Terrazzo is a composite flooring material made by embedding chips of marble, quartz, granite, glass, or other aggregates into a cementitious or epoxy binder. At LIM we use an exclusive high-performance mineral binder that makes our slabs exceptionally strong, durable, and uniquely beautiful."
    },
    {
      keywords: ["sizes", "size", "dimensions", "tile size", "how big"],
      q: "What sizes are available?",
      a: "LIM terrazzo tiles come in a variety of sizes — from classic 30×30 cm to large-format 60×60 cm and 60×120 cm slabs. Custom sizes are also available for bespoke projects. Open any product card for its specific size chart."
    },
    {
      keywords: ["custom", "bespoke", "personalise", "personaliz", "tailor", "made to order"],
      q: "Can I order custom / bespoke tiles?",
      a: "Absolutely — bespoke is our speciality! You can choose your aggregate mix, binder colour, finish, and size. Contact us via WhatsApp, Instagram, or email and our design team will guide you through the process."
    },
    {
      keywords: ["collection", "range", "geometric", "organic", "cristal", "crystal"],
      q: "What collections does LIM offer?",
      a: "LIM currently offers three signature collections:\n• **Geometric** — bold custom patterns and colours.\n• **Organic** — irregular recycled-marble fragments for a natural look.\n• **Cristal** — reflective glass depths set in a white binder for a luminous finish.\nMore exclusive collections are in development!"
    },
    {
      keywords: ["recycled", "sustainable", "eco", "environment", "marble"],
      q: "Are the tiles eco-friendly?",
      a: "Yes! LIM uses 100% recycled marble fragments in our production process. We are committed to sustainable luxury — beautiful surfaces that don't cost the earth."
    },
    {
      keywords: ["price", "cost", "how much", "pricing", "rate"],
      q: "How much do LIM tiles cost?",
      a: "Pricing varies by collection, size, and any bespoke customisation. You can see indicative prices on individual product pages. For a tailored quote, please reach out via the contact form or WhatsApp — we'll respond within one business day."
    },
    {
      keywords: ["sample", "samples", "try", "test", "swatch"],
      q: "Can I order samples?",
      a: "Yes! Click the **Order Samples** button in the navigation bar, or contact us directly. Sample packs let you feel the texture and see the colour accuracy before placing a full order."
    },
    {
      keywords: ["install", "installation", "fit", "lay", "laying"],
      q: "How are terrazzo tiles installed?",
      a: "LIM tiles can be installed by any professional tiler using standard adhesive methods. Because of their density and weight, we recommend a professional installation. We can provide a list of recommended installers in your region — just ask!"
    },
    {
      keywords: ["clean", "cleaning", "maintain", "maintenance", "care"],
      q: "How do I maintain terrazzo tiles?",
      a: "Terrazzo is low-maintenance:\n• Sweep or vacuum regularly to remove grit.\n• Mop with a pH-neutral cleaner — avoid acidic or abrasive products.\n• Re-seal polished surfaces every 1–2 years to maintain the sheen.\n• For stubborn stains, a professional polish restores the original finish."
    },
    {
      keywords: ["shipping", "delivery", "ship", "deliver", "dispatch"],
      q: "Do you ship internationally?",
      a: "Yes, LIM ships worldwide. Lead times vary depending on stock availability and destination. Custom orders typically take 4–6 weeks. Contact us for a shipping quote to your location."
    },
    {
      keywords: ["showroom", "visit", "location", "where", "address"],
      q: "Where is the LIM showroom?",
      a: "Our showroom is at **106 Columbia Road, London E2 7RG**. Come and experience the texture and quality of our tiles in person. Feel free to call ahead: +44 (0) 203 514 0483."
    },
    {
      keywords: ["contact", "reach", "email", "phone", "whatsapp", "instagram", "get in touch"],
      q: "How can I contact LIM?",
      a: "You can reach us through multiple channels:\n• 📧 limfactoryy@gmail.com\n• 📞 +44 (0) 203 514 0483\n• 💬 WhatsApp: +44 (0) 203 514 0483\n• 📸 Instagram: @terrazzobylimfactory\nOr use the **Contact** form on this page."
    },
    {
      keywords: ["floor", "wall", "outdoor", "indoor", "use", "application", "where can i use"],
      q: "Where can terrazzo tiles be used?",
      a: "LIM terrazzo is incredibly versatile:\n• **Floors** — residential, commercial, hospitality.\n• **Walls** — feature walls, bathrooms, kitchens.\n• **Furniture** — table tops, countertops, vanity surfaces.\n• **Outdoor** — our mineral binder offers excellent weather resistance.\nTell us your project and we'll recommend the right product."
    },
    {
      keywords: ["slip", "slippery", "safe", "anti-slip", "grip"],
      q: "Are the tiles slip-resistant?",
      a: "Yes. All LIM tiles are available in a **honed (matte) finish** which provides excellent slip resistance — ideal for bathrooms, kitchens, and commercial floors. Polished finishes are best suited for walls or low-traffic areas."
    },
    {
      keywords: ["years", "experience", "history", "founded", "how long"],
      q: "How long has LIM been in business?",
      a: "LIM has over **20 years of excellence** in crafting bespoke, high-end terrazzo surfaces. Our heritage blends traditional craftsmanship with contemporary design innovation."
    }
  ];

  if (typeof firebase !== 'undefined') {
    firebase.firestore().collection("collections").get().then(snapshot => {
      if (!snapshot.empty) {
        let cols = [];
        snapshot.forEach(doc => {
            let data = doc.data();
            let name = data.name || data.title || 'Unnamed';
            let desc = data.description || data.desc || data.detail || '';
            cols.push(`• **${name}** — ${desc}`);
        });
        if (cols.length > 0) {
            let collectionQA = QA.find(q => q.q === "What collections does LIM offer?");
            if (collectionQA) {
                collectionQA.a = "LIM currently offers the following collections:\n" + cols.join("\n") + "\nMore exclusive collections are in development!";
            }
        }
      }
    }).catch(err => console.log("Error loading collections for chatbot:", err));
  }

  const SUGGESTIONS = [
    "What sizes are available?",
    "Can I get custom tiles?",
    "What collections do you offer?",
    "How do I maintain terrazzo?",
    "Where is the showroom?"
  ];

  /* ── Find best answer ───────────────────────────────────── */
  async function findAnswer(input) {
    const lower = input.toLowerCase();
    let best = null, bestScore = 0;

    QA.forEach(item => {
      let score = 0;
      item.keywords.forEach(kw => {
        if (lower.includes(kw)) score++;
      });
      if (score > bestScore) { bestScore = score; best = item; }
    });

    if (best && bestScore > 0) return best.a;

    // Call Claude API for custom queries — strictly scoped to LIM Factory
    try {
      const systemPrompt = `You are a customer support assistant exclusively for LIM Factory — a luxury bespoke terrazzo tile brand based in London.

YOUR STRICT RULES:
1. ONLY answer questions about LIM Factory, terrazzo tiles, collections, pricing, ordering, installation, maintenance, showroom, contact, or related topics.
2. If the user asks ANYTHING unrelated to LIM or terrazzo (e.g. general knowledge, coding, math, news, other brands, weather, etc.), respond ONLY with: "I'm here specifically to help with LIM Factory questions. For anything else, feel free to reach us at limfactoryy@gmail.com or +44 (0) 203 514 0483. 😊"
3. Never break character or explain that you are an AI model.
4. Keep answers concise, warm, and professional.
5. Always encourage the customer to visit the showroom, contact via WhatsApp, or email for orders.

COMPANY FACTS:
- Showroom: 106 Columbia Road, London E2 7RG
- Phone/WhatsApp: +44 (0) 203 514 0483
- Email: limfactoryy@gmail.com
- Instagram: @terrazzobylimfactory
- 20+ years of excellence, 100% recycled marble
- Collections: Geometric, Organic, Cristal
- Ships worldwide, custom/bespoke orders available
- Tile sizes: 30×30 cm, 60×60 cm, 60×120 cm (custom available)
- Lead time for custom orders: 4–6 weeks

ADDITIONAL Q&A KNOWLEDGE:
${QA.map(q => `Q: ${q.q}\nA: ${q.a}`).join('\n\n')}`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: input }]
        })
      });

      if (!response.ok) throw new Error("API request failed");

      const data = await response.json();
      if (data.content && data.content.length > 0) {
        return data.content[0].text;
      }
    } catch (e) {
      console.error("Claude API Error:", e);
    }

    return "I'm not sure about that yet, but our team would love to help! 📧 limfactoryy@gmail.com or call +44 (0) 203 514 0483.";
  }

  /* ── Markdown-lite renderer ─────────────────────────────── */
  function renderText(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n•/g, '<br>•')
      .replace(/\n/g, '<br>');
  }

  /* ── Inject CSS ─────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    /* ── Chat Launcher ── */
    #lim-chat-launcher {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 9999;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #c8a96e;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 24px rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.25s cubic-bezier(.34,1.56,.64,1), box-shadow 0.25s;
    }
    #lim-chat-launcher:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 32px rgba(200,169,110,0.45);
    }
    #lim-chat-launcher svg { pointer-events: none; }

    /* Unread badge */
    #lim-chat-badge {
      position: absolute;
      top: -4px; right: -4px;
      width: 18px; height: 18px;
      border-radius: 50%;
      background: #e74c3c;
      color: #fff;
      font-size: 11px;
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      transition: transform 0.3s cubic-bezier(.34,1.56,.64,1);
    }
    #lim-chat-badge.hidden { transform: scale(0); }

    /* ── Chat Window ── */
    #lim-chat-window {
      position: fixed;
      bottom: 104px;
      right: 28px;
      z-index: 9998;
      width: 360px;
      max-height: 540px;
      border-radius: 18px;
      background: #111110;
      border: 1px solid rgba(200,169,110,0.25);
      box-shadow: 0 16px 64px rgba(0,0,0,0.65);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: 'Outfit', sans-serif;
      transform: scale(0.85) translateY(20px);
      transform-origin: bottom right;
      opacity: 0;
      pointer-events: none;
      transition: transform 0.3s cubic-bezier(.34,1.56,.64,1), opacity 0.25s ease;
    }
    #lim-chat-window.open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    /* Header */
    #lim-chat-header {
      background: linear-gradient(135deg, #1a1914 0%, #0f0e0c 100%);
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid rgba(200,169,110,0.18);
      flex-shrink: 0;
    }
    .lim-chat-avatar {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #c8a96e, #8b6914);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    .lim-chat-header-info h4 {
      margin: 0;
      color: #f0e6d0;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    .lim-chat-header-info span {
      font-size: 12px;
      color: #6fcf97;
      display: flex; align-items: center; gap: 4px;
    }
    .lim-online-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #6fcf97;
      display: inline-block;
      animation: lim-pulse 2s infinite;
    }
    @keyframes lim-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    #lim-chat-close {
      margin-left: auto;
      background: none; border: none;
      color: #888; cursor: pointer;
      font-size: 20px; line-height: 1;
      padding: 4px;
      border-radius: 50%;
      transition: color 0.2s, background 0.2s;
    }
    #lim-chat-close:hover { color: #c8a96e; background: rgba(200,169,110,0.1); }

    /* Messages area */
    #lim-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 18px 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scrollbar-width: thin;
      scrollbar-color: rgba(200,169,110,0.2) transparent;
    }
    #lim-chat-messages::-webkit-scrollbar { width: 4px; }
    #lim-chat-messages::-webkit-scrollbar-thumb { background: rgba(200,169,110,0.25); border-radius: 4px; }

    /* Bubbles */
    .lim-msg {
      max-width: 82%;
      line-height: 1.55;
      font-size: 13.5px;
      animation: lim-bubble-in 0.3s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes lim-bubble-in {
      from { transform: scale(0.85) translateY(8px); opacity: 0; }
      to   { transform: scale(1) translateY(0); opacity: 1; }
    }
    .lim-msg-bot {
      align-self: flex-start;
    }
    .lim-msg-user {
      align-self: flex-end;
    }
    .lim-bubble {
      padding: 10px 14px;
      border-radius: 16px;
      word-break: break-word;
    }
    .lim-msg-bot .lim-bubble {
      background: rgba(200,169,110,0.1);
      border: 1px solid rgba(200,169,110,0.2);
      color: #e8dcc8;
      border-bottom-left-radius: 4px;
    }
    .lim-msg-user .lim-bubble {
      background: linear-gradient(135deg, #c8a96e, #a07830);
      color: #1a1510;
      font-weight: 500;
      border-bottom-right-radius: 4px;
    }
    .lim-msg-time {
      font-size: 10.5px;
      color: #555;
      margin-top: 4px;
      padding: 0 4px;
    }
    .lim-msg-bot .lim-msg-time { text-align: left; }
    .lim-msg-user .lim-msg-time { text-align: right; }

    /* Typing indicator */
    #lim-typing {
      align-self: flex-start;
      display: none;
    }
    #lim-typing .lim-bubble {
      padding: 10px 16px;
      display: flex; gap: 5px; align-items: center;
    }
    .lim-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #c8a96e;
      animation: lim-typing-dot 1.2s infinite;
    }
    .lim-dot:nth-child(2) { animation-delay: 0.2s; }
    .lim-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes lim-typing-dot {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-5px); opacity: 1; }
    }

    /* Suggestions */
    #lim-suggestions {
      padding: 6px 14px 10px;
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      border-top: 1px solid rgba(200,169,110,0.1);
      flex-shrink: 0;
    }
    .lim-suggestion-chip {
      background: transparent;
      border: 1px solid rgba(200,169,110,0.35);
      color: #c8a96e;
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      padding: 5px 11px;
      border-radius: 20px;
      cursor: pointer;
      transition: background 0.2s, color 0.2s, transform 0.15s;
      white-space: nowrap;
    }
    .lim-suggestion-chip:hover {
      background: rgba(200,169,110,0.15);
      color: #f0d898;
      transform: translateY(-1px);
    }

    /* Input row */
    #lim-chat-input-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px 14px;
      border-top: 1px solid rgba(200,169,110,0.12);
      flex-shrink: 0;
    }
    #lim-chat-input {
      flex: 1;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(200,169,110,0.2);
      border-radius: 24px;
      padding: 10px 16px;
      color: #f0e6d0;
      font-family: 'Outfit', sans-serif;
      font-size: 13.5px;
      outline: none;
      transition: border-color 0.2s;
    }
    #lim-chat-input::placeholder { color: #555; }
    #lim-chat-input:focus { border-color: rgba(200,169,110,0.55); }
    #lim-chat-send {
      width: 40px; height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #c8a96e, #8b6914);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #lim-chat-send:hover { transform: scale(1.08); box-shadow: 0 4px 16px rgba(200,169,110,0.4); }
    #lim-chat-send:active { transform: scale(0.95); }

    /* Mobile */
    @media (max-width: 420px) {
      #lim-chat-window { width: calc(100vw - 24px); right: 12px; bottom: 92px; }
      #lim-chat-launcher { bottom: 20px; right: 16px; }
    }
  `;
  document.head.appendChild(style);

  /* ── Build HTML ─────────────────────────────────────────── */
  const launcher = document.createElement('button');
  launcher.id = 'lim-chat-launcher';
  launcher.setAttribute('aria-label', 'Open chat');
  launcher.innerHTML = `
    <div id="lim-chat-badge">1</div>
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M4 6C4 4.9 4.9 4 6 4H22C23.1 4 24 4.9 24 6V18C24 19.1 23.1 20 22 20H16L10 24V20H6C4.9 20 4 19.1 4 18V6Z"
            fill="#1a1510" stroke="#c8a96e" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="10" cy="13" r="1.3" fill="#c8a96e"/>
      <circle cx="14" cy="13" r="1.3" fill="#c8a96e"/>
      <circle cx="18" cy="13" r="1.3" fill="#c8a96e"/>
    </svg>`;

  const win = document.createElement('div');
  win.id = 'lim-chat-window';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', 'LIM Chat');
  win.innerHTML = `
    <div id="lim-chat-header">
      <div class="lim-chat-avatar">✦</div>
      <div class="lim-chat-header-info">
        <h4>LIM Factory</h4>
        <span><span class="lim-online-dot"></span>Online · replies instantly</span>
      </div>
      <button id="lim-chat-close" aria-label="Close chat">✕</button>
    </div>

    <div id="lim-chat-messages">
      <!-- messages injected here -->
      <div id="lim-typing" class="lim-msg lim-msg-bot">
        <div class="lim-bubble">
          <span class="lim-dot"></span><span class="lim-dot"></span><span class="lim-dot"></span>
        </div>
      </div>
    </div>

    <div id="lim-suggestions"></div>

    <div id="lim-chat-input-row">
      <input id="lim-chat-input" type="text" placeholder="Ask about our tiles…" autocomplete="off" maxlength="200"/>
      <button id="lim-chat-send" aria-label="Send">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2 9L16 2L9 16L8 10L2 9Z" fill="#1a1510" stroke="#1a1510" stroke-width="0.5" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>`;

  const fragment = document.createDocumentFragment();
  fragment.appendChild(launcher);
  fragment.appendChild(win);
  document.body.appendChild(fragment);

  /* ── References ─────────────────────────────────────────── */
  const messagesEl = document.getElementById('lim-chat-messages');
  const typingEl   = document.getElementById('lim-typing');
  const inputEl    = document.getElementById('lim-chat-input');
  const sendBtn    = document.getElementById('lim-chat-send');
  const closeBtn   = document.getElementById('lim-chat-close');
  const badge      = document.getElementById('lim-chat-badge');
  const suggestEl  = document.getElementById('lim-suggestions');

  /* ── Helpers ─────────────────────────────────────────────── */
  function getTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function addMessage(text, role) {
    const wrapper = document.createElement('div');
    wrapper.className = `lim-msg lim-msg-${role}`;
    wrapper.innerHTML = `<div class="lim-bubble">${renderText(text)}</div><div class="lim-msg-time">${getTime()}</div>`;
    messagesEl.insertBefore(wrapper, typingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    typingEl.style.display = 'flex';
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function hideTyping() { typingEl.style.display = 'none'; }

  function buildSuggestions(chips) {
    suggestEl.innerHTML = chips.map(label => `<button class="lim-suggestion-chip">${label}</button>`).join('');
  }

  let opened = false;
  function openChat() {
    win.classList.add('open');
    launcher.setAttribute('aria-expanded', 'true');
    badge.classList.add('hidden');
    opened = true;
    setTimeout(() => inputEl.focus(), 320);
  }
  function closeChat() {
    win.classList.remove('open');
    launcher.setAttribute('aria-expanded', 'false');
    opened = false;
  }

  /* ── Send logic ─────────────────────────────────────────── */
  async function sendMessage(text) {
    const msg = text.trim();
    if (!msg) return;
    inputEl.value = '';
    suggestEl.innerHTML = '';

    addMessage(msg, 'user');
    showTyping();

    const start = Date.now();
    const answer = await findAnswer(msg);
    const elapsed = Date.now() - start;
    const delay = Math.max(0, 800 - elapsed); // ensure natural typing delay

    setTimeout(() => {
      hideTyping();
      addMessage(answer, 'bot');
      // Offer a couple of follow-up suggestions
      buildSuggestions(SUGGESTIONS.sort(() => 0.5 - Math.random()).slice(0, 3));
    }, delay);
  }

  /* ── Events ─────────────────────────────────────────────── */
  launcher.addEventListener('click', () => opened ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);
  sendBtn.addEventListener('click', () => sendMessage(inputEl.value));
  inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(inputEl.value); });
  suggestEl.addEventListener('click', e => {
    if (e.target.classList.contains('lim-suggestion-chip')) {
      sendMessage(e.target.textContent);
    }
  });

  /* ── Boot: welcome message ───────────────────────────────── */
  setTimeout(() => {
    addMessage("👋 Welcome to **LIM Factory**! I'm here to answer any questions about our bespoke tile collections, sizing, customisation, and more. How can I help you today?", 'bot');
    buildSuggestions(SUGGESTIONS.slice(0, 4));
  }, 400);

})();
