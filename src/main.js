import './style.css';

const icon = (name) => ({
  grid: '<svg viewBox="0 0 24 24"><path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"/></svg>',
  tree: '<svg viewBox="0 0 24 24"><path d="M5 3v13h5v-2H7V9h3V7H7V3H5Zm7 2h9v6h-9V5Zm2 2v2h5V7h-5Zm-2 7h9v6h-9v-6Zm2 2v2h5v-2h-5Z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><path d="m20 18.6-4.4-4.4a7 7 0 1 0-1.4 1.4l4.4 4.4 1.4-1.4ZM5 10a5 5 0 1 1 10 0 5 5 0 0 1-10 0Z"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
  info: '<svg viewBox="0 0 24 24"><path d="M11 10h2v8h-2v-8Zm0-4h2v2h-2V6Zm1-4a10 10 0 1 1 0 20 10 10 0 0 1 0-20Z"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
})[name];

const tree = [
  { id: 'it', name: 'فناوری اطلاعات', type: 'Vertical', status: 'active', children: [
    { id: 'digital', name: 'کالای دیجیتال', type: 'Category', status: 'active', children: [
      { id: 'mobile', name: 'موبایل و تبلت', type: 'SubCategory', status: 'active', children: [
        { id: 'phone', name: 'گوشی موبایل', type: 'LeafCat', status: 'active' },
        { id: 'tablet', name: 'تبلت', type: 'LeafCat', status: 'active' },
      ]},
      { id: 'computer', name: 'لپ‌تاپ و کامپیوتر', type: 'SubCategory', status: 'active', children: [
        { id: 'laptop', name: 'لپ‌تاپ', type: 'LeafCat', status: 'active' },
      ]},
    ]},
    { id: 'network', name: 'تجهیزات شبکه', type: 'Category', status: 'active', children: [
      { id: 'router', name: 'مودم و روتر', type: 'LeafCat', status: 'active' },
    ]},
  ]},
  { id: 'home', name: 'خانه و آشپزخانه', type: 'Vertical', status: 'active', children: [
    { id: 'appliance', name: 'لوازم خانگی', type: 'Category', status: 'active' },
  ]},
];

const openDecisions = [
  ['عمق SubCategory', 'محدودیت UI برای تعداد سطوح هنوز تعیین نشده است.'],
  ['قواعد نام‌گذاری', 'حداکثر طول و کاراکترهای مجاز نام نود مشخص نیست.'],
  ['دسترسی شاخه‌ای', 'محدوده دسترسی اپراتورها به Verticalها باز است.'],
  ['Type 1 و Type 2', 'باید Attribute یا Variant بودن آن‌ها تعیین شود.'],
  ['تغییر LeafCat', 'اثر آن بر Audit، Search و SEO نیاز به تصمیم دارد.'],
];

const state = {
  selected: 'phone',
  expanded: new Set(['it', 'digital', 'mobile', 'computer']),
  modal: null,
  toast: '',
  search: '',
};

function findNode(id, nodes = tree, parents = []) {
  for (const node of nodes) {
    if (node.id === id) return { node, parents };
    if (node.children) {
      const found = findNode(id, node.children, [...parents, node]);
      if (found) return found;
    }
  }
}

function countNodes(nodes = tree) {
  return nodes.reduce((sum, node) => sum + 1 + countNodes(node.children || []), 0);
}

function countType(type, nodes = tree) {
  return nodes.reduce((sum, node) => sum + (node.type === type ? 1 : 0) + countType(type, node.children || []), 0);
}

function allowedChildren(type) {
  return { Vertical: ['Category'], Category: ['SubCategory', 'LeafCat'], SubCategory: ['SubCategory', 'LeafCat'], LeafCat: [] }[type];
}

function typeLabel(type) {
  return { Vertical: 'Vertical', Category: 'Category', SubCategory: 'SubCategory', LeafCat: 'LeafCat' }[type];
}

function renderTree(nodes, depth = 0) {
  const term = state.search.trim();
  return nodes.map(node => {
    const hasChildren = node.children?.length;
    const expanded = state.expanded.has(node.id) || term;
    const matches = !term || node.name.includes(term) || node.type.toLowerCase().includes(term.toLowerCase());
    const childHtml = hasChildren && expanded ? renderTree(node.children, depth + 1) : '';
    if (term && !matches && !childHtml) return '';
    return `<div class="branch">
      <button class="tree-row ${state.selected === node.id ? 'selected' : ''}" data-node="${node.id}" style="--depth:${depth}">
        <span class="toggle ${hasChildren ? '' : 'empty'}" data-toggle="${node.id}">${hasChildren ? icon('chevron') : ''}</span>
        <span class="type-dot ${node.type.toLowerCase()}"></span>
        <span class="node-name"><b>${node.name}</b><small>${typeLabel(node.type)}</small></span>
        <span class="node-status">فعال</span>
      </button>
      ${childHtml ? `<div>${childHtml}</div>` : ''}
    </div>`;
  }).join('');
}

