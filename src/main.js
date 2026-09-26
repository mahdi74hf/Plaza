import './style.css';
import { bindProduct, openProductGaps, productContent, productMeta } from './product.js';
import { countActiveType, countNodes, countType, findNode, getSiblings, persistTree, removeNode, tree } from './tree.js';

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
  box: '<svg viewBox="0 0 24 24"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Zm8 2.2L7.2 7.5 12 4.8l4.8 2.7L12 9.7ZM6 9.3l5 2.8v6.2l-5-2.8V9.3Zm7 9v-6.2l5-2.8v6.2l-5 2.8Z"/></svg>',
})[name];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const openDecisions = [
  ['عمق SubCategory', 'محدودیت UI برای تعداد سطوح هنوز تعیین نشده است.'],
  ['قواعد نام‌گذاری', 'حداکثر طول و کاراکترهای مجاز نام نود مشخص نیست.'],
  ['دسترسی شاخه‌ای', 'محدوده دسترسی اپراتورها به Verticalها باز است.'],
  ['Type 1 و Type 2', 'باید Attribute یا Variant بودن آن‌ها تعیین شود.'],
  ['تغییر LeafCat', 'اثر آن بر Audit، Search و SEO نیاز به تصمیم دارد.'],
];

const state = {
  screen: 'category',
  selected: 'phone',
  expanded: new Set(['it', 'digital', 'mobile', 'computer']),
  modal: null,
  toast: '',
  search: '',
};

