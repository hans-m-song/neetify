const md = window.markdownit({ html: false, linkify: true, breaks: false });

const treeEl = document.getElementById('tree');
const crumbsEl = document.getElementById('crumbs');
const contentEl = document.getElementById('content');
const liveEl = document.getElementById('live');
const toggleEl = document.getElementById('theme-toggle');
const searchEl = document.getElementById('search');

let treeData = [];
let current = { path: null, type: null };
const expanded = new Set();

const ICONS = { '.md': '📄', '.txt': '📑', '.pdf': '📕', '.yaml': '🗂️', '.yml': '🗂️' };
const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ---- URL <-> path ----
// the address bar mirrors the open file/folder: /orgs/nearmap/notes.md
const toHref = (p) => (p ? '/' + p.split('/').map(encodeURIComponent).join('/') : '/');
const pathFromUrl = () => decodeURIComponent(location.pathname).replace(/^\/+/, '').replace(/\/+$/, '');

function syncUrl(path, push) {
  const href = toHref(path);
  if (href === location.pathname) return;
  const state = { path };
  if (push) history.pushState(state, '', href);
  else history.replaceState(state, '', href);
}

// let the browser handle modifier/middle clicks so "open in new tab" keeps working
function navHandler(fn) {
  return (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button && e.button !== 0)) return;
    e.preventDefault();
    fn();
  };
}

function splitFrontmatter(text) {
  if (!text.startsWith('---')) return { fm: null, body: text };
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  return m ? { fm: m[1], body: text.slice(m[0].length) } : { fm: null, body: text };
}

function unquote(s) {
  const t = s.trim();
  if (t.length >= 2 && ((t[0] === '"' && t.endsWith('"')) || (t[0] === "'" && t.endsWith("'")))) {
    return t.slice(1, -1);
  }
  return s;
}

