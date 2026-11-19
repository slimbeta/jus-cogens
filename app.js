(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const DESKS = { latest: "Latest", car: "CAR & SCC", icc: "ICC", courts: "Courts", rights: "Human rights", analysis: "Analysis", saved: "Saved" };
  const DESK_NOTES = {
    car: "Radio Ndeke Luka, Corbeau News, Oubangui M\u00e9dias, RFI and UN News, coverage of the Special Criminal Court in French and English, and every CAR story from the other desks",
    icc: "ICC press releases, the Coalition for the ICC, and every ICC story from the other desks",
    courts: "the ICC, Justice Info, the ICJ, the Kosovo Specialist Chambers, the IRMCT and TRIAL International",
    rights: "Human Rights Watch, Amnesty International, FIDH and UN News",
    analysis: "EJIL:Talk!, Opinio Juris, Just Security, Articles of War and the ICRC\u2019s Law & Policy blog",
  };
  let articles = [];
  let brief = null;
  let view = store.get("jc-view", "latest");
  if (!DESKS[view]) view = "latest";
  const saved = new Set(store.get("jc-saved", []));
  const tpl = $("#t-story");
  const content = $("#content");

  const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
  $("#today").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(new Date());

  function ago(iso) {
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 60) return m <= 1 ? "Just now" : `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
    const d = Math.round(h / 24);
    return d === 1 ? "Yesterday" : `${d} days ago`;
  }
  const dayKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const empty = (msg) => { content.replaceChildren(el("p", "empty", msg)); };

  function kicker(a) {
    const k = el("p", "kicker");
    k.append(document.createTextNode(a.byline ? `${a.source} · ${a.byline}` : a.source));
    if (a.lang === "fr") k.append(el("span", "tag", "FR"));
    if (a.note) k.append(el("span", "tag", a.note));
    return k;
  }

  function saveButton(a, btn, after) {
    const paint = () => { const on = saved.has(a.url); btn.setAttribute("aria-pressed", on); btn.textContent = on ? "Saved" : "Save"; };
    paint();
    btn.addEventListener("click", () => {
      saved.has(a.url) ? saved.delete(a.url) : saved.add(a.url);
      store.set("jc-saved", [...saved]); paint(); counts(); after && after();
    });
  }

  function card(a, cls) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    if (cls) node.classList.add(cls);
    node.querySelector(".story-link").href = a.url;
    node.querySelector(".kicker").replaceWith(kicker(a));
    node.querySelector(".hed").textContent = a.title;
    const dek = node.querySelector(".dek");
    if (a.lede) dek.textContent = a.lede; else dek.remove();
    if (a.image) {
      const fig = node.querySelector(".story-photo"), img = fig.querySelector("img");
      img.src = a.image;
      img.addEventListener("error", () => { fig.remove(); node.classList.remove("has-photo"); });
      fig.hidden = false; node.classList.add("has-photo");
    } else node.querySelector(".story-photo").remove();
    node.querySelector(".age").textContent = ago(a.published);
    saveButton(a, node.querySelector(".save"), () => { if (view === "saved") render(); });
    return node;
  }

  function front(list) {
    const top = list.slice(0, 12);
    const lead = top[Math.max(0, top.findIndex((a) => a.image && a.lede))];
    const rest = list.filter((a) => a !== lead);
    const wrap = el("div", "front");
    const leadCol = el("div", "lead-col"), side = el("div", "side-col");
    const leadCard = card(lead, "lead");
    const dek = leadCard.querySelector(".dek");
    if (dek && /^[A-Za-z]/.test(dek.textContent)) dek.classList.add("dropcap");
    leadCol.append(leadCard);
    rest.slice(0, 3).forEach((a) => side.append(card(a)));
    wrap.append(leadCol, side);
    const frag = document.createDocumentFragment();
    if (brief && brief.bullets && brief.bullets.length) frag.append(briefing(brief));
    frag.append(wrap);
    // One row per desk, so every kind of coverage shows up on the front page
    for (const desk of ["car", "icc", "courts", "rights", "analysis"]) {
      const items = rest.slice(3).filter((a) => inDesk(a, desk)).slice(0, 4);
      if (!items.length) continue;
      const h = el("h2", "rule-heading");
      const btn = el("button", "desk-link", DESKS[desk]);
      btn.type = "button"; btn.addEventListener("click", () => go(desk));
      h.append(btn);
      const grid = el("div", "grid");
      items.forEach((a) => grid.append(card(a)));
      frag.append(h, grid);
    }
    content.replaceChildren(frag);
  }

  // The week in international justice: a headline of the top themes, then one sentence per story with its source linked
  function briefing(b) {
    const sec = el("section", "briefing");
    sec.setAttribute("aria-label", "The week in international justice");
    sec.append(el("p", "briefing-label", `The week in international justice \u00b7 ${b.period}`));
    sec.append(el("h2", "briefing-head", b.headline));
    const ul = el("ul", "briefing-list");
    for (const x of b.bullets) {
      const li = el("li");
      li.append(document.createTextNode(`${x.text} (`));
      const a = el("a", null, x.source);
      a.href = x.url; a.target = "_blank"; a.rel = "noopener";
      li.append(a, document.createTextNode(")"));
      ul.append(li);
    }
    sec.append(ul);
    return sec;
  }

  function editions(list, note) {
    const frag = document.createDocumentFragment();
    if (note) frag.append(el("p", "desk-note", note));
    let cur = null, box = null;
    for (const a of list) {
      const k = dayKey(a.published);
      if (k !== cur) {
        cur = k;
        box = el("section", "edition list");
        box.append(el("h2", "edition-date", dayFmt.format(new Date(a.published))));
        frag.append(box);
      }
      box.append(card(a));
    }
    content.replaceChildren(frag);
  }

  // CAR & SCC and ICC gather tagged stories from every desk
  function inDesk(a, desk) {
    const tags = a.tags || [];
    if (desk === "car") return a.desk === "car" || tags.includes("car");
    if (desk === "icc") return tags.includes("icc");
    return a.desk === desk;
  }

  function currentList() {
    if (view === "saved") return articles.filter((a) => saved.has(a.url));
    if (view === "latest") return articles;
    return articles.filter((a) => inDesk(a, view));
  }

  function render() {
    document.querySelectorAll(".sections button[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    if (!articles.length) return empty("No stories yet. Check back soon.");
    const list = currentList();
    if (view === "saved") return list.length ? editions(list) : empty("Tap Save on any story to keep it here.");
    if (view === "latest") return front(list);
    return list.length ? editions(list, `From ${DESK_NOTES[view]}.`) : empty("Nothing new on this desk lately.");
  }

  function go(v) {
    view = v; store.set("jc-view", view); render(); window.scrollTo({ top: 0 });
    document.querySelector(`.sections button[data-view="${v}"]`)?.scrollIntoView({ inline: "center", block: "nearest" });
  }
  function counts() { $("#saved-count").textContent = saved.size ? `(${saved.size})` : ""; }

  // Skim: one continuous column of the latest stories with their opening paragraphs
  const skimEl = $("#skim"), track = $("#skim-track"), skimCount = $("#skim-count");
  let skimObserver = null, pushedSkim = false;
  function skimCard(a, i) {
    const c = el("article", "skim-card");
    if (a.image) {
      const fig = el("figure", "skim-photo"), img = document.createElement("img");
      img.alt = ""; img.decoding = "async"; img.referrerPolicy = "no-referrer";
      if (i > 1) img.loading = "lazy";
      img.src = a.image; img.addEventListener("error", () => fig.remove());
      fig.append(img); c.append(fig);
    } else c.classList.add("no-photo");
    const body = el("div", "skim-body");
    body.append(kicker(a), el("h2", "skim-hed", a.title));
    body.append(el("p", "skim-meta", `${DESKS[a.desk] || ""} · ${ago(a.published)}`));
    const paras = a.paragraphs || [];
    const sum = el("div", "skim-summary");
    if (a.description) sum.append(el("p", "skim-desc", a.description));
    paras.forEach((t, j) => sum.append(el("p", j === 0 && !a.description && /^[A-Za-z]/.test(t) ? "skim-excerpt first" : "skim-excerpt", t)));
    if (!a.description && !paras.length) {
      sum.append(el("p", "skim-none", a.via_google
        ? `Headline via Google News — ${a.source} doesn’t offer a preview.`
        : "No preview from the publisher — tap through to read it."));
    }
    body.append(sum);
    c.append(body);
    const foot = el("div", "skim-foot");
    if (paras.length) foot.append(el("p", "skim-cont", `Continues at ${a.source}`));
    const goBtn = el("a", "skim-read", "Read the full piece →");
    goBtn.href = a.url; goBtn.target = "_blank"; goBtn.rel = "noopener";
    const sv = el("button", "save"); sv.type = "button"; saveButton(a, sv);
    const actions = el("div", "skim-actions"); actions.append(sv, goBtn); foot.append(actions);
    c.append(foot);
    c.dataset.index = i + 1;
    return c;
  }
  function openSkim() {
    const list = (view === "latest" || view === "saved" ? articles : currentList()).slice(0, 30);
    if (!list.length) return;
    $("#skim-title").textContent = view === "latest" || view === "saved" ? "Skim" : `Skim · ${DESKS[view]}`;
    track.replaceChildren(...list.map(skimCard));
    const end = el("div", "skim-card skim-end");
    end.append(el("p", "fleuron", "❦"), el("p", "skim-end-text", "You’re all caught up."));
    const back = el("button", "skim-read", "Back to the front page"); back.type = "button"; back.addEventListener("click", closeSkim);
    end.append(back); track.append(end);
    skimEl.hidden = false; document.body.classList.add("skimming");
    track.scrollTop = 0;
    skimCount.textContent = `1 of ${list.length}`;
    skimObserver?.disconnect();
    skimObserver = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting && e.target.dataset.index) skimCount.textContent = `${e.target.dataset.index} of ${list.length}`;
    }), { root: track, rootMargin: "-35% 0px -60% 0px" });
    track.querySelectorAll(".skim-card").forEach((c) => skimObserver.observe(c));
    if (location.hash !== "#skim") { history.pushState(null, "", "#skim"); pushedSkim = true; }
  }
  function closeSkim(fromPop) {
    if (skimEl.hidden) return;
    skimEl.hidden = true; document.body.classList.remove("skimming");
    skimObserver?.disconnect();
    if (fromPop !== true && location.hash === "#skim") {
      if (pushedSkim) history.back(); else history.replaceState(null, "", location.pathname + location.search);
    }
    pushedSkim = false;
    render();
  }
  $("#skim-close").addEventListener("click", closeSkim);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSkim(); });
  window.addEventListener("popstate", () => { if (location.hash !== "#skim") closeSkim(true); });
  document.querySelector("[data-action=skim]").addEventListener("click", openSkim);
  document.querySelectorAll(".sections button[data-view]").forEach((b) => b.addEventListener("click", () => go(b.dataset.view)));

  $("#theme-toggle").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("jc-theme", root.dataset.theme); } catch (e) {}
  });

  async function load() {
    try {
      const r = await fetch("data/articles.json", { cache: "no-cache" });
      if (!r.ok) throw new Error(r.status);
      const data = await r.json();
      articles = data.articles || [];
      brief = data.briefing || null;
      $("#updated").textContent = `Updated ${ago(data.updated).toLowerCase()}`;
      render();
      if (location.hash === "#skim" && skimEl.hidden) openSkim();
    } catch (e) {
      if (!articles.length) empty("Couldn’t reach the newsroom. Pull down to try again.");
    }
  }
  counts();
  load();
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") load(); });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
