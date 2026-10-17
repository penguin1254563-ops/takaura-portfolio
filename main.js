(() => {
  "use strict";

  const SITE = window.SITE || {};
  const WORKS = window.WORKS || [];
  const CATEGORIES = window.CATEGORIES || {};
  // 壁の動きの設定（works.js の WALL で変えられる）
  const WALL = { cutsDir: "cuts", cutSeconds: 6, fadeMs: 1200, rippleMs: 150, ...(window.WALL || {}) };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "style") node.style.cssText = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const c of [].concat(children)) if (c != null) node.append(c);
    return node;
  };
  const ratioValue = (r) => { const [w, h] = String(r || "16:9").split(":").map(Number); return w / h; };
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------- サイト情報 ---------- */
  document.querySelectorAll("[data-site]").forEach((node) => {
    const v = SITE[node.dataset.site];
    if (v) node.textContent = v;
  });
  if (SITE.name) document.title = `${SITE.name} — AI Film Portfolio`;
  $("#year").textContent = new Date().getFullYear();
  (SITE.links || []).forEach((l) => {
    $("#contact-links").append(el("li", {}, el("a", { class: "btn", href: l.url, target: "_blank", rel: "noopener", text: l.label })));
    $("#contact-more").hidden = false;
  });
  if (SITE.crowdworks) $("#contact-cw").href = SITE.crowdworks; else $("#contact-cw").closest(".contact__card").querySelectorAll(".contact__cta, .contact__small, .contact__label:first-child").forEach((n) => (n.hidden = true));
  if (SITE.email) $("#contact-mail").hidden = false;
  $("#copy-email").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText($("#contact-email").textContent.trim());
      btn.textContent = "コピーしました";
    } catch {
      const range = document.createRange();
      range.selectNodeContents($("#contact-email"));
      const s = getSelection(); s.removeAllRanges(); s.addRange(range);
      btn.textContent = "選択しました";
    }
    setTimeout(() => (btn.textContent = "コピー"), 2000);
  });

  /* ---------- フィルムの粒子（小さなノイズ画像を一度だけ作って敷き詰める） ---------- */
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 180;
    const g = c.getContext("2d");
    const img = g.createImageData(180, 180);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    document.documentElement.style.setProperty("--grain", `url(${c.toDataURL("image/png")})`);
  } catch { /* 粒子なしでも表示は崩れない */ }

  /* ---------- 作品とカット ---------- */
  const works = WORKS.map((w, i) => {
    const n = Number(w.cuts) || 0;
    const cuts = Array.from({ length: n }, (_, k) => {
      const base = `works/${w.id}/${WALL.cutsDir}/${String(k + 1).padStart(2, "0")}`;
      return { src: `${base}.mp4`, poster: `${base}.jpg`, workIndex: i };
    });
    return { ...w, index: i, cutList: cuts };
  });
  const primaryCat = (w) => (w.categories || [])[0];

  /* ---------- タイル：2枚の動画を重ねて使い、合図があったら次のカットへ溶け替わる ---------- */
  const CUT_SECONDS = WALL.cutSeconds; // 全カットの長さ（scripts/portfolio-cuts.mjs の --length と同じ）
  const FADE_MS = WALL.fadeMs;         // 溶け替わりの時間
  document.documentElement.style.setProperty("--fade", `${FADE_MS}ms`);
  const SETTLE_MS = FADE_MS * 2 + 200; // 古い側が完全に消えて、次を読み込んでよくなるまで

  class Tile {
    constructor(wall, { work = null } = {}) {
      this.wall = wall;
      this.work = work;     // 用途ブロックでは1作品に固定。トップの壁では null（カットごとに変わる）
      this.cut = null;
      this.next = null;
      this.layers = [0, 1].map(() => {
        const v = el("video", { muted: true, playsinline: true, preload: "none", "aria-hidden": "true" });
        v.muted = true;
        return v;
      });
      this.front = null;
      this.title = el("span", { class: "tile__title", text: work ? work.title : "" });
      this.meta = el("span", { class: "tile__meta", text: work ? [work.duration, work.ratio].filter(Boolean).join(" · ") : "" });
      this.node = el("button", { class: "tile", type: "button", onclick: () => this.cut && openViewer(this.cut.workIndex) }, [
        ...this.layers,
        el("span", { class: "tile__label" }, [this.title, this.meta]),
      ]);
      if (work) this.node.setAttribute("aria-label", `${work.title} を再生`);
    }
    get back() { return this.layers.find((v) => v !== this.front); }
    setCut(cut) {
      this.cut = cut;
      this.node.style.backgroundImage = `url("${cut.poster}")`;
      if (!this.work) {
        const w = works[cut.workIndex];
        this.node.setAttribute("aria-label", `${w.title} を再生`);
        this.title.textContent = w.title;
        this.meta.textContent = [w.duration, w.ratio].filter(Boolean).join(" · ");
      }
    }
    // 最初のカットを用意（静止画を出し、動画を読み込んでおく）
    prime(cut) {
      this.setCut(cut);
      const v = this.layers[0];
      v.preload = "auto";
      v.src = cut.src;
      this.front = v;
      return new Promise((res) => {
        if (v.readyState >= 3) return res();
        v.addEventListener("canplay", res, { once: true });
        v.addEventListener("error", res, { once: true });
      });
    }
    start() {
      this.front.classList.add("is-front");
      this.front.play().catch(() => {});
    }
    // 次のカットを、見えていない側の動画に読み込んでおく
    prepare(cut) {
      this.next = cut || null;
      if (!cut) return;
      const v = this.back;
      v.preload = "auto";
      v.src = cut.src;
      v.load();
    }
    // delay ミリ秒後に次のカットへ。新しいカットを上に重ねて溶かし入れ、古い側は見えなくなってから片付ける
    switch(delay = 0) {
      if (this.busy) return;
      const next = this.next;
      if (!next || next === this.cut) { this.front.currentTime = 0; this.front.play().catch(() => {}); return; }
      const v = this.back;
      this.busy = true;
      const go = () => {
        v.currentTime = 0;
        v.play().catch(() => {});
        const old = this.front, oldCut = this.cut;
        old.classList.replace("is-front", "is-under");
        v.classList.add("is-front");
        this.front = v;
        this.next = null;
        this.setCut(next);
        setTimeout(() => { old.classList.remove("is-under"); old.pause(); }, FADE_MS + 100);
        setTimeout(() => { this.busy = false; this.wall.settled(this, oldCut); }, SETTLE_MS);
      };
      setTimeout(() => (v.readyState >= 2 ? go() : v.addEventListener("canplay", go, { once: true })), delay);
    }
    pause() { this.layers.forEach((v) => v.pause()); }
    restart() { if (this.front) { this.front.currentTime = 0; this.front.play().catch(() => {}); } }
  }

  /* ---------- 壁の共通部分：画面に入ったら全タイル同時に動き出し、CUT_SECONDS ごとに切り替える ---------- */
  class Wall {
    constructor(node, tiles) {
      this.node = node;
      this.tiles = tiles.map((t) => new Tile(this, t));
      this.tiles.forEach((t) => node.append(t.node));
      this.started = false;
      this.timer = null;
    }
    visibleTiles() { return this.tiles.filter((t) => t.node.offsetParent !== null); }
    async begin() {
      if (this.started) return;
      this.started = true;
      const tiles = this.visibleTiles();
      const first = this.firstCuts(tiles);
      await Promise.race([Promise.all(tiles.map((t, i) => (first[i] ? t.prime(first[i]) : null))), new Promise((r) => setTimeout(r, 2000))]);
      if (!this.visible || this.held) { this.started = false; this.reset?.(); return; }
      tiles.forEach((t) => t.cut && t.start()); // 全タイル同時にスタート
      this.node.classList.add("is-live");
      this.afterStart(tiles);
      this.schedule();
    }
    schedule() { this.clear(); this.timer = setInterval(() => this.beat(), CUT_SECONDS * 1000); }
    clear() { clearInterval(this.timer); this.timer = null; }
    pause() { this.clear(); this.tiles.forEach((t) => t.pause()); }
    resume() { this.visibleTiles().forEach((t) => t.restart()); this.schedule(); }
    still() { const tiles = this.visibleTiles(); this.firstCuts(tiles).forEach((c, i) => c && tiles[i].setCut(c)); }
  }

  /* ---------- 用途ごとのブロック：1枠＝1作品。その作品のカットを順番に、ブロック内で同時に切り替える ---------- */
  class WorkWall extends Wall {
    nextOf(tile) {
      const list = tile.work.cutList;
      if (list.length < 2) return null;
      const i = list.indexOf(tile.next || tile.cut);
      return list[(i + 1) % list.length];
    }
    firstCuts(tiles) { return tiles.map((t) => t.work.cutList[0]); }
    afterStart(tiles) { tiles.forEach((t) => t.prepare(this.nextOf(t))); }
    beat() { this.visibleTiles().forEach((t) => t.switch()); }
    settled(tile) { tile.prepare(this.nextOf(tile)); }
  }

  /* ---------- トップの壁：チャプター（Ocean / Forest …）ごとに9枠をそろえ、さざ波のように切り替える ---------- */
  const RIPPLE_MS = WALL.rippleMs;
  // 枠の並び a a b c / a a d e / f g h i を左上から右下への対角線の順に、少しずつ遅らせる
  const RIPPLE_STEP = [0, 2, 3, 3, 4, 2, 3, 4, 5];

  class ChapterWall extends Wall {
    constructor(node, tiles, chapters, label) {
      super(node, tiles);
      this.chapters = chapters;
      this.label = label;
      this.k = 0;
    }
    // k 番目のチャプターで各枠に出すカット。巡るたびに並びをずらす（大きい枠は毎回そのチャプターの先頭側から）
    plan(k, count) {
      const ch = this.chapters[k % this.chapters.length];
      const round = Math.floor(k / this.chapters.length);
      const own = ch.cuts.length ? [...ch.cuts.slice(round % ch.cuts.length), ...ch.cuts.slice(0, round % ch.cuts.length)] : [];
      const picks = [...own, ...ch.fill.filter((c) => !own.includes(c))];
      return picks.slice(0, count);
    }
    showLabel(k) {
      const n = this.chapters.length;
      const ch = this.chapters[k % n];
      this.label.no.textContent = String((k % n) + 1).padStart(2, "0");
      this.label.total.textContent = String(n).padStart(2, "0");
      this.label.name.textContent = ch.label;
      if (ch.tint) document.documentElement.style.setProperty("--tint", ch.tint); // ページの色もチャプターに合わせる
      this.label.node.classList.remove("is-in"); void this.label.node.offsetWidth; this.label.node.classList.add("is-in");
    }
    firstCuts(tiles) { this.k = 0; this.showLabel(0); return this.plan(0, tiles.length); }
    // 次のチャプターにも出るカットは、いま映している枠にそのまま残す（切り替えの途中で同じカットが2枠に並ばないように）
    prepareNext(tiles) {
      const picks = this.plan(this.k + 1, tiles.length);
      tiles.forEach((t, j) => {
        const i = picks.indexOf(t.cut);
        if (i >= 0 && i !== j) [picks[i], picks[j]] = [picks[j], picks[i]];
      });
      picks.forEach((c, i) => tiles[i] && tiles[i].prepare(c));
    }
    afterStart(tiles) { this.prepareNext(tiles); }
    beat() {
      if (this.held) return;
      const tiles = this.visibleTiles();
      this.k += 1;
      this.showLabel(this.k);
      tiles.forEach((t, i) => t.switch((RIPPLE_STEP[i] ?? i) * RIPPLE_MS));
      // 全枠が落ち着いたら、次のチャプターのカットを読み込んでおく
      clearTimeout(this.prepTimer);
      this.prepTimer = setTimeout(() => this.prepareNext(tiles), Math.max(...RIPPLE_STEP) * RIPPLE_MS + SETTLE_MS + 100);
    }
    settled() {}
  }

  const walls = [];

  /* ---------- トップの壁 ---------- */
  const cutById = new Map(works.flatMap((w) => w.cutList.map((c, k) => [`${w.id}/${String(k + 1).padStart(2, "0")}`, c])));
  const resolve = (ids) => (ids || []).map((id) => cutById.get(id)).filter(Boolean);
  let chapters = (window.CHAPTERS || []).map((c) => ({ label: c.label, tint: c.tint, cuts: resolve(c.cuts), fill: resolve(c.fill) })).filter((c) => c.cuts.length);
  if (!chapters.length) { // チャプター未設定なら、全カットを9本ずつ順番に
    const all = works.filter((w) => ratioValue(w.ratio) >= 1.3).flatMap((w) => w.cutList);
    chapters = [];
    for (let i = 0; i < all.length; i += 9) chapters.push({ label: "Works", cuts: all.slice(i, i + 9), fill: all.slice(0, 9) });
  }
  const chapterLabel = {
    node: $("#chapter"), no: $("#chapter-no"), total: $("#chapter-total"), name: $("#chapter-name"),
  };
  const heroWall = new ChapterWall($("#hero-wall"), Array.from({ length: 9 }, () => ({})), chapters, chapterLabel);
  walls.push(heroWall);

  // 一時停止ボタン（トップの壁だけ）
  const pauseBtn = $("#wall-pause");
  pauseBtn.addEventListener("click", () => {
    heroWall.held = !heroWall.held;
    pauseBtn.setAttribute("aria-pressed", String(heroWall.held));
    pauseBtn.setAttribute("aria-label", heroWall.held ? "映像を再生" : "映像を一時停止");
    if (heroWall.held) heroWall.pause();
    else if (heroWall.started) heroWall.resume();
    else heroWall.begin();
  });

  /* ---------- トップの目次（用途） ---------- */
  const keys = [...Object.keys(CATEGORIES), ...new Set(works.map(primaryCat).filter((k) => k && !CATEGORIES[k]))];
  for (const key of keys) {
    const count = works.filter((w) => primaryCat(w) === key).length;
    const label = CATEGORIES[key] || { en: key, ja: key };
    $("#hero-categories").append(el("li", { class: count ? "" : "is-soon" }, el("a", { href: count ? `#cat-${key}` : "#contact" }, [
      el("span", { text: label.ja }),
      el("span", { class: "mono", text: count ? `${count} ${count === 1 ? "work" : "works"}` : "Coming soon" }),
    ])));
  }

  /* ---------- 用途ごとのブロック ---------- */
  function partition(n) { // 1〜5枚のブロックに分ける
    if (n <= 5) return n ? [n] : [];
    const out = [];
    let rest = n;
    while (rest > 5) { out.push(5); rest -= 5; }
    if (rest === 1) { out.pop(); out.push(3, 3); } else out.push(rest);
    return out;
  }

  for (const key of keys) {
    const list = works.filter((w) => primaryCat(w) === key && w.cutList.length);
    if (!list.length) continue;
    const label = CATEGORIES[key] || { en: key, ja: "" };
    const section = el("section", { class: "category", id: `cat-${key}`, "aria-label": label.ja || label.en }, [
      el("div", { class: "category__head" }, [
        el("h2", { class: "category__title", text: label.en }),
        el("span", { class: "category__ja", text: label.ja }),
        el("span", { class: "category__count mono", text: `${list.length} ${list.length === 1 ? "work" : "works"}` }),
      ]),
    ]);
    const wide = list.filter((w) => ratioValue(w.ratio) >= 1.3);
    const other = list.filter((w) => ratioValue(w.ratio) < 1.3);
    let i = 0;
    partition(wide.length).forEach((n, b) => {
      const block = el("div", { class: `wall block${b % 2 ? " is-flip" : ""}`, "data-n": String(n) });
      walls.push(new WorkWall(block, wide.slice(i, i + n).map((w) => ({ work: w }))));
      section.append(block);
      i += n;
    });
    if (other.length) {
      const strip = el("div", { class: "wall strip" });
      const wall = new WorkWall(strip, other.map((w) => ({ work: w })));
      wall.tiles.forEach((t, k) => t.node.style.setProperty("--tile-ar", String(other[k].ratio).replace(":", " / ")));
      walls.push(wall);
      section.append(strip);
    }
    // 壁の下に作品名と説明の一覧（マウスを乗せなくても何の作品か分かるように）
    section.append(el("div", { class: "work-list" }, list.map((w) => el("button", {
      class: "work-item", type: "button", onclick: () => openViewer(w.index), "aria-label": `${w.title} を再生`,
    }, [
      el("span", { class: "work-item__head" }, [
        el("span", { class: "work-item__title", text: w.title }),
        el("span", { class: "work-item__meta mono", text: [w.duration, w.ratio].filter(Boolean).join(" · ") }),
      ]),
      w.titleEn ? el("span", { class: "work-item__en", text: w.titleEn }) : null,
      el("span", { class: "work-item__desc", text: w.description || "" }),
      el("span", { class: "work-item__play mono" }, ["Play", el("span", { "aria-hidden": "true", text: "→" })]),
    ]))));
    $("#works").append(section);
  }

  /* ---------- 画面に入った壁だけを動かす ---------- */
  const byNode = new Map(walls.map((w) => [w.node, w]));
  if (reduceMotion || !("IntersectionObserver" in window)) {
    walls.forEach((w) => w.still());
  } else {
    const seen = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const wall = byNode.get(e.target);
        wall.visible = e.isIntersecting;
        if (!e.isIntersecting) wall.pause();
        else if (wall.held) continue;
        else if (wall.started) wall.resume();
        else wall.begin();
      }
    }, { threshold: 0.3 });
    walls.forEach((w) => seen.observe(w.node));
  }

  /* ---------- 作品ページ（全画面）：本編・説明・カット一覧・前後の作品 ---------- */
  const viewer = $("#viewer");
  let current = -1;
  const pad2 = (n) => String(n).padStart(2, "0");

  function filmFrame(cut, k) {
    const v = el("video", { muted: true, loop: true, playsinline: true, preload: "none", "aria-hidden": "true" });
    v.muted = true;
    const play = () => { if (!v.src) v.src = cut.src; v.play().then(() => li.classList.add("is-playing")).catch(() => {}); };
    const stop = () => { v.pause(); li.classList.remove("is-playing"); };
    const li = el("li", { class: "filmstrip__frame" }, [
      el("button", {
        type: "button", class: "filmstrip__btn", "aria-label": `カット ${pad2(k + 1)} を再生`,
        onclick: () => (li.classList.contains("is-playing") ? stop() : play()),
        onpointerenter: (e) => e.pointerType === "mouse" && play(),
        onpointerleave: (e) => e.pointerType === "mouse" && stop(),
      }, [
        el("img", { src: cut.poster, alt: "", loading: "lazy", decoding: "async" }),
        v,
      ]),
      el("span", { class: "filmstrip__no mono", text: pad2(k + 1) }),
    ]);
    return li;
  }

  function nextCard(btn, w, dir) {
    btn.hidden = !w;
    if (!w) return;
    btn.style.backgroundImage = w.poster ? `url("${w.poster}")` : "";
    btn.replaceChildren(
      el("span", { class: "nextcard__dir mono", text: dir < 0 ? "← Previous" : "Next →" }),
      el("span", { class: "nextcard__title", text: w.title }),
      el("span", { class: "nextcard__en", text: w.titleEn || "" }),
    );
    btn.setAttribute("aria-label", `${dir < 0 ? "前" : "次"}の作品：${w.title}`);
  }

  function openViewer(index) {
    const w = works[index];
    if (!w) return;
    current = index;
    const area = $("#viewer-media");
    area.replaceChildren();
    area.style.aspectRatio = String(w.ratio || "16:9").replace(":", " / ");
    area.style.width = `min(100%, calc(74dvh * ${ratioValue(w.ratio)}))`; // 縦長も画面に収める
    if (w.video) {
      area.append(el("video", { src: w.video, poster: w.poster || null, controls: true, autoplay: true, playsinline: true }));
    } else if (w.youtube) {
      area.append(el("iframe", { src: `https://www.youtube-nocookie.com/embed/${w.youtube}?autoplay=1&rel=0`, allow: "autoplay; fullscreen; picture-in-picture", allowfullscreen: true, title: w.title }));
    } else if (w.vimeo) {
      area.append(el("iframe", { src: `https://player.vimeo.com/video/${w.vimeo}?autoplay=1`, allow: "autoplay; fullscreen; picture-in-picture", allowfullscreen: true, title: w.title }));
    }

    const catKey = primaryCat(w);
    $("#viewer-cat").textContent = (CATEGORIES[catKey] || {}).en || catKey || "";
    $("#viewer-pos").textContent = `${pad2(index + 1)} / ${pad2(works.length)}`;
    $("#viewer-title").textContent = w.title;
    $("#viewer-en").textContent = w.titleEn || "";
    $("#viewer-desc").textContent = w.description || "";
    // 任意の項目（works.js に書いたときだけ出る）：concept＝制作の狙い
    $("#viewer-notes").replaceChildren(...(w.concept ? [el("p", { class: "workpage__label mono", text: "Concept" }), el("p", { class: "workpage__concept", text: w.concept })] : []));
    const cat = (w.categories || []).map((k) => (CATEGORIES[k] || {}).ja || k).join("・");
    const specs = [["Use", cat], ["Length", w.duration], ["Ratio", w.ratio], ["Year", w.year],
      ["Role", w.role], ["Period", w.period], ["Tools", (w.tools || []).join(" / ")]].filter(([, v]) => v);
    $("#viewer-specs").replaceChildren(...specs.map(([k, v]) => el("div", {}, [el("dt", { text: k }), el("dd", { text: String(v) })])));

    $("#viewer-strip").replaceChildren(...w.cutList.map(filmFrame));
    $("#viewer-cutcount").textContent = `${w.cutList.length} shots · ${matchMedia("(hover: hover)").matches ? "hover" : "tap"} to play`;
    nextCard($("#viewer-prev"), works[index - 1], -1);
    nextCard($("#viewer-next"), works[index + 1], 1);

    walls.forEach((wall) => wall.pause()); // 本編に集中
    if (!viewer.open) viewer.showModal();
    viewer.scrollTop = 0;
    if (location.hash !== `#work-${w.id}`) history.replaceState(null, "", `#work-${w.id}`);
  }

  function closeViewer() { if (viewer.open) viewer.close(); }
  viewer.addEventListener("close", () => {
    $("#viewer-media").replaceChildren();
    $("#viewer-strip").replaceChildren();
    if (location.hash.startsWith("#work-")) history.replaceState(null, "", location.pathname + location.search);
    walls.forEach((wall) => wall.visible && wall.started && !wall.held && wall.resume());
  });
  $("#viewer-close").addEventListener("click", closeViewer);
  $("#viewer-prev").addEventListener("click", () => openViewer(current - 1));
  $("#viewer-next").addEventListener("click", () => openViewer(current + 1));
  viewer.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("video")) return; // 動画の操作中は矢印キーを奪わない
    if (e.key === "ArrowLeft") openViewer(current - 1);
    if (e.key === "ArrowRight") openViewer(current + 1);
  });

  /* ---------- ショーリール ---------- */
  const reel = $("#reel");
  if (SITE.reel && SITE.reel.video) {
    $("#reel-meta").textContent = SITE.reel.length || "";
    $("#open-reel").addEventListener("click", () => {
      $("#reel-stage").replaceChildren(el("video", { src: SITE.reel.video, poster: SITE.reel.poster || null, controls: true, autoplay: true, playsinline: true }));
      walls.forEach((wall) => wall.pause());
      reel.showModal();
    });
    $("#reel-close").addEventListener("click", () => reel.close());
    reel.addEventListener("close", () => {
      $("#reel-stage").replaceChildren();
      walls.forEach((wall) => wall.visible && wall.started && !wall.held && wall.resume());
    });
  } else {
    $("#open-reel").hidden = true;
  }

  function openFromHash() {
    const m = location.hash.match(/^#work-(.+)$/);
    const w = m && works.find((x) => x.id === decodeURIComponent(m[1]));
    if (w) openViewer(w.index);
  }
  openFromHash();
  addEventListener("hashchange", openFromHash);
})();