function uniqueId(type) {
  return `${type.toLowerCase()}-${Date.now().toString(36)}`;
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
        <span class="node-name"><b>${escapeHtml(node.name)}</b><small>${typeLabel(node.type)}</small></span>
        <span class="node-status ${node.status === 'inactive' ? 'inactive' : ''}">${node.status === 'inactive' ? 'غیرفعال' : 'فعال'}</span>
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
      <div><span class="type-pill ${node.type.toLowerCase()}">${node.type}</span><span class="active-pill ${node.status === 'inactive' ? 'inactive' : ''}"><i></i>${node.status === 'inactive' ? 'غیرفعال' : 'فعال'}</span><h2>${escapeHtml(node.name)}</h2><p>شناسه: ${node.id}</p></div>
      <div class="detail-actions"><button class="action-button" data-action="edit">ویرایش</button><button class="action-button danger" data-action="delete">حذف</button></div>
    </div>
    <div class="path-box"><span>مسیر کامل</span><div>${path.map((item, index) => `<b class="${index === path.length - 1 ? 'current' : ''}">${escapeHtml(item.name)}</b>${index < path.length - 1 ? '<i>/</i>' : ''}`).join('')}</div></div>
    <div class="detail-grid">
      <div><span>نوع نود</span><b>${node.type}</b></div>
      <div><span>Parent</span><b>${parents.at(-1)?.name || 'ندارد'}</b></div>
      <div><span>وضعیت</span><b>${node.status === 'inactive' ? 'غیرفعال' : 'فعال'}</b></div>
      <div><span>Child مجاز</span><b>${allowed.length ? allowed.join(' / ') : 'ندارد'}</b></div>
    </div>
    ${node.type === 'LeafCat' && node.status !== 'inactive' ? `<div class="leaf-note">${icon('check')}<div><b>این نود برای اتصال Product معتبر است</b><p>فقط LeafCat فعال می‌تواند به‌عنوان دسته نهایی محصول انتخاب شود.</p></div></div>` : ''}
    <div class="rule-list"><h3>قواعد این نود</h3>
      <div>${icon('check')}<span>${node.type === 'LeafCat' ? 'امکان افزودن Child ندارد.' : `فقط ${allowed.join(' یا ')} زیر این نود ساخته می‌شود.`}</span></div>
      <div>${icon('check')}<span>نام تکراری هم‌نوع زیر Parent یکسان پذیرفته نمی‌شود.</span></div>
      <div>${icon('check')}<span>ساخت نود باعث نمایش خودکار آن در سایت نمی‌شود.</span></div>
    </div>
    ${allowed.length && node.status !== 'inactive' ? `<button class="secondary add-child" data-action="add-child">${icon('plus')} افزودن Child به این نود</button>` : ''}
  </section>`;
}

function createModal() {
  const current = state.modal === 'root' ? null : findNode(state.selected)?.node;
  const types = current ? allowedChildren(current.type) : ['Vertical'];
  return `<div class="backdrop" data-action="close"><section class="modal" onclick="event.stopPropagation()">
    <header><div><span>PRD-001</span><h2>ایجاد نود جدید</h2></div><button class="icon-button" data-action="close">${icon('close')}</button></header>
    <div class="modal-body">
      <div class="parent-info"><small>Parent</small><b>${current ? escapeHtml(current.name) : 'بدون Parent — سطح ریشه'}</b><span>${current?.type || 'Vertical جدید'}</span></div>
      <label><span>نوع نود</span><select id="node-type">${types.map(type => `<option value="${type}">${type}</option>`).join('')}</select></label>
      <label><span>نام نود</span><input id="node-title" placeholder="مثلاً ساعت هوشمند" autocomplete="off" /></label>
      <div class="preview"><small>پیش‌نمایش مسیر</small><p>${current ? `${findNode(current.id).parents.map(x => escapeHtml(x.name)).join(' / ')}${findNode(current.id).parents.length ? ' / ' : ''}${escapeHtml(current.name)} / ` : ''}<b id="preview-name">نام نود جدید</b></p></div>
      <p class="form-error" id="form-error"></p>
      <div class="form-note">${icon('info')} تغییرات در همین مرورگر ذخیره می‌شوند و بعد از Refresh باقی می‌مانند.</div>
    </div>
    <footer><button class="ghost" data-action="close">انصراف</button><button class="primary" data-action="save">تأیید و ایجاد</button></footer>
  </section></div>`;
}

function editModal() {
  const { node, parents } = findNode(state.selected);
  return `<div class="backdrop" data-action="close"><section class="modal" onclick="event.stopPropagation()">
    <header><div><span>UPDATE NODE</span><h2>ویرایش نود</h2></div><button class="icon-button" data-action="close">${icon('close')}</button></header>
    <div class="modal-body">
      <div class="parent-info"><small>نوع و Parent قابل تغییر نیستند</small><b>${node.type}</b><span>${parents.at(-1) ? escapeHtml(parents.at(-1).name) : 'ریشه'}</span></div>
      <label><span>نام نود</span><input id="node-title" value="${escapeHtml(node.name)}" autocomplete="off" /></label>
      <label><span>وضعیت</span><select id="node-status"><option value="active" ${node.status !== 'inactive' ? 'selected' : ''}>فعال</option><option value="inactive" ${node.status === 'inactive' ? 'selected' : ''}>غیرفعال</option></select></label>
      <p class="form-error" id="form-error"></p>
      <div class="form-note">${icon('info')} غیرفعال‌کردن Parent دارای Child در این نمونه برای تست UI مجاز است.</div>
    </div>
    <footer><button class="ghost" data-action="close">انصراف</button><button class="primary" data-action="save-edit">ذخیره تغییرات</button></footer>
  </section></div>`;
}

function deleteModal() {
  const { node } = findNode(state.selected);
  const hasChildren = Boolean(node.children?.length);
  return `<div class="backdrop" data-action="close"><section class="modal confirm-modal" onclick="event.stopPropagation()">
    <header><div><span>DELETE NODE</span><h2>حذف «${escapeHtml(node.name)}»</h2></div><button class="icon-button" data-action="close">${icon('close')}</button></header>
    <div class="modal-body">
      ${hasChildren ? `<div class="delete-warning blocked"><b>این نود قابل حذف نیست</b><p>نود دارای Child است. ابتدا Childهای آن را حذف کن.</p></div>` : `<div class="delete-warning"><b>این عملیات برگشت‌پذیر نیست</b><p>نود از CAT Tree و حافظه مرورگر حذف می‌شود.</p></div>`}
    </div>
    <footer><button class="ghost" data-action="close">انصراف</button>${hasChildren ? '' : '<button class="delete-button" data-action="confirm-delete">حذف نود</button>'}</footer>
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
  const product = state.screen === 'product';
  const meta = product ? productMeta() : null;
  document.querySelector('#app').innerHTML = `<div class="layout">
    <aside class="sidebar">
      <div class="logo"><i><span></span><span></span><span></span></i><div><b>plaza</b><small>PRD PROTOTYPES</small></div></div>
      <nav>
        <button class="${product ? '' : 'active'}" data-screen="category"><span>${icon('tree')}</span><b>دسته‌بندی</b><em>PRD-001</em></button>
        <button class="${product ? 'active' : ''}" data-screen="product"><span>${icon('box')}</span><b>محصول</b><em>${product ? meta.code : 'Product'}</em></button>
      </nav>
      <div class="prd-box"><small>PRD فعال</small><b>${product ? meta.name : 'ایجاد CAT Tree'}</b><span>${product ? meta.code : 'نسخه ۰.۲'} · P0</span><div><i></i>Draft</div></div>
      <button class="gap-button" data-action="decisions"><span>${product ? meta.gaps : 5}</span><div><b>تصمیم باز</b><small>نیازمند تعیین تکلیف</small></div></button>
      <div class="profile"><span>م‌ف</span><div><b>مهدی فرحزادی</b><small>مالک محصول</small></div></div>
    </aside>
    <main>
      <header class="topbar"><div><b>Plaza Digital</b><i>/</i><span>${product ? 'Product' : 'Category'}</span><i>/</i><strong>${product ? meta.code : 'PRD-001'}</strong></div><button class="avatar">م‌ف</button></header>
      <div class="content">
        ${product ? productContent(icon) : `<div class="page-head"><div><span class="eyebrow">CATEGORY · PRD-001</span><h1>ساختار دسته‌بندی</h1><p>ایجاد و مشاهده مسیر معتبر از Vertical تا LeafCat</p></div><button class="primary" data-action="add-root">${icon('plus')} نود جدید</button></div>
        <div class="stats">
          <div><span>کل نودها</span><b>${countNodes()}</b></div><div><span>Vertical</span><b>${countType('Vertical')}</b></div><div><span>LeafCat فعال</span><b>${countActiveType('LeafCat')}</b></div><div class="gap-stat"><span>تصمیم باز</span><b>۵</b></div>
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
        <section class="scope"><div>${icon('info')}<span><b>ذخیره‌سازی Prototype</b><small>عملیات ایجاد، مشاهده، ویرایش و حذف در localStorage مرورگر ذخیره می‌شود؛ SEO و نمایش سایت در PRDهای بعدی هستند.</small></span></div><button data-action="decisions">مشاهده کمبودهای PRD</button></section>`}
      </div>
    </main>
    ${product ? '' : (state.modal === 'create' || state.modal === 'root' ? createModal() : state.modal === 'edit' ? editModal() : state.modal === 'delete' ? deleteModal() : state.modal === 'decisions' ? decisionsModal() : '')}
    ${!product && state.toast ? `<div class="toast">${icon('check')} ${state.toast}</div>` : ''}
  </div>`;
  bindEvents();
}