function renderFrontmatter(fm) {
  const rows = [];
  for (const line of fm.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const m = !/^\s/.test(line) && line.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (m) rows.push([m[1], unquote(m[2])]);
    else if (rows.length) rows[rows.length - 1][1] += `\n${line.trim()}`;
    else rows.push(['', line.trim()]);
  }
  const body = rows.map(([k, v]) => {
    const key = escapeHtml(k);
    const value = escapeHtml(v);
    const asHref = value.startsWith('https://') ? `<a rel="noreferrer" target="_blank" href="${value}">${value}</a>` : value;
    return `<tr><th>${key}</th><td>${asHref}</td></tr>`;
  }).join('');
  return `<details class="frontmatter" open><summary>frontmatter</summary><table>${body}</table></details>`;
}
const escapeAttr = (s) => escapeHtml(String(s)).replace(/"/g, '&quot;');
const sel = (s) => `[data-path="${CSS.escape(s)}"]`;
const filtering = () => searchEl.value.trim().length > 0;

// ---- jobs.yaml table ----
// grid holds short, scannable values only — long-form fields (flags, culture_note, summary) live in
// the per-row detail line so the table never scrolls horizontally
const JOB_COLS = [
  { key: 'company', label: 'Company' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'status_date', label: 'Status date', date: true },
  { key: 'tier', label: 'Tier' },
  { key: 'location', label: 'Location' },
  { key: 'work_mode', label: 'Mode' },
  { key: 'comp', label: 'Comp' },
  { key: 'culture_rating', label: 'Culture', num: true },
];
let jobsState = null;

// compact form for the grid cell; the prose culture_note goes to the detail line instead
function cultureText(j) {
  if (j.culture_rating == null) return '';
  let s = `${j.culture_rating}★`;
  if (j.culture_recommend != null) s += ` ${j.culture_recommend}%`;
  if (j.culture_n != null) s += ` (${j.culture_n})`;
  return s;
}

const jobKey = (j) => `${j.company || ''}|${j.role || ''}`;

function statusDateText(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value == null ? '' : String(value);
}

function statusDateValue(value) {
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

// stacked detail lines: flags, then culture note, then the summary that used to be a hover tooltip
function detailHtml(j) {
  const out = [];
  const flags = (j.flags || []).map((f) => `<span class="flag">${escapeHtml(f)}</span>`).join(' ');
  if (flags) out.push(`<div class="d-flags">${flags}</div>`);
  if (j.culture_note) out.push(`<div class="d-culture">${escapeHtml(j.culture_note)}</div>`);
  if (j.summary) out.push(`<div class="d-summary">${escapeHtml(j.summary)}</div>`);
  return out.join('');
}

// the tree is the source of truth for existence — a stale jd_path/letter in jobs.yaml renders as
// plain text rather than a dead link
const hasFile = (p) => Boolean(p) && findNode(p)?.type === 'file';

// jobs.yaml has no notes field; notes live beside the JD as orgs/<company>/notes.md
function notesPathFor(j) {
  const src = j.jd_path || j.letter;
  if (!src || !src.includes('/')) return null;
  return `${src.slice(0, src.lastIndexOf('/'))}/notes.md`;
}

// short source chip for a listing URL: LinkedIn -> LI, Seek -> SEEK, ATS boards -> their code,
// anything else (an employer's own careers page) -> SITE. Full host goes in the tooltip.
const LISTING_SOURCES = [
  [/(^|\.)linkedin\.com$/, 'LI'],
  [/(^|\.)seek\.com(\.au)?$/, 'SEEK'],
  [/(^|\.)greenhouse\.io$/, 'GH'],
  [/(^|\.)lever\.co$/, 'LEVER'],
  [/(^|\.)smartrecruiters\.com$/, 'SR'],
  [/(^|\.)myworkdayjobs\.com$/, 'WD'],
  [/(^|\.)workable\.com$/, 'WK'],
  [/(^|\.)bamboohr\.com$/, 'BHR'],
];

function listingChip(url) {
  let host;
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
  const label = LISTING_SOURCES.find(([re]) => re.test(host))?.[1] || 'SITE';
  return `<a class="src-chip" href="${escapeAttr(url)}" target="_blank" rel="noopener" title="${escapeAttr(host)}">${escapeHtml(label)}</a>`;
}

// internal link that opens in-app (delegated via .jd-link) but still has a real href
function fileLink(path, text, cls = '') {
  return `<a class="jd-link${cls ? ' ' + cls : ''}" href="${escapeAttr(toHref(path))}" data-path="${escapeAttr(path)}">${escapeHtml(text)}</a>`;
}

function jobSearchBlob(j) {
  return [j.company, j.role, j.status, statusDateText(j.status_date), j.tier, j.location, j.work_mode, j.comp, j.summary, j.culture_note, (j.flags || []).join(' ')]
    .filter(Boolean).join(' ').toLowerCase();
}

function renderJobsTable(text) {
  let data;
  try { data = window.jsyaml.load(text); } catch { return false; }
  if (!data || !Array.isArray(data.jobs)) return false;
  // carry view state across re-renders so an SSE live-reload doesn't collapse open rows or reset sort
  const prev = jobsState;
  jobsState = {
    all: data.jobs,
    sortKey: prev?.sortKey ?? 'company',
    sortDir: prev?.sortDir ?? 1,
    query: prev?.query ?? '',
    groupBy: prev?.groupBy ?? 'status',
    collapsed: prev?.collapsed ?? new Set(),
    expanded: prev?.expanded ?? new Set(),
  };
  contentEl.className = 'content jobs';
  contentEl.innerHTML =
    '<div class="jobs-toolbar">'
    + '<input id="jobs-search" class="search" type="search" placeholder="Search roles, status, flags…" autocomplete="off" />'
    + '<label class="jobs-group-lbl">Group by '
    + '<select id="jobs-group"><option value="">none</option><option value="status">status</option>'
    + '<option value="tier">tier</option><option value="location">location</option>'
    + '<option value="work_mode">mode</option></select></label>'
    + '<span id="jobs-count" class="jobs-count"></span></div>'
    + '<div class="jobs-table-wrap"><table class="jobs-table"><thead><tr>'
    + JOB_COLS.map((c) => `<th data-key="${c.key}">${c.label}</th>`).join('')
    + '</tr></thead><tbody></tbody></table></div>';
  const searchInput = contentEl.querySelector('#jobs-search');
  searchInput.value = jobsState.query;
  searchInput.addEventListener('input', () => { jobsState.query = searchInput.value.trim().toLowerCase(); paintJobs(); });
  const groupSel = contentEl.querySelector('#jobs-group');
  groupSel.value = jobsState.groupBy;
  groupSel.addEventListener('change', () => { jobsState.groupBy = groupSel.value; jobsState.collapsed.clear(); paintJobs(); });
  contentEl.querySelectorAll('thead th[data-key]').forEach((th) => {
    th.addEventListener('click', () => {
      const k = th.dataset.key;
      if (jobsState.sortKey === k) jobsState.sortDir *= -1;
      else { jobsState.sortKey = k; jobsState.sortDir = 1; }
      paintJobs();
    });
  });
  paintJobs();
  return true;
}

const TIER_ORDER = ['A', 'B', 'C', 'D', 'out', 'older'];
const STATUS_ORDER = ['applied', 'ready', 'drafted', 'open', 'held', 'inbound', 'unassessed', 'rejected', 'closed', 'skip', 'stale', 'out'];
const NCOLS = JOB_COLS.length;

function jobRowHtml(j) {
  const notes = notesPathFor(j);
  const company = j.company || '';
  const role = j.role || '';
  const status = j.status || '';

  const companyCell = hasFile(notes) ? fileLink(notes, company, 'notes-link') : escapeHtml(company);

  let roleCell = hasFile(j.jd_path) ? fileLink(j.jd_path, role, 'jd-role') : escapeHtml(role);
  if (j.listing_url) roleCell += ` ${listingChip(j.listing_url)}`;

  let statusCell = `<span class="badge st-${escapeAttr(status)}">${escapeHtml(status)}</span>`;
  if (hasFile(j.letter)) statusCell += ` ${fileLink(j.letter, 'CL', 'cl-link')}`;

  const detail = detailHtml(j);
  const key = jobKey(j);
  const open = jobsState.expanded.has(key);
  const caret = detail ? `<span class="row-caret">${open ? '▾' : '▸'}</span>` : '<span class="row-caret empty"></span>';

  const cells = [
    caret + companyCell,
    roleCell,
    statusCell,
    escapeHtml(statusDateText(j.status_date)),
    escapeHtml(j.tier || ''),
    escapeHtml(j.location || ''),
    escapeHtml(j.work_mode || ''),
    escapeHtml(j.comp || ''),
    escapeHtml(cultureText(j)),
  ];

  let html = `<tr class="jobs-row${detail ? ' has-detail' : ''}${open ? ' open' : ''}" data-key="${escapeAttr(key)}">`
    + cells.map((c) => `<td>${c}</td>`).join('') + '</tr>';
  if (detail && open) {
    html += `<tr class="detail-row" data-key="${escapeAttr(key)}"><td colspan="${NCOLS}">${detail}</td></tr>`;
  }
  return html;
}

function groupKeyOf(j) {
  const v = j[jobsState.groupBy];
  return v == null || v === '' ? '(none)' : String(v);
}

function orderedGroupKeys(keys) {
  const order = jobsState.groupBy === 'tier' ? TIER_ORDER : jobsState.groupBy === 'status' ? STATUS_ORDER : null;
  const rank = (k) => {
    if (k === '(none)') return Infinity;
    if (!order) return 0;
    const i = order.indexOf(k);
    return i === -1 ? order.length : i;
  };
  return keys.sort((a, b) => (rank(a) - rank(b)) || a.localeCompare(b));
}

function paintJobs() {
  if (!jobsState) return;
  const { all, sortKey, sortDir, query, groupBy } = jobsState;
  let rows = query ? all.filter((j) => jobSearchBlob(j).includes(query)) : all.slice();
  if (sortKey) {
    const col = JOB_COLS.find((c) => c.key === sortKey);
    rows.sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (col?.date) {
        va = statusDateValue(va);
        vb = statusDateValue(vb);
        if (va == null) return vb == null ? 0 : 1;
        if (vb == null) return -1;
        return (va - vb) * sortDir;
      }
      if (col && col.num) {
        va = va == null ? -Infinity : va;
        vb = vb == null ? -Infinity : vb;
        return (va - vb) * sortDir;
      }
      va = (va == null ? '' : String(Array.isArray(va) ? va.join(',') : va)).toLowerCase();
      vb = (vb == null ? '' : String(Array.isArray(vb) ? vb.join(',') : vb)).toLowerCase();
      return va < vb ? -sortDir : va > vb ? sortDir : 0;
    });
  }
  contentEl.querySelectorAll('thead th[data-key]').forEach((th) => {
    const on = th.dataset.key === sortKey;
    th.classList.toggle('sorted', on);
    th.dataset.arrow = on ? (sortDir > 0 ? ' ▲' : ' ▼') : '';
  });
  const tbody = contentEl.querySelector('tbody');
  if (!groupBy) {
    tbody.innerHTML = rows.map(jobRowHtml).join('');
  } else {
    const groups = new Map();
    for (const j of rows) {
      const k = groupKeyOf(j);
      (groups.get(k) || groups.set(k, []).get(k)).push(j);
    }
    tbody.innerHTML = orderedGroupKeys([...groups.keys()]).map((k) => {
      const list = groups.get(k);
      const collapsed = jobsState.collapsed.has(k);
      const head = `<tr class="group-row${collapsed ? ' collapsed' : ''}" data-group="${escapeAttr(k)}">`
        + `<td colspan="${NCOLS}"><span class="group-caret">${collapsed ? '▸' : '▾'}</span> `
        + `<span class="group-label">${escapeHtml(k)}</span> <span class="group-count">${list.length}</span></td></tr>`;
      return head + (collapsed ? '' : list.map(jobRowHtml).join(''));
    }).join('');
    tbody.querySelectorAll('.group-row').forEach((tr) => tr.addEventListener('click', () => {
      const k = tr.dataset.group;
      if (jobsState.collapsed.has(k)) jobsState.collapsed.delete(k);
      else jobsState.collapsed.add(k);
      paintJobs();
    }));
  }
  // click a row to reveal its detail line; links inside the row keep their own behaviour
  tbody.querySelectorAll('.jobs-row.has-detail').forEach((tr) => tr.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    const k = tr.dataset.key;
    if (jobsState.expanded.has(k)) jobsState.expanded.delete(k);
    else jobsState.expanded.add(k);
    paintJobs();
  }));
  tbody.querySelectorAll('.jd-link').forEach((a) => a.addEventListener('click', navHandler(() => openFile(a.dataset.path))));
  contentEl.querySelector('#jobs-count').textContent = `${rows.length} / ${all.length}`;
}

