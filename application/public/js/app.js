/* ==========================================================================
   Code Playground – Frontend Application
   ========================================================================== */

(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let snippets = [];
  let activeSnippetId = null;
  let isDirty = false;
  let editor; // CodeMirror instance

  // ---------------------------------------------------------------------------
  // DOM refs
  // ---------------------------------------------------------------------------
  const $snippetList = document.getElementById('snippetList');
  const $searchInput = document.getElementById('searchInput');
  const $snippetTitle = document.getElementById('snippetTitle');
  const $snippetDesc = document.getElementById('snippetDesc');
  const $tagInput = document.getElementById('tagInput');
  const $outputConsole = document.getElementById('outputConsole');
  const $durationBadge = document.getElementById('durationBadge');
  const $historyModal = document.getElementById('historyModal');
  const $historyBody = document.getElementById('historyBody');
  const $btnFav = document.getElementById('btnFav');

  // Stats
  const $statSnippets = document.getElementById('statSnippets');
  const $statRuns = document.getElementById('statRuns');
  const $statFavs = document.getElementById('statFavs');

  // Filter buttons
  const filterBtns = document.querySelectorAll('.filter-btn');
  let currentFilter = 'all';

  // ---------------------------------------------------------------------------
  // Init CodeMirror
  // ---------------------------------------------------------------------------
  function initEditor() {
    editor = CodeMirror.fromTextArea(document.getElementById('codeEditor'), {
      mode: 'javascript',
      theme: 'dracula',
      lineNumbers: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      styleActiveLine: true,
      tabSize: 2,
      indentWithTabs: false,
      lineWrapping: true,
      extraKeys: {
        'Ctrl-Enter': runCode,
        'Cmd-Enter': runCode,
        'Ctrl-S': (cm) => { saveSnippet(); return false; },
        'Cmd-S': (cm) => { saveSnippet(); return false; },
        'Ctrl-/': 'toggleComment',
        'Cmd-/': 'toggleComment',
      },
    });

    editor.on('change', () => { isDirty = true; });

    // Set default content for new users
    editor.setValue(
      '// Welcome to Code Playground! ⚡\n' +
      '// Write JavaScript and press ▶ Run or Ctrl+Enter\n\n' +
      'const greet = (name) => `Hello, ${name}!`;\n\n' +
      'console.log(greet("World"));\n' +
      'console.log("2 + 2 =", 2 + 2);\n'
    );
  }

  // ---------------------------------------------------------------------------
  // API helpers
  // ---------------------------------------------------------------------------
  async function api(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  }

  // ---------------------------------------------------------------------------
  // Snippets CRUD
  // ---------------------------------------------------------------------------
  async function loadSnippets() {
    const params = new URLSearchParams();
    const search = $searchInput.value.trim();
    if (search) params.set('search', search);
    if (currentFilter === 'favorites') params.set('favorites', 'true');

    snippets = await api('GET', `/api/snippets?${params}`);
    renderSnippetList();
    loadStats();
  }

  function renderSnippetList() {
    $snippetList.innerHTML = '';

    if (snippets.length === 0) {
      $snippetList.innerHTML = `
        <li style="padding: 20px 14px; color: var(--text-muted); text-align: center; font-size: 13px;">
          No snippets found.<br>Click <strong>+ New</strong> to create one.
        </li>`;
      return;
    }

    for (const s of snippets) {
      const li = document.createElement('li');
      li.className = `snippet-item ${s.id === activeSnippetId ? 'active' : ''}`;
      li.dataset.id = s.id;

      const tags = safeParseTags(s.tags);
      const tagStr = tags.length ? tags.map(t => `#${t}`).join(' ') : '';

      li.innerHTML = `
        <div class="snippet-item__title">
          ${s.is_favorite ? '<span class="snippet-item__fav">⭐</span>' : ''}
          ${escHtml(s.title)}
        </div>
        <div class="snippet-item__meta">
          <span>▶ ${s.run_count}</span>
          ${tagStr ? `<span>${escHtml(tagStr)}</span>` : ''}
        </div>`;

      li.addEventListener('click', () => openSnippet(s.id));
      $snippetList.appendChild(li);
    }
  }

  async function openSnippet(id) {
    if (isDirty && activeSnippetId && activeSnippetId !== id) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }

    const snippet = await api('GET', `/api/snippets/${id}`);
    activeSnippetId = snippet.id;
    isDirty = false;

    $snippetTitle.value = snippet.title;
    $snippetDesc.value = snippet.description || '';
    $tagInput.value = safeParseTags(snippet.tags).join(', ');
    $btnFav.textContent = snippet.is_favorite ? '★' : '☆';
    editor.setValue(snippet.code);

    clearOutput();
    renderSnippetList();
  }

  async function saveSnippet() {
    const title = $snippetTitle.value.trim() || 'Untitled Snippet';
    const description = $snippetDesc.value.trim();
    const code = editor.getValue();
    const tags = $tagInput.value
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    try {
      if (activeSnippetId) {
        await api('PUT', `/api/snippets/${activeSnippetId}`, { title, description, code, tags });
        toast('Snippet saved!', 'success');
      } else {
        const created = await api('POST', '/api/snippets', { title, description, code, tags });
        activeSnippetId = created.id;
        toast('Snippet created!', 'success');
      }
      isDirty = false;
      await loadSnippets();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function deleteSnippet() {
    if (!activeSnippetId) return;
    if (!confirm('Delete this snippet?')) return;

    try {
      await api('DELETE', `/api/snippets/${activeSnippetId}`);
      activeSnippetId = null;
      isDirty = false;
      $snippetTitle.value = 'Untitled Snippet';
      $snippetDesc.value = '';
      $tagInput.value = '';
      $btnFav.textContent = '☆';
      editor.setValue('// Start coding…\n');
      clearOutput();
      await loadSnippets();
      toast('Snippet deleted', 'info');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function toggleFavorite() {
    if (!activeSnippetId) {
      toast('Save the snippet first', 'info');
      return;
    }
    try {
      const updated = await api('PATCH', `/api/snippets/${activeSnippetId}/favorite`);
      $btnFav.textContent = updated.is_favorite ? '★' : '☆';
      await loadSnippets();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function newSnippet() {
    if (isDirty && !confirm('You have unsaved changes. Discard them?')) return;
    activeSnippetId = null;
    isDirty = false;
    $snippetTitle.value = 'Untitled Snippet';
    $snippetDesc.value = '';
    $tagInput.value = '';
    $btnFav.textContent = '☆';
    editor.setValue('// Start coding…\n');
    clearOutput();
    renderSnippetList();
    editor.focus();
  }

  // ---------------------------------------------------------------------------
  // Code Execution
  // ---------------------------------------------------------------------------
  async function runCode() {
    const code = editor.getValue();
    if (!code.trim()) {
      toast('Nothing to run', 'info');
      return;
    }

    setOutputLoading();

    try {
      const result = await api('POST', '/api/execute', {
        code,
        snippetId: activeSnippetId || undefined,
      });

      renderOutput(result);
      await loadSnippets(); // refresh run counts
    } catch (err) {
      $outputConsole.innerHTML = `<span class="output-error">Error: ${escHtml(err.message)}</span>`;
    }
  }

  function renderOutput(result) {
    let html = '';

    if (result.output && result.output.length) {
      html += result.output.map(line => `<span class="output-success">${escHtml(line)}</span>`).join('\n');
    }

    if (result.error) {
      if (html) html += '\n';
      html += `<span class="output-error">❌ ${escHtml(result.error)}</span>`;
    }

    if (!html) {
      html = '<span class="output-placeholder">(no output)</span>';
    }

    $outputConsole.innerHTML = html;
    $durationBadge.textContent = `${result.durationMs} ms`;
    $durationBadge.classList.add('visible');
  }

  function setOutputLoading() {
    $outputConsole.innerHTML = '<span class="output-placeholder">⏳ Running…</span>';
    $durationBadge.classList.remove('visible');
  }

  function clearOutput() {
    $outputConsole.innerHTML = '<span class="output-placeholder">Run your code to see the output here…</span>';
    $durationBadge.classList.remove('visible');
  }

  // ---------------------------------------------------------------------------
  // Execution History
  // ---------------------------------------------------------------------------
  async function showHistory() {
    if (!activeSnippetId) {
      toast('Save the snippet first to see its history', 'info');
      return;
    }

    try {
      const history = await api('GET', `/api/snippets/${activeSnippetId}/history`);

      if (history.length === 0) {
        $historyBody.innerHTML = '<p style="color: var(--text-muted);">No execution history yet.</p>';
      } else {
        $historyBody.innerHTML = history
          .map(
            (h) => `
            <div class="history-entry">
              <div class="history-entry__time">${new Date(h.executed_at + 'Z').toLocaleString()}</div>
              <div class="history-entry__output ${h.error ? 'history-entry__error' : ''}">
${escHtml(h.error || h.output || '(no output)')}</div>
              <div class="history-entry__duration">${h.duration_ms} ms</div>
            </div>`
          )
          .join('');
      }

      $historyModal.classList.add('open');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------
  async function loadStats() {
    try {
      const stats = await api('GET', '/api/snippets/stats');
      $statSnippets.textContent = `📁 ${stats.totalSnippets}`;
      $statRuns.textContent = `▶ ${stats.totalRuns}`;
      $statFavs.textContent = `⭐ ${stats.favorites}`;
    } catch {
      // non-critical
    }
  }

  // ---------------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------------
  function toast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ---------------------------------------------------------------------------
  // Util
  // ---------------------------------------------------------------------------
  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function safeParseTags(raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Event bindings
  // ---------------------------------------------------------------------------
  document.getElementById('btnRun').addEventListener('click', runCode);
  document.getElementById('btnSave').addEventListener('click', saveSnippet);
  document.getElementById('btnDelete').addEventListener('click', deleteSnippet);
  document.getElementById('btnNew').addEventListener('click', newSnippet);
  document.getElementById('btnFav').addEventListener('click', toggleFavorite);
  document.getElementById('btnClearOutput').addEventListener('click', clearOutput);
  document.getElementById('btnHistory').addEventListener('click', showHistory);
  document.getElementById('btnCloseHistory').addEventListener('click', () => {
    $historyModal.classList.remove('open');
  });

  // Sidebar filters
  filterBtns.forEach((btn) =>
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      loadSnippets();
    })
  );

  // Search debounce
  let searchTimer;
  $searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadSnippets, 300);
  });

  // Close modal on overlay click
  $historyModal.addEventListener('click', (e) => {
    if (e.target === $historyModal) $historyModal.classList.remove('open');
  });

  // Keyboard shortcut: Escape to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $historyModal.classList.remove('open');
  });

  // Warn before leaving with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  initEditor();
  loadSnippets();
})();