function detailPanel() {
  const { node, parents } = findNode(state.selected);
  const path = [...parents, node];
  const allowed = allowedChildren(node.type);
  return `<section class="card detail-card">
    <div class="detail-head">
      <div><span class="type-pill ${node.type.toLowerCase()}">${node.type}</span><span class="active-pill"><i></i>فعال</span><h2>${node.name}</h2><p>شناسه: ${node.id}</p></div>
      <button class="icon-button">${icon('more')}</button>
    </div>
    <div class="path-box"><span>مسیر کامل</span><div>${path.map((item, index) => `<b class="${index === path.length - 1 ? 'current' : ''}">${item.name}</b>${index < path.length - 1 ? '<i>/</i>' : ''}`).join('')}</div></div>
    <div class="detail-grid">
      <div><span>نوع نود</span><b>${node.type}</b></div>
      <div><span>Parent</span><b>${parents.at(-1)?.name || 'ندارد'}</b></div>
      <div><span>وضعیت</span><b>فعال</b></div>
      <div><span>Child مجاز</span><b>${allowed.length ? allowed.join(' / ') : 'ندارد'}</b></div>
    </div>
    ${node.type === 'LeafCat' ? `<div class="leaf-note">${icon('check')}<div><b>این نود برای اتصال Product معتبر است</b><p>فقط LeafCat فعال می‌تواند به‌عنوان دسته نهایی محصول انتخاب شود.</p></div></div>` : ''}
    <div class="rule-list"><h3>قواعد این نود</h3>
      <div>${icon('check')}<span>${node.type === 'LeafCat' ? 'امکان افزودن Child ندارد.' : `فقط ${allowed.join(' یا ')} زیر این نود ساخته می‌شود.`}</span></div>
      <div>${icon('check')}<span>نام تکراری هم‌نوع زیر Parent یکسان پذیرفته نمی‌شود.</span></div>
      <div>${icon('check')}<span>ساخت نود باعث نمایش خودکار آن در سایت نمی‌شود.</span></div>
    </div>
    ${allowed.length ? `<button class="secondary add-child" data-action="add-child">${icon('plus')} افزودن Child به این نود</button>` : ''}
  </section>`;
}

function createModal() {
  const current = state.modal === 'root' ? null : findNode(state.selected)?.node;
  const types = current ? allowedChildren(current.type) : ['Vertical'];
  return `<div class="backdrop" data-action="close"><section class="modal" onclick="event.stopPropagation()">
    <header><div><span>PRD-001</span><h2>ایجاد نود جدید</h2></div><button class="icon-button" data-action="close">${icon('close')}</button></header>
    <div class="modal-body">
      <div class="parent-info"><small>Parent</small><b>${current?.name || 'بدون Parent — سطح ریشه'}</b><span>${current?.type || 'Vertical جدید'}</span></div>
      <label><span>نوع نود</span><select id="node-type">${types.map(type => `<option value="${type}">${type}</option>`).join('')}</select></label>
      <label><span>نام نود</span><input id="node-title" placeholder="مثلاً ساعت هوشمند" autocomplete="off" /></label>
      <div class="preview"><small>پیش‌نمایش مسیر</small><p>${current ? `${findNode(current.id).parents.map(x => x.name).join(' / ')}${findNode(current.id).parents.length ? ' / ' : ''}${current.name} / ` : ''}<b id="preview-name">نام نود جدید</b></p></div>
      <div class="form-note">${icon('info')} ثبت نهایی در این پروتوتایپ فقط داخل مرورگر شبیه‌سازی می‌شود.</div>
    </div>
    <footer><button class="ghost" data-action="close">انصراف</button><button class="primary" data-action="save">تأیید و ایجاد</button></footer>
  </section></div>`;
}

function decisionsModal() {
  return `<div class="backdrop" data-action="close"><section class="modal decisions" onclick="event.stopPropagation()">
    <header><div><span>GAPS</span><h2>تصمیم‌های باز PRD-001</h2></div><button class="icon-button" data-action="close">${icon('close')}</button></header>
    <div class="decision-list">${openDecisions.map(([title, text], i) => `<article><em>۰${i + 1}</em><div><b>${title}</b><p>${text}</p></div><span>باز</span></article>`).join('')}</div>
    <footer><button class="primary" data-action="close">متوجه شدم</button></footer>
  </section></div>`;
}

