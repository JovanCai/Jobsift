(() => {
  const { storage, i18n } = self.__JSF;
  const t = i18n.t;

  let cfg = null;

  const $ = (s) => document.querySelector(s);
  const els = {
    tabs: document.querySelectorAll('.tabs button'),
    sections: document.querySelectorAll('.tab'),
    langSelect: $('#lang-select'),
    bl: { list: $('#bl-list'), input: $('#bl-input'), add: $('#bl-add') },
    kw: { list: $('#kw-list'), input: $('#kw-input'), add: $('#kw-add'), enabled: $('#kw-enabled') },
    wl: { list: $('#wl-list'), input: $('#wl-input'), add: $('#wl-add') },
    io: {
      exportBtn: $('#export-btn'),
      importBtn: $('#import-btn'),
      resetBtn: $('#reset-btn'),
      file: $('#import-file'),
      preview: $('#io-preview'),
    },
    toast: $('#toast'),
  };

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (els.toast.hidden = true), 1600);
  }

  function switchTab(name) {
    els.tabs.forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    els.sections.forEach((s) => s.classList.toggle('active', s.id === `tab-${name}`));
  }

  function renderList(ul, items, onRemove) {
    ul.innerHTML = '';
    if (!items.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = t('empty_list');
      ul.appendChild(li);
      return;
    }
    for (const v of items) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'value';
      span.textContent = v;
      const btn = document.createElement('button');
      btn.textContent = t('btn_delete');
      btn.addEventListener('click', () => onRemove(v));
      li.appendChild(span);
      li.appendChild(btn);
      ul.appendChild(li);
    }
  }

  function render() {
    renderList(els.bl.list, cfg.blacklist, async (v) => {
      await storage.removeFrom('blacklist', v);
      toast(t('toast_deleted', [v]));
    });
    renderList(els.kw.list, cfg.keywords, async (v) => {
      await storage.removeFrom('keywords', v);
      toast(t('toast_deleted', [v]));
    });
    renderList(els.wl.list, cfg.whitelist, async (v) => {
      await storage.removeFrom('whitelist', v);
      toast(t('toast_deleted', [v]));
    });
    els.kw.enabled.checked = !!cfg.keywordsEnabled;
    els.langSelect.value = cfg.lang || 'auto';
  }

  function bindTabs() {
    els.tabs.forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  }

  function bindAdd(inputEl, btnEl, listName) {
    const add = async () => {
      const v = inputEl.value.trim();
      if (!v) return;
      await storage.addTo(listName, v);
      inputEl.value = '';
      toast(t('toast_added', [v]));
    };
    btnEl.addEventListener('click', add);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') add();
    });
  }

  function bindKwEnabled() {
    els.kw.enabled.addEventListener('change', async () => {
      cfg.keywordsEnabled = els.kw.enabled.checked;
      await storage.save(cfg);
      toast(cfg.keywordsEnabled ? t('toast_kw_on') : t('toast_kw_off'));
    });
  }

  function bindLang() {
    els.langSelect.addEventListener('change', async () => {
      cfg.lang = els.langSelect.value;
      await storage.save(cfg);
      await i18n.loadOverride(cfg.lang);
      i18n.applyI18n();
      render();  // 重新渲染 delete 按钮文字 / 空列表提示等
    });
  }

  function bindIO() {
    els.io.exportBtn.addEventListener('click', () => {
      const json = JSON.stringify(cfg, null, 2);
      els.io.preview.textContent = json;
      els.io.preview.hidden = false;
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `jsf-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast(t('toast_exported'));
    });

    els.io.importBtn.addEventListener('click', () => els.io.file.click());
    els.io.file.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const obj = JSON.parse(text);
        if (!Array.isArray(obj.blacklist) || !Array.isArray(obj.keywords) || !Array.isArray(obj.whitelist)) {
          throw new Error('missing blacklist/keywords/whitelist field');
        }
        await storage.save({ ...storage.DEFAULT_CONFIG, ...obj });
        toast(t('toast_imported'));
      } catch (err) {
        alert(t('toast_import_failed', [err.message]));
      } finally {
        els.io.file.value = '';
      }
    });

    els.io.resetBtn.addEventListener('click', async () => {
      if (!confirm(t('confirm_reset'))) return;
      await storage.save({ ...storage.DEFAULT_CONFIG });
      toast(t('toast_reset'));
    });
  }

  (async () => {
    cfg = await storage.load();
    await i18n.loadOverride(cfg.lang);
    i18n.applyI18n();
    render();
    bindTabs();
    bindLang();
    bindAdd(els.bl.input, els.bl.add, 'blacklist');
    bindAdd(els.kw.input, els.kw.add, 'keywords');
    bindAdd(els.wl.input, els.wl.add, 'whitelist');
    bindKwEnabled();
    bindIO();
    storage.onChange(async (newCfg) => {
      const langChanged = newCfg.lang !== cfg.lang;
      cfg = newCfg;
      if (langChanged) {
        await i18n.loadOverride(cfg.lang);
        i18n.applyI18n();
      }
      render();
    });
  })();
})();
