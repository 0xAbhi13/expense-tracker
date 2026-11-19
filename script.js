/* Expense Tracker — Veda Technology Internship Day 41 */
(function () {
  'use strict';

  /* ---------- Constants ---------- */
  const STORAGE_KEY = 'veda_expense_tracker_v1';
  const CATEGORIES = ['Food', 'Transport', 'Housing', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Education', 'Other'];

  /* ---------- State ---------- */
  const state = {
    expenses: [],
    filters: { category: 'all', from: '', to: '', sort: 'date-desc', search: '' },
    editingId: null,
    pendingDeleteId: null,
  };

  /* ---------- Helpers ---------- */
  const $ = (id) => document.getElementById(id);

  function loadExpenses() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isValidExpense).map(normalizeExpense);
    } catch (err) {
      console.error('Failed to load expenses from LocalStorage:', err);
      return [];
    }
  }

  function isValidExpense(x) {
    return !!x && typeof x === 'object' &&
      typeof x.id === 'string' && x.id.length > 0 &&
      typeof x.title === 'string' &&
      typeof x.amount === 'number' && isFinite(x.amount) && x.amount >= 0 &&
      CATEGORIES.includes(x.category) &&
      typeof x.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date);
  }

  function normalizeExpense(x) {
    return {
      id: String(x.id),
      title: String(x.title).trim().slice(0, 80),
      amount: Math.round(Number(x.amount) * 100) / 100,
      category: x.category,
      date: x.date,
      description: String(x.description || '').trim().slice(0, 300),
      createdAt: Number.isFinite(x.createdAt) ? Number(x.createdAt) : Date.now(),
    };
  }

  function saveExpenses() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.expenses));
    } catch (err) {
      console.error('Failed to save expenses:', err);
      showToast('Could not save to LocalStorage.', 'error');
    }
  }

  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'exp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatCurrency(n) {
    const num = Number(n);
    if (!isFinite(num)) return '₹0.00';
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function isValidDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const d = new Date(iso + 'T00:00:00');
    return !isNaN(d.getTime());
  }

  /* ---------- Validation ---------- */
  function validateForm(data) {
    const errors = {};
    const title = String(data.title || '').trim();
    if (!title) errors.title = 'Title is required.';
    else if (title.length > 80) errors.title = 'Title must be 80 characters or less.';

    const amountRaw = String(data.amount || '').trim();
    if (!amountRaw) errors.amount = 'Amount is required.';
    else {
      const n = Number(amountRaw);
      if (!isFinite(n)) errors.amount = 'Amount must be a valid number.';
      else if (n <= 0) errors.amount = 'Amount must be greater than 0.';
      else if (n > 1e9) errors.amount = 'Amount is too large.';
    }

    if (!CATEGORIES.includes(data.category)) errors.category = 'Please select a category.';

    if (!data.date) errors.date = 'Date is required.';
    else if (!isValidDate(data.date)) errors.date = 'Please enter a valid date.';

    const desc = String(data.description || '');
    if (desc.length > 300) errors.description = 'Description must be 300 characters or less.';

    return errors;
  }

  function clearErrors() {
    ['title', 'amount', 'category', 'date', 'description'].forEach((f) => {
      const errEl = $('err-' + f);
      if (errEl) errEl.textContent = '';
      const input = $(f);
      if (input) input.classList.remove('is-invalid');
    });
  }

  function showErrors(errors) {
    clearErrors();
    Object.keys(errors).forEach((f) => {
      const errEl = $('err-' + f);
      if (errEl) errEl.textContent = errors[f];
      const input = $(f);
      if (input) input.classList.add('is-invalid');
    });
  }

  /* ---------- Toast ---------- */
  let toastTimer = null;
  function showToast(message, type) {
    type = type || 'info';
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast toast--' + type;
    toast.hidden = false;
    void toast.offsetWidth;
    toast.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => { toast.hidden = true; }, 280);
    }, 2600);
  }

  /* ---------- Form handling ---------- */
  function getFormData() {
    return {
      title: $('title').value,
      amount: $('amount').value,
      category: $('category').value,
      date: $('date').value,
      description: $('description').value,
    };
  }

  function resetForm() {
    const form = $('expenseForm');
    if (form) form.reset();
    const dateEl = $('date');
    if (dateEl) dateEl.value = todayISO();
    clearErrors();
    state.editingId = null;
    const submitBtn = $('submitBtn');
    if (submitBtn) submitBtn.textContent = 'Add Expense';
    const cancelBtn = $('cancelEditBtn');
    if (cancelBtn) cancelBtn.hidden = true;
    const formTitle = $('formTitle');
    if (formTitle) formTitle.textContent = 'Add New Expense';
  }

  function startEdit(id) {
    const exp = state.expenses.find((x) => x.id === id);
    if (!exp) return;
    state.editingId = id;
    $('title').value = exp.title;
    $('amount').value = exp.amount;
    $('category').value = exp.category;
    $('date').value = exp.date;
    $('description').value = exp.description;
    $('submitBtn').textContent = 'Update Expense';
    $('cancelEditBtn').hidden = false;
    $('formTitle').textContent = 'Edit Expense';
    clearErrors();
    const section = document.getElementById('add');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- Delete modal ---------- */
  function requestDelete(id) {
    const exp = state.expenses.find((x) => x.id === id);
    state.pendingDeleteId = id;
    const msg = $('deleteMessage');
    if (msg) msg.textContent = 'Delete "' + (exp ? exp.title : 'this expense') + '"? This action cannot be undone.';
    const modal = $('deleteModal');
    if (modal) modal.hidden = false;
  }

  function closeDeleteModal() {
    state.pendingDeleteId = null;
    const modal = $('deleteModal');
    if (modal) modal.hidden = true;
  }

  /* ---------- Filtering / sorting ---------- */
  function getVisibleExpenses() {
    const f = state.filters;
    let list = state.expenses.slice();

    if (f.category && f.category !== 'all') {
      list = list.filter((x) => x.category === f.category);
    }
    if (f.from) list = list.filter((x) => x.date >= f.from);
    if (f.to) list = list.filter((x) => x.date <= f.to);
    if (f.search && f.search.trim()) {
      const q = f.search.trim().toLowerCase();
      list = list.filter((x) =>
        x.title.toLowerCase().includes(q) ||
        x.description.toLowerCase().includes(q) ||
        x.category.toLowerCase().includes(q)
      );
    }

    const sortValue = f.sort || 'date-desc';
    const idx = sortValue.lastIndexOf('-');
    const key = idx > 0 ? sortValue.slice(0, idx) : sortValue;
    const dir = idx > 0 ? sortValue.slice(idx + 1) : 'desc';

    list.sort((a, b) => {
      let va, vb;
      if (key === 'date') { va = a.date; vb = b.date; }
      else if (key === 'amount') { va = a.amount; vb = b.amount; }
      else if (key === 'title') { va = a.title.toLowerCase(); vb = b.title.toLowerCase(); }
      else { va = a.createdAt; vb = b.createdAt; }

      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      // tie-break: newer first
      return b.createdAt - a.createdAt;
    });

    return list;
  }

  /* ---------- Rendering ---------- */
  function renderStats() {
    const total = state.expenses.reduce((s, x) => s + x.amount, 0);
    const count = state.expenses.length;
    const now = new Date();
    const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const monthly = state.expenses
      .filter((x) => x.date.startsWith(ym))
      .reduce((s, x) => s + x.amount, 0);
    const avg = count ? total / count : 0;

    const totalEl = $('stat-total');
    const countEl = $('stat-count');
    const monthlyEl = $('stat-monthly');
    const avgEl = $('stat-average');
    if (totalEl) totalEl.textContent = formatCurrency(total);
    if (countEl) countEl.textContent = String(count);
    if (monthlyEl) monthlyEl.textContent = formatCurrency(monthly);
    if (avgEl) avgEl.textContent = formatCurrency(avg);

    const monthLabel = $('stat-month-label');
    if (monthLabel) {
      monthLabel.textContent = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }

    renderBreakdown(total);
  }

  function renderBreakdown(total) {
    const container = $('breakdownList');
    const meta = $('breakdown-meta');
    if (!container) return;

    if (!state.expenses.length) {
      container.innerHTML = '<p class="empty">No spending yet. Add your first expense to see a breakdown.</p>';
      if (meta) meta.textContent = 'No data yet';
      return;
    }

    const map = {};
    state.expenses.forEach((x) => { map[x.category] = (map[x.category] || 0) + x.amount; });
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);

    container.innerHTML = entries.map(([cat, amt]) => {
      const pct = total > 0 ? (amt / total) * 100 : 0;
      return '<div class="breakdown__row">' +
        '<div class="breakdown__label"><span>' + escapeHtml(cat) + '</span><span>' + escapeHtml(formatCurrency(amt)) + ' · ' + pct.toFixed(1) + '%</span></div>' +
        '<div class="progress"><div class="progress__bar" style="width:' + pct.toFixed(1) + '%"></div></div>' +
        '</div>';
    }).join('');

    if (meta) meta.textContent = entries.length + ' categor' + (entries.length === 1 ? 'y' : 'ies');
  }

  function renderTransactions() {
    const container = $('transactionList');
    if (!container) return;
    const list = getVisibleExpenses();

    if (!list.length) {
      container.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-state__icon">🧾</div>' +
        '<h3>No transactions found</h3>' +
        '<p>Add an expense or adjust your filters to see results.</p>' +
        '</div>';
      return;
    }

    container.innerHTML = list.map((x) => {
      return '<article class="txn" data-id="' + escapeHtml(x.id) + '">' +
        '<div class="txn__left">' +
        '<h3 class="txn__title">' + escapeHtml(x.title) + '</h3>' +
        '<div class="txn__meta">' +
        '<span class="badge badge--' + escapeHtml(x.category.toLowerCase()) + '">' + escapeHtml(x.category) + '</span>' +
        '<span class="txn__date">' + escapeHtml(formatDate(x.date)) + '</span>' +
        '</div>' +
        (x.description ? '<p class="txn__desc">' + escapeHtml(x.description) + '</p>' : '') +
        '</div>' +
        '<div class="txn__right">' +
        '<div class="txn__amount">' + escapeHtml(formatCurrency(x.amount)) + '</div>' +
        '<div class="txn__actions">' +
        '<button type="button" class="btn btn--sm btn--ghost" data-action="edit" data-id="' + escapeHtml(x.id) + '">Edit</button>' +
        '<button type="button" class="btn btn--sm btn--danger" data-action="delete" data-id="' + escapeHtml(x.id) + '">Delete</button>' +
        '</div>' +
        '</div>' +
        '</article>';
    }).join('');
  }

  function renderAll() {
    renderStats();
    renderTransactions();
  }

  /* ---------- Population of selects ---------- */
  function populateCategorySelects() {
    const mainSelect = $('category');
    if (mainSelect) {
      mainSelect.innerHTML = '<option value="">Select category</option>' +
        CATEGORIES.map((c) => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>').join('');
    }
    const filterSelect = $('filterCategory');
    if (filterSelect) {
      filterSelect.innerHTML = '<option value="all">All Categories</option>' +
        CATEGORIES.map((c) => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>').join('');
    }
  }

  /* ---------- Wiring ---------- */
  function wireEvents() {
    const form = $('expenseForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = getFormData();
        const errors = validateForm(data);
        if (Object.keys(errors).length) {
          showErrors(errors);
          showToast('Please fix the errors in the form.', 'error');
          return;
        }

        const expense = {
          id: state.editingId || generateId(),
          title: data.title.trim(),
          amount: Math.round(Number(data.amount) * 100) / 100,
          category: data.category,
          date: data.date,
          description: data.description.trim(),
          createdAt: state.editingId
            ? (state.expenses.find((x) => x.id === state.editingId) || {}).createdAt || Date.now()
            : Date.now(),
        };

        if (state.editingId) {
          const idx = state.expenses.findIndex((x) => x.id === state.editingId);
          if (idx !== -1) state.expenses[idx] = expense;
          showToast('Expense updated successfully.', 'success');
        } else {
          state.expenses.unshift(expense);
          showToast('Expense added successfully.', 'success');
        }

        saveExpenses();
        resetForm();
        renderAll();
      });
    }

    const cancelEditBtn = $('cancelEditBtn');
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', resetForm);

    const resetFormBtn = $('resetFormBtn');
    if (resetFormBtn) {
      resetFormBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetForm();
      });
    }

    const transactionList = $('transactionList');
    if (transactionList) {
      transactionList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        if (action === 'edit') startEdit(id);
        else if (action === 'delete') requestDelete(id);
      });
    }

    const confirmDeleteBtn = $('confirmDeleteBtn');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => {
        if (!state.pendingDeleteId) return;
        state.expenses = state.expenses.filter((x) => x.id !== state.pendingDeleteId);
        saveExpenses();
        showToast('Expense deleted.', 'success');
        closeDeleteModal();
        renderAll();
      });
    }

    const deleteModal = $('deleteModal');
    if (deleteModal) {
      deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal || (e.target && e.target.hasAttribute('data-close'))) {
          closeDeleteModal();
        }
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = $('deleteModal');
        if (modal && !modal.hidden) closeDeleteModal();
      }
    });

    // Filters
    const filterCategory = $('filterCategory');
    if (filterCategory) filterCategory.addEventListener('change', (e) => {
      state.filters.category = e.target.value;
      renderTransactions();
    });
    const filterFrom = $('filterFrom');
    if (filterFrom) filterFrom.addEventListener('change', (e) => {
      state.filters.from = e.target.value;
      renderTransactions();
    });
    const filterTo = $('filterTo');
    if (filterTo) filterTo.addEventListener('change', (e) => {
      state.filters.to = e.target.value;
      renderTransactions();
    });
    const sortBy = $('sortBy');
    if (sortBy) sortBy.addEventListener('change', (e) => {
      state.filters.sort = e.target.value;
      renderTransactions();
    });
    const searchInput = $('searchInput');
    if (searchInput) searchInput.addEventListener('input', (e) => {
      state.filters.search = e.target.value;
      renderTransactions();
    });
    const clearFiltersBtn = $('clearFiltersBtn');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        state.filters = { category: 'all', from: '', to: '', sort: 'date-desc', search: '' };
        if ($('filterCategory')) $('filterCategory').value = 'all';
        if ($('filterFrom')) $('filterFrom').value = '';
        if ($('filterTo')) $('filterTo').value = '';
        if ($('sortBy')) $('sortBy').value = 'date-desc';
        if ($('searchInput')) $('searchInput').value = '';
        renderTransactions();
      });
    }

    // Nav toggle
    const navToggle = $('navToggle');
    const nav = $('nav');
    if (navToggle && nav) {
      navToggle.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', String(open));
      });
      nav.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', () => {
          nav.classList.remove('is-open');
          navToggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // Live validation clearing
    ['title', 'amount', 'category', 'date', 'description'].forEach((f) => {
      const el = $(f);
      if (el) el.addEventListener('input', () => {
        const errEl = $('err-' + f);
        if (errEl) errEl.textContent = '';
        el.classList.remove('is-invalid');
      });
    });
  }

  /* ---------- Init ---------- */
  function init() {
    populateCategorySelects();
    state.expenses = loadExpenses();
    const dateEl = $('date');
    if (dateEl && !dateEl.value) dateEl.value = todayISO();
    wireEvents();
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