function render() {
  const selected = findNode(state.selected)?.node;
  document.querySelector('#app').innerHTML = `<div class="layout">
    <aside class="sidebar">
      <div class="logo"><i><span></span><span></span><span></span></i><div><b>plaza</b><small>PRD PROTOTYPES</small></div></div>
      <nav>
        <button><span>${icon('grid')}</span><b>نمای کلی</b></button>
        <button class="active"><span>${icon('tree')}</span><b>دسته‌بندی</b><em>PRD-001</em></button>
      </nav>
      <div class="prd-box"><small>PRD فعال</small><b>ایجاد CAT Tree</b><span>نسخه ۰.۲ · P0</span><div><i></i>Draft</div></div>
      <button class="gap-button" data-action="decisions"><span>۵</span><div><b>تصمیم باز</b><small>نیازمند تعیین تکلیف</small></div></button>
      <div class="profile"><span>م‌ف</span><div><b>مهدی فرحزادی</b><small>مالک محصول</small></div></div>
    </aside>
    <main>
      <header class="topbar"><div><b>Plaza Digital</b><i>/</i><span>Category</span><i>/</i><strong>PRD-001</strong></div><button class="avatar">م‌ف</button></header>
      <div class="content">
        <div class="page-head"><div><span class="eyebrow">CATEGORY · PRD-001</span><h1>ساختار دسته‌بندی</h1><p>ایجاد و مشاهده مسیر معتبر از Vertical تا LeafCat</p></div><button class="primary" data-action="add-root">${icon('plus')} نود جدید</button></div>
        <div class="stats">
          <div><span>کل نودها</span><b>${countNodes()}</b></div><div><span>Vertical</span><b>${countType('Vertical')}</b></div><div><span>LeafCat فعال</span><b>${countType('LeafCat')}</b></div><div class="gap-stat"><span>تصمیم باز</span><b>۵</b></div>
        </div>
        <div class="workspace">
          <section class="card tree-card">
            <div class="card-head"><div><h2>CAT Tree</h2><p>روی هر نود کلیک کن تا جزئیات آن را ببینی.</p></div><span>${countNodes()} نود</span></div>
            <label class="search">${icon('search')}<input id="tree-search" value="${state.search}" placeholder="جست‌وجوی نود..." /></label>
            <div class="legend"><span><i class="vertical"></i>Vertical</span><span><i class="category"></i>Category</span><span><i class="subcategory"></i>SubCategory</span><span><i class="leafcat"></i>LeafCat</span></div>
            <div class="tree">${renderTree(tree)}</div>
          </section>
          ${selected ? detailPanel() : ''}
        </div>
        <section class="scope"><div>${icon('info')}<span><b>محدوده این مرحله</b><small>فقط ساخت و مشاهده CAT Tree؛ ویرایش، حذف، SEO، ترتیب و نمایش سایت در PRDهای بعدی هستند.</small></span></div><button data-action="decisions">مشاهده کمبودهای PRD</button></section>
      </div>
    </main>
    ${state.modal === 'create' || state.modal === 'root' ? createModal() : state.modal === 'decisions' ? decisionsModal() : ''}
    ${state.toast ? `<div class="toast">${icon('check')} ${state.toast}</div>` : ''}
  </div>`;
  bindEvents();
}

function showToast(text) {
  state.toast = text;
  render();
  setTimeout(() => { state.toast = ''; render(); }, 2200);
}

function bindEvents() {
  document.querySelectorAll('[data-node]').forEach(button => button.addEventListener('click', event => {
    if (event.target.closest('[data-toggle]')) return;
    state.selected = button.dataset.node;
    render();
  }));
  document.querySelectorAll('[data-toggle]').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    const id = button.dataset.toggle;
    state.expanded.has(id) ? state.expanded.delete(id) : state.expanded.add(id);
    render();
  }));
  document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', event => {
    const action = button.dataset.action;
    if (action === 'add-root') state.modal = 'root';
    if (action === 'add-child') state.modal = 'create';
    if (action === 'decisions') state.modal = 'decisions';
    if (action === 'close') state.modal = null;
    if (action === 'save') {
      const title = document.querySelector('#node-title')?.value.trim();
      if (!title) { document.querySelector('#node-title')?.classList.add('error'); return; }
      state.modal = null;
      showToast(`نود «${title}» با موفقیت شبیه‌سازی شد`);
      return;
    }
    render();
  }));
  const titleInput = document.querySelector('#node-title');
  if (titleInput) titleInput.addEventListener('input', event => {
    document.querySelector('#preview-name').textContent = event.target.value || 'نام نود جدید';
    event.target.classList.remove('error');
  });
  const search = document.querySelector('#tree-search');
  if (search) search.addEventListener('input', event => {
    state.search = event.target.value;
    render();
    const next = document.querySelector('#tree-search');
    next?.focus(); next?.setSelectionRange(state.search.length, state.search.length);
  });
}

render();