// ---- theme ----
function syncToggle() {
  toggleEl.textContent = document.documentElement.dataset.theme === 'dark' ? '☀️' : '🌙';
}
toggleEl.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
  syncToggle();
});
syncToggle();

// ---- tree ----
function findNode(path, nodes = treeData) {
  for (const n of nodes) {
    if (n.path === path) return n;
    if (n.type === 'dir') { const f = findNode(path, n.children); if (f) return f; }
  }
  return null;
}

// remember which folders the user opened (ignore programmatic opens while filtering)
treeEl.addEventListener('toggle', (e) => {
  if (e.target.tagName !== 'DETAILS' || filtering()) return;
  if (e.target.open) expanded.add(e.target.dataset.path);
  else expanded.delete(e.target.dataset.path);
}, true);

function renderTree(nodes, forceOpen) {
  const ul = document.createElement('ul');
  for (const node of nodes) {
    const li = document.createElement('li');
    if (node.type === 'dir') {
      const details = document.createElement('details');
      details.dataset.path = node.path;
      if (forceOpen || expanded.has(node.path)) details.open = true;
      const summary = document.createElement('summary');
      summary.textContent = `📁 ${node.name}`;
      details.append(summary, renderTree(node.children, forceOpen));
      li.append(details);
    } else {
      const a = document.createElement('a');
      a.className = 'file';
      a.dataset.path = node.path;
      a.href = toHref(node.path);
      a.textContent = `${ICONS[node.ext] || '•'} ${node.name}`;
      a.addEventListener('click', navHandler(() => openFile(node.path)));
      li.append(a);
    }
    ul.append(li);
  }
  return ul;
}

