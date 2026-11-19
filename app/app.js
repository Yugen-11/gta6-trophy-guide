// Leonida Trophy Guide: an offline tracker for the 55 official GTA VI PS5
// trophies. Everything is local: the list is data/trophies.json, progress
// lives in localStorage, and the app makes no network request at run time.
//
// Views: Checklist (search, grade + kind filters, spoiler setting, export /
// import, a guide pane for the selected trophy), Roadmap (three phases to the
// platinum), Missables (the one possibly missable trophy, and the trophies
// whose exact trigger is not yet confirmed), Sources (every cited source).

const EARNED_KEY = 'leonida-trophy-earned-v1';
const NOTES_KEY = 'leonida-trophy-notes-v1';
const SPOILER_KEY = 'leonida-trophy-spoiler-v1';

const SOURCES = {
  exophase: ['Exophase — official list', 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/'],
  psnprofiles: ['PSNProfiles — PSN targets & rarity', 'https://psnprofiles.com/trophies/43531-grand-theft-auto-vi'],
  powerpyx: ['PowerPyx — trophy guide & roadmap', 'https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/'],
  gtabase: ['GTABase — trophy list (via GTA Zone)', 'https://gta-zone.com/news/gta-6-trophies-achievements/'],
};

const KIND_LABELS = {
  story: 'Story',
  side: 'Side',
  collection: 'Collection',
  stunt: 'Stunt',
  misc: 'Misc',
};

const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];

// The roadmap, in PowerPyx's shape: three phases, about 200 hours at 4/10.
// Every trophy appears exactly once; a step's trophies are the ones its work
// unlocks. (A console warning fires if the list and the roadmap disagree.)
const ROADMAP = [
  {
    title: 'Phase 1 — Play the story',
    time: '60–80 hours',
    blurb: 'Finish all five chapters. Take the optional missions as they appear, meditate at the Chapter 1 home spot before that chapter ends, and scan vehicles and study animals as you go — the counts carry into Phase 2.',
    steps: [
      { title: 'Finish the five chapters', trophies: ['just-like-paradise', 'paradise-lost', 'tits-ass-drug-money', 'vice-city-baby', 'top-of-the-world-ma', 'trust', 'break-the-bank', 'family-matters', 'dwnfall', 'hi-jacked', 'snow-storm', 'you-gotta-know-when-to-get-off'] },
      { title: 'Meditate at home in Chapter 1 — the one missable', trophies: ['positive-mental-attitude'] },
      { title: 'Take the optional missions and character jobs as they appear', trophies: ['road-to-rehabilitation', 'this-was-no-boat-accident', 'the-lone-rider', 'supply-and-demand', 'spin-on-this', 'fair-game', 'baited-my-tackle', 'stick-fiddler'] },
      { title: 'Scan vehicles as you drive', trophies: ['whip-it-good'] },
    ],
  },
  {
    title: 'Phase 2 — 100% Completion',
    time: 'About 100 hours',
    blurb: 'After the credits, open Progress > Stats > 100% Completion. The checklist is closer to 60% true completion: most thresholds are partial, and only robberies, underwater discoveries, shooting ranges, drone races and Bret’s quests need everything.',
    steps: [
      { title: 'Open the checklist and work it', trophies: ['a-long-road'] },
      { title: 'Stunts, shooting ranges and drone races', trophies: ['cunning-stunts', 'the-shootist', 'top-fun'] },
      { title: 'Races, challenges and activities', trophies: ['earn-cash-not-kudos', 'one-last-thing', 'master-of-none'] },
      { title: 'Vaults, robberies and gangs', trophies: ['maximum-withdrawal', 'a-classic-blitz-play', 'pest-control'] },
      { title: 'Cards, photos and exploring', trophies: ['dont-touch-my-deck', 'you-wainker', 'the-goodtime-state'] },
      { title: 'Money and property', trophies: ['dime-on-the-dollar', 'treat-yo-self', 'little-boxes', 'on-the-spot'] },
    ],
  },
  {
    title: 'Phase 3 — Strangers & cleanup',
    time: 'About 10 hours',
    blurb: 'Most trophies are already earned by now. Finish the stranger strands and the character quests, then sweep up the partner, combat and oddball trophies — and the platinum lands with the last of them.',
    steps: [
      { title: 'Eight Strangers & Freaks strands', trophies: ['strangers-and-freaks'] },
      { title: 'Partner trophies', trophies: ['hot-together', 'retail-therapy'] },
      { title: 'Combat and stunts', trophies: ['gunslinger', 'sneakthief', 'catch-me-if-you-can', 'challenging-tank'] },
      { title: 'The odd ones', trophies: ['in-the-beginning', 'capital-offense', 'lets-go-bowling', 'personal-best', 'actions-speak-louder', 'bad-luck-i-guess', 'the-truth-is-out-there', 'ten-pin'] },
      { title: 'The platinum', trophies: ['vice-got-a-price'] },
    ],
  },
];

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));
const byName = new Map(trophies.map((t) => [t.name, t]));