function showToast(text) {
  state.toast = text;
  render();
  setTimeout(() => { state.toast = ''; render(); }, 2200);
}

function bindEvents() {
  document.querySelectorAll('[data-screen]').forEach((button) => button.addEventListener('click', () => {
    state.screen = button.dataset.screen;
    state.modal = null;
    render();
  }));
  if (state.screen === 'product') {
    bindProduct(render);
    document.querySelector('.gap-button')?.addEventListener('click', () => {
      openProductGaps();
      render();
    });
    return;
  }
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
    if (action === 'edit') state.modal = 'edit';
    if (action === 'delete') state.modal = 'delete';
    if (action === 'decisions') state.modal = 'decisions';
    if (action === 'close') state.modal = null;
    if (action === 'save') {
      const title = document.querySelector('#node-title')?.value.trim();
      const type = document.querySelector('#node-type')?.value;
      const parentId = state.modal === 'root' ? null : state.selected;
      const siblings = getSiblings(parentId);
      if (!title) {
        document.querySelector('#node-title')?.classList.add('error');
        document.querySelector('#form-error').textContent = 'نام نود را وارد کن.';
        return;
      }
      if (siblings.some(node => node.type === type && node.name.trim() === title)) {
        document.querySelector('#node-title')?.classList.add('error');
        document.querySelector('#form-error').textContent = 'نود هم‌نام و هم‌نوع زیر این Parent وجود دارد.';
        return;
      }
      const newNode = { id: uniqueId(type), name: title, type, status: 'active' };
      siblings.push(newNode);
      if (parentId) state.expanded.add(parentId);
      state.selected = newNode.id;
      persistTree();
      state.modal = null;
      showToast(`نود «${title}» ایجاد و ذخیره شد`);
      return;
    }
    if (action === 'save-edit') {
      const found = findNode(state.selected);
      const title = document.querySelector('#node-title')?.value.trim();
      const status = document.querySelector('#node-status')?.value;
      const parentId = found.parents.at(-1)?.id || null;
      const siblings = getSiblings(parentId);
      if (!title) {
        document.querySelector('#node-title')?.classList.add('error');
        document.querySelector('#form-error').textContent = 'نام نود را وارد کن.';
        return;
      }
      if (siblings.some(node => node.id !== found.node.id && node.type === found.node.type && node.name.trim() === title)) {
        document.querySelector('#node-title')?.classList.add('error');
        document.querySelector('#form-error').textContent = 'نود هم‌نام و هم‌نوع زیر این Parent وجود دارد.';
        return;
      }
      found.node.name = title;
      found.node.status = status;
      persistTree();
      state.modal = null;
      showToast(`تغییرات «${title}» ذخیره شد`);
      return;
    }
    if (action === 'confirm-delete') {
      const found = findNode(state.selected);
      const title = found.node.name;
      const nextSelected = found.parents.at(-1)?.id || tree.find(node => node.id !== state.selected)?.id;
      removeNode(state.selected);
      persistTree();
      state.selected = nextSelected || null;
      state.modal = null;
      showToast(`نود «${title}» حذف شد`);
      return;
    }
    render();
  }));
  const titleInput = document.querySelector('#node-title');
  if (titleInput) titleInput.addEventListener('input', event => {
    const previewName = document.querySelector('#preview-name');
    if (previewName) previewName.textContent = event.target.value || 'نام نود جدید';
    const formError = document.querySelector('#form-error');
    if (formError) formError.textContent = '';
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