function filterNodes(nodes, q) {
  const out = [];
  for (const n of nodes) {
    if (n.type === 'dir') {
      if (n.name.toLowerCase().includes(q)) out.push(n);
      else {
        const kids = filterNodes(n.children, q);
        if (kids.length) out.push({ ...n, children: kids });
      }
    } else if (n.name.toLowerCase().includes(q)) {
      out.push(n);
    }
  }
  return out;
}

function renderSidebar() {
  const q = searchEl.value.trim().toLowerCase();
  const nodes = q ? filterNodes(treeData, q) : treeData;
  treeEl.replaceChildren(renderTree(nodes, Boolean(q)));
  setSelection();
}
searchEl.addEventListener('input', renderSidebar);

async function loadTree() {
  treeData = await fetch('/api/tree').then((r) => r.json());
  renderSidebar();
  if (current.type === 'file' && !filtering()) revealPath(current.path);
}

function setSelection() {
  treeEl.querySelectorAll('.selected').forEach((el) => el.classList.remove('selected'));
  if (!current.path) return;
  const node = current.type === 'file'
    ? treeEl.querySelector(`.file${sel(current.path)}`)
    : treeEl.querySelector(`details${sel(current.path)} > summary`);
  if (node) node.classList.add('selected');
}

// expand every ancestor folder of `path` (and the folder itself if it is one), then keep it in view
function revealPath(path) {
  if (!path) return;
  const parts = path.split('/');
  let prefix = '';
  for (const part of parts) {
    prefix = prefix ? `${prefix}/${part}` : part;
    const d = treeEl.querySelector(`details${sel(prefix)}`);
    if (d) d.open = true;
  }
  const node = treeEl.querySelector(`.file${sel(path)}`) || treeEl.querySelector(`details${sel(path)} > summary`);
  if (node) node.scrollIntoView({ block: 'nearest' });
}