// Roadmap coverage check: every trophy exactly once.
{
  const seen = new Map();
  for (const phase of ROADMAP) for (const step of phase.steps) for (const id of step.trophies) seen.set(id, (seen.get(id) ?? 0) + 1);
  const missing = trophies.filter((t) => !seen.has(t.id)).map((t) => t.id);
  const doubled = [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id);
  const unknown = [...seen.keys()].filter((id) => !byId.has(id));
  if (missing.length || doubled.length || unknown.length) {
    console.warn('roadmap coverage:', { missing, doubled, unknown });
  }
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

let earned = new Set(loadJSON(EARNED_KEY, []).filter((n) => byName.has(n)));
let notes = loadJSON(NOTES_KEY, {});
let spoilerOn = loadJSON(SPOILER_KEY, true);
let selectedId = null;

const params = new URLSearchParams(location.search);
if (params.get('spoilers') === 'show') spoilerOn = false;
if (params.get('spoilers') === 'hide') spoilerOn = true;

const $ = (id) => document.getElementById(id);
const listEl = $('list');
const detailEl = $('detail');

function save() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...earned]));
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  localStorage.setItem(SPOILER_KEY, JSON.stringify(spoilerOn));
}

function isHidden(t) {
  return spoilerOn && t.hidden && !earned.has(t.name);
}

function medal(t) {
  const span = document.createElement('span');
  span.className = `medal medal-${t.grade}`;
  span.textContent = t.grade === 'platinum' ? 'P' : t.grade[0].toUpperCase();
  span.title = t.grade;
  return span;
}

function renderHeader() {
  $('earnedCount').textContent = earned.size;
  $('progressBar').style.width = `${(earned.size / trophies.length) * 100}%`;
  $('gradeStats').textContent = GRADE_ORDER.map((g) => {
    const total = trophies.filter((t) => t.grade === g).length;
    const got = trophies.filter((t) => t.grade === g && earned.has(t.name)).length;
    return `${g} ${got}/${total}`;
  }).join(' · ');
}

