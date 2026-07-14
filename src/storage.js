// Job Feed Filter —— chrome.storage.sync 读写 + 默认配置

(function (root) {
  const KEY = 'lrb_config';

  // 出厂配置：完全空白。用户主动加公司名或开启关键词规则后才产生任何屏蔽。
  // 关键词内置了一份「建议清单」但默认关闭 —— 用户在设置页可以一键启用后再调整。
  const DEFAULT_CONFIG = {
    version: 1,
    blacklist: [],
    keywords: [
      'recruit', 'talent', 'staffing', 'agency', 'headhunt',
      'career', 'consulting', 'hr solutions',
      '人材', '人財', 'エージェント', '転職', 'キャリア', '紹介',
    ],
    whitelist: [],
    keywordsEnabled: false,
  };

  async function load() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([KEY], (obj) => {
        const stored = obj && obj[KEY];
        if (!stored) return resolve({ ...DEFAULT_CONFIG });
        // 缺字段用默认值兜底（未来加字段时不用写迁移）
        resolve({ ...DEFAULT_CONFIG, ...stored });
      });
    });
  }

  async function save(config) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ [KEY]: config }, () => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve();
      });
    });
  }

  function onChange(cb) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes[KEY]) {
        cb(changes[KEY].newValue || { ...DEFAULT_CONFIG });
      }
    });
  }

  // 快捷操作：加一条到某个列表（去重）
  async function addTo(listName, value) {
    if (!['blacklist', 'keywords', 'whitelist'].includes(listName)) {
      throw new Error('bad listName: ' + listName);
    }
    const v = String(value || '').trim();
    if (!v) return;
    const cfg = await load();
    const list = cfg[listName] || [];
    if (list.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    cfg[listName] = [...list, v];
    await save(cfg);
  }

  async function removeFrom(listName, value) {
    const cfg = await load();
    const list = cfg[listName] || [];
    cfg[listName] = list.filter((x) => x !== value);
    await save(cfg);
  }

  const api = { load, save, addTo, removeFrom, onChange, DEFAULT_CONFIG, KEY };

  root.__LRB = root.__LRB || {};
  root.__LRB.storage = api;
})(typeof self !== 'undefined' ? self : this);