// ---- breadcrumbs ----
function crumbSep() { const s = document.createElement('span'); s.className = 'sep'; s.textContent = '›'; return s; }

function renderCrumbs(path) {
  crumbsEl.replaceChildren();
  if (!path) {
    const s = document.createElement('span'); s.className = 'current'; s.textContent = 'jobs';
    crumbsEl.append(s);
    return;
  }
  const root = document.createElement('a'); root.textContent = 'jobs';
  root.href = toHref('jobs.yaml');
  root.addEventListener('click', navHandler(() => openFile('jobs.yaml')));
  crumbsEl.append(root);
  const parts = path.split('/');
  let prefix = '';
  parts.forEach((part, i) => {
    crumbsEl.append(crumbSep());
    prefix = prefix ? `${prefix}/${part}` : part;
    if (i === parts.length - 1) {
      const s = document.createElement('span'); s.className = 'current'; s.textContent = part;
      crumbsEl.append(s);
    } else {
      const dp = prefix;
      const a = document.createElement('a'); a.textContent = part;
      a.href = toHref(dp);
      a.addEventListener('click', navHandler(() => openDir(dp)));
      crumbsEl.append(a);
    }
  });
}

// ---- folder index ----
function openDir(path, { push = true } = {}) {
  current = { path: path || '', type: 'dir' };
  syncUrl(path || '', push);
  const nodes = path ? (findNode(path)?.children || []) : treeData;
  renderCrumbs(path);
  document.title = path ? path.split('/').pop() : 'jobs';
  const items = nodes.map((n) => {
    const icon = n.type === 'dir' ? '📁' : (ICONS[n.ext] || '•');
    return `<li><a href="${escapeHtml(toHref(n.path))}" data-path="${escapeHtml(n.path)}" data-type="${n.type}">${icon} ${escapeHtml(n.name)}</a></li>`;
  }).join('');
  contentEl.className = 'content dir-index';
  contentEl.innerHTML = `<h1>📁 ${path ? escapeHtml(path) : 'jobs'}</h1><ul>${items || '<li class="empty">empty</li>'}</ul>`;
  contentEl.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', navHandler(() => (a.dataset.type === 'dir' ? openDir(a.dataset.path) : openFile(a.dataset.path))));
  });
  contentEl.scrollTop = 0;
  setSelection();
  revealPath(path);
}