function filteredTrophies() {
  const q = $('search').value.trim().toLowerCase();
  const grade = $('gradeFilter').value;
  const kind = $('kindFilter').value;
  const show = $('earnedFilter').value;
  return trophies.filter((t) => {
    if (grade !== 'all' && t.grade !== grade) return false;
    if (kind !== 'all' && t.kind !== kind) return false;
    if (show === 'earned' && !earned.has(t.name)) return false;
    if (show === 'remaining' && earned.has(t.name)) return false;
    if (q) {
      const hay = `${t.name} ${t.description} ${t.guide} ${t.kind}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderNextUp() {
  const box = $('nextUp');
  const order = ROADMAP.flatMap((p) => p.steps.flatMap((s) => s.trophies));
  const next = order.map((id) => byId.get(id)).filter((t) => t && !earned.has(t.name)).slice(0, 3);
  box.replaceChildren();
  if (earned.size >= trophies.length) {
    box.textContent = 'Platinum earned — every trophy is ticked. Congratulations, Leonida Legend.';
    return;
  }
  const title = document.createElement('strong');
  title.textContent = 'Next up: ';
  box.append(title);
  next.forEach((t, i) => {
    if (i) box.append(document.createTextNode(' · '));
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'next-link';
    b.textContent = isHidden(t) ? 'Hidden trophy' : t.name;
    b.addEventListener('click', () => selectTrophy(t.id, true));
    box.append(b);
  });
  const hint = document.createElement('span');
  hint.className = 'next-hint';
  hint.textContent = ' — in roadmap order, skipping what you have already earned.';
  box.append(hint);
}

function renderList() {
  const rows = filteredTrophies();
  $('resultCount').textContent = `${rows.length} of ${trophies.length} trophies shown`;
  listEl.replaceChildren();
  for (const t of rows) {
    const hidden = isHidden(t);
    const li = document.createElement('li');
    li.className = 'trophy-row' + (earned.has(t.name) ? ' earned' : '') + (selectedId === t.id ? ' selected' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', `Earned: ${hidden ? 'Hidden trophy' : t.name}`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name);
      else earned.delete(t.name);
      save();
      renderAll();
    });
    const body = document.createElement('button');
    body.type = 'button';
    body.className = 'row-body';
    body.addEventListener('click', () => selectTrophy(t.id, false));
    body.append(medal(t));
    const text = document.createElement('span');
    text.className = 'row-text';
    const name = document.createElement('span');
    name.className = 'row-name';
    name.textContent = hidden ? 'Hidden trophy' : t.name;
    const desc = document.createElement('span');
    desc.className = 'row-desc';
    desc.textContent = hidden ? 'Unlock this trophy to reveal its name and description.' : t.description;
    text.append(name, desc);
    body.append(text);
    const tags = document.createElement('span');
    tags.className = 'row-tags';
    if (!hidden) {
      const kind = document.createElement('span');
      kind.className = 'tag';
      kind.textContent = KIND_LABELS[t.kind];
      tags.append(kind);
    }
    if (t.missable) {
      const m = document.createElement('span');
      m.className = 'tag tag-missable';
      m.textContent = 'Missable';
      tags.append(m);
    }
    if (t.target) {
      const tg = document.createElement('span');
      tg.className = 'tag';
      tg.textContent = `0/${t.target.toLocaleString('en-US')}`;
      tags.append(tg);
    }
    body.append(tags);
    li.append(box, body);
    listEl.append(li);
  }
  if (!rows.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = 'No trophies match these filters.';
    listEl.append(li);
  }
}

function renderDetail() {
  detailEl.replaceChildren();
  const t = selectedId ? byId.get(selectedId) : null;
  if (!t) {
    const p = document.createElement('p');
    p.className = 'detail-empty';
    p.textContent = 'Select a trophy to read its guide.';
    detailEl.append(p);
    return;
  }
  const hidden = isHidden(t);
  const h = document.createElement('h2');
  h.textContent = hidden ? 'Hidden trophy' : t.name;
  detailEl.append(h);
  const meta = document.createElement('p');
  meta.className = 'detail-meta';
  meta.textContent = hidden
    ? 'A hidden trophy. Earn it in the game to reveal its name, description and guide here.'
    : `${t.grade} · ${KIND_LABELS[t.kind]}${t.target ? ` · PSN target 0/${t.target.toLocaleString('en-US')}` : ''}`;
  detailEl.append(meta);
  if (!hidden) {
    const off = document.createElement('p');
    off.className = 'detail-official';
    off.textContent = t.description;
    detailEl.append(off);
    const guide = document.createElement('p');
    guide.className = 'detail-guide';
    guide.textContent = t.guide;
    detailEl.append(guide);
    if (t.missable) {
      const warn = document.createElement('p');
      warn.className = 'missable-note';
      warn.textContent = `Missable: ${t.missableNote ?? 'This trophy can be missed.'}`;
      detailEl.append(warn);
    }
    const srcTitle = document.createElement('p');
    srcTitle.className = 'detail-sources-title';
    srcTitle.textContent = 'Sources';
    detailEl.append(srcTitle);
    const src = document.createElement('ul');
    src.className = 'detail-sources';
    for (const key of t.sources) {
      const [label, url] = SOURCES[key] ?? [key, null];
      const li = document.createElement('li');
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.textContent = label;
        li.append(a);
      } else {
        li.textContent = label;
      }
      src.append(li);
    }
    detailEl.append(src);
    const noteLabel = document.createElement('label');
    noteLabel.className = 'note-label';
    noteLabel.textContent = 'Your note';
    const note = document.createElement('textarea');
    note.rows = 3;
    note.placeholder = 'Your own note for this trophy — saved in this browser.';
    note.value = notes[t.id] ?? '';
    note.addEventListener('input', () => {
      if (note.value.trim()) notes[t.id] = note.value;
      else delete notes[t.id];
      save();
    });
    noteLabel.append(note);
    detailEl.append(noteLabel);
  }
}

function renderRoadmap() {
  const host = $('roadmap');
  host.replaceChildren();
  for (const phase of ROADMAP) {
    const section = document.createElement('section');
    section.className = 'phase';
    const head = document.createElement('div');
    head.className = 'phase-head';
    const h = document.createElement('h2');
    h.textContent = phase.title;
    const time = document.createElement('span');
    time.className = 'phase-time';
    time.textContent = phase.time;
    head.append(h, time);
    section.append(head);
    const blurb = document.createElement('p');
    blurb.className = 'phase-blurb';
    blurb.textContent = phase.blurb;
    section.append(blurb);
    const ids = phase.steps.flatMap((s) => s.trophies);
    const got = ids.filter((id) => earned.has(byId.get(id).name)).length;
    const prog = document.createElement('p');
    prog.className = 'phase-progress';
    prog.textContent = `${got} of ${ids.length} trophies in this phase`;
    section.append(prog);
    for (const step of phase.steps) {
      const stepEl = document.createElement('div');
      stepEl.className = 'step';
      const st = document.createElement('h3');
      st.textContent = step.title;
      stepEl.append(st);
      const chips = document.createElement('ul');
      chips.className = 'chips';
      for (const id of step.trophies) {
        const t = byId.get(id);
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip' + (earned.has(t.name) ? ' chip-earned' : '');
        b.append(medal(t));
        const label = document.createElement('span');
        label.textContent = isHidden(t) ? 'Hidden trophy' : t.name;
        b.append(label);
        b.addEventListener('click', () => {
          showView('checklist');
          selectTrophy(id, true);
        });
        li.append(b);
        chips.append(li);
      }
      stepEl.append(chips);
      section.append(stepEl);
    }
    host.append(section);
  }
}

function renderMissables() {
  const host = $('missables');
  host.replaceChildren();
  const pma = byId.get('positive-mental-attitude');
  const card = document.createElement('article');
  card.className = 'missable-card';
  const h = document.createElement('h2');
  h.textContent = 'Positive Mental Attitude — the only possibly missable trophy';
  card.append(h);
  const meta = document.createElement('p');
  meta.className = 'detail-meta';
  meta.textContent = 'Bronze · Side · PSN target 0/18';
  card.append(meta);
  const guide = document.createElement('p');
  guide.textContent = pma.guide;
  card.append(guide);
  const warn = document.createElement('p');
  warn.className = 'missable-note';
  warn.textContent = `Missable: ${pma.missableNote}`;
  card.append(warn);
  host.append(card);

  const safe = document.createElement('article');
  safe.className = 'safe-card';
  const sh = document.createElement('h2');
  sh.textContent = 'Everything else is safe';
  safe.append(sh);
  const sp = document.createElement('p');
  sp.textContent = 'Story trophies unlock as the chapters end and cannot be missed. There is no mission replay, but there is free roam after the story, and nothing on the 100% Completion checklist can be missed — so the cleanup phases can all wait until after the credits.';
  safe.append(sp);
  host.append(safe);

  const unc = document.createElement('article');
  unc.className = 'unconfirmed-card';
  const uh = document.createElement('h2');
  uh.textContent = 'Not yet confirmed — guides will be updated';
  unc.append(uh);
  const up = document.createElement('p');
  up.textContent = 'Six trophies have a detail no public guide has pinned down yet. Their guides say so instead of guessing:';
  unc.append(up);
  const ul = document.createElement('ul');
  for (const id of ['in-the-beginning', 'capital-offense', 'bad-luck-i-guess', 'the-truth-is-out-there', 'ten-pin', 'fair-game']) {
    const t = byId.get(id);
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'next-link';
    b.textContent = t.name;
    b.addEventListener('click', () => {
      showView('checklist');
      selectTrophy(id, true);
    });
    li.append(b, document.createTextNode(` — ${t.description}`));
    ul.append(li);
  }
  unc.append(ul);
  host.append(unc);
}

function selectTrophy(id, scroll) {
  selectedId = id;
  renderList();
  renderDetail();
  if (scroll) detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showView(name) {
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
  if (name === 'roadmap') renderRoadmap();
  if (name === 'missables') renderMissables();
}

function renderAll() {
  renderHeader();
  renderNextUp();
  renderList();
  renderDetail();
}

document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));

$('search').addEventListener('input', renderList);
$('gradeFilter').addEventListener('change', renderList);
$('kindFilter').addEventListener('change', renderList);
$('earnedFilter').addEventListener('change', renderList);

const spoilerBtn = $('spoilerToggle');
function renderSpoilerBtn() {
  spoilerBtn.textContent = spoilerOn ? 'Spoilers: hidden' : 'Spoilers: shown';
  spoilerBtn.setAttribute('aria-pressed', String(spoilerOn));
}
spoilerBtn.addEventListener('click', () => {
  spoilerOn = !spoilerOn;
  save();
  renderSpoilerBtn();
  renderAll();
  if (document.getElementById('view-roadmap').classList.contains('active')) renderRoadmap();
});

$('exportBtn').addEventListener('click', () => {
  const payload = {
    app: 'leonida-trophy-guide',
    version: 1,
    exportedAt: new Date().toISOString(),
    earned: [...earned],
    notes,
    spoilerOn,
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data.earned) ? data.earned : Array.isArray(data) ? data : null;
    if (!names) throw new Error('no earned list');
    earned = new Set(names.filter((n) => byName.has(n)));
    if (data.notes && typeof data.notes === 'object') {
      notes = Object.fromEntries(Object.entries(data.notes).filter(([id]) => byId.has(id)));
    }
    if (typeof data.spoilerOn === 'boolean') spoilerOn = data.spoilerOn;
    save();
    renderSpoilerBtn();
    renderAll();
  } catch {
    alert('That file is not a trophy progress export from this guide.');
  }
  e.target.value = '';
});

$('resetBtn').addEventListener('click', () => {
  if (!confirm('Clear all earned trophies and notes?')) return;
  earned = new Set();
  notes = {};
  save();
  renderAll();
});

// Deep links for screenshots and sharing: ?view=roadmap, ?grade=silver,
// ?kind=story, ?q=bank, ?selected=<trophy id>, ?spoilers=show|hide.
if (params.get('view') && ['checklist', 'roadmap', 'missables', 'sources'].includes(params.get('view'))) {
  showView(params.get('view'));
}
if (params.get('grade')) $('gradeFilter').value = params.get('grade');
if (params.get('kind')) $('kindFilter').value = params.get('kind');
if (params.get('q')) $('search').value = params.get('q');
if (params.get('selected') && byId.has(params.get('selected'))) selectedId = params.get('selected');
if (!selectedId) {
  const first = filteredTrophies().find((t) => !earned.has(t.name)) ?? trophies[0];
  selectedId = first.id;
}

renderSpoilerBtn();
renderAll();
if (document.getElementById('view-roadmap').classList.contains('active')) renderRoadmap();
if (document.getElementById('view-missables').classList.contains('active')) renderMissables();
window.__ready = true;