// ---- file view ----
async function openFile(path, { flash = false, push = true } = {}) {
  current = { path, type: 'file' };
  syncUrl(path, push);
  setSelection();
  revealPath(path);
  renderCrumbs(path);
  document.title = path.split('/').pop();
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  const src = `/api/raw?path=${encodeURIComponent(path)}`;

  if (ext === '.pdf') {
    contentEl.className = 'content';
    contentEl.innerHTML =
      `<a class="pdf-open" href="${src}" target="_blank" rel="noopener">Open PDF in new tab ↗</a>` +
      `<iframe class="pdf" src="${src}"></iframe>`;
    return;
  }

  const text = await fetch(src).then((r) => r.text());
  if ((ext === '.yaml' || ext === '.yml') && renderJobsTable(text)) {
    // rendered as jobs table
  } else if (ext === '.md') {
    contentEl.className = 'content markdown';
    const { fm, body } = splitFrontmatter(text);
    contentEl.innerHTML = (fm !== null ? renderFrontmatter(fm) : '') + md.render(body);
  } else {
    contentEl.className = 'content';
    contentEl.innerHTML = `<div class="plaintext">${escapeHtml(text)}</div>`;
  }
  contentEl.scrollTop = 0;
  if (flash) { contentEl.classList.remove('flash'); void contentEl.offsetWidth; contentEl.classList.add('flash'); }
}

// ---- live updates (SSE) ----
function connectLive() {
  const es = new EventSource('/events');
  es.onopen = () => liveEl.classList.add('on');
  es.onerror = () => liveEl.classList.remove('on');
  es.onmessage = (e) => {
    const { paths } = JSON.parse(e.data);
    loadTree();
    if (current.type === 'file' && paths.includes(current.path)) openFile(current.path, { flash: true });
  };
}

// ---- routing ----
// resolve a URL path against the loaded tree; `/` falls through to the board
function route(path, opts = {}) {
  if (!path) return openFile('jobs.yaml', opts);
  const node = findNode(path);
  if (node?.type === 'dir') return openDir(path, opts);
  if (node?.type === 'file') return openFile(path, opts);
  current = { path, type: null };
  syncUrl(path, opts.push !== false);
  renderCrumbs(path);
  document.title = 'not found';
  contentEl.className = 'content';
  contentEl.innerHTML = `<div class="plaintext">not found: ${escapeHtml(path)}</div>`;
  setSelection();
}

window.addEventListener('popstate', () => route(pathFromUrl(), { push: false }));

loadTree().then(() => route(pathFromUrl(), { push: false }));
connectLive();
