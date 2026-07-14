const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize, judge } = require('../src/matcher.js');

const cfg = (over = {}) => ({
  blacklist: ['AcmeAgency', 'Widget Staffing'],
  keywords: ['recruit', 'talent', 'staffing', '人材', 'エージェント', '転職'],
  whitelist: ['Sample Holdings'],
  keywordsEnabled: true,
  ...over,
});

test('normalize: 大小写、全角、法人后缀', () => {
  assert.equal(normalize('AcmeAgency Inc.'), 'acmeagency');
  assert.equal(normalize('株式会社AcmeAgency'), 'acmeagency');
  assert.equal(normalize('ＡＣＭＥ'), 'acme');
  assert.equal(normalize('Ideal Folks LLC'), 'ideal folks');
  assert.equal(normalize('Co., Ltd. Foo'), 'foo');
});

test('normalize: 不误剥像法人后缀的普通词', () => {
  // "Incentive" 里含 "Inc"，用了 \b 边界，不该被剥
  assert.equal(normalize('Incentive Corp'), 'incentive');
});

test('黑名单命中', () => {
  const r = judge('AcmeAgency', cfg());
  assert.equal(r.blocked, true);
  assert.equal(r.reason, 'blacklist');
  assert.equal(r.matched, 'AcmeAgency');
});

test('黑名单命中 —— 带日文法人前缀', () => {
  const r = judge('株式会社AcmeAgency', cfg());
  assert.equal(r.blocked, true);
  assert.equal(r.reason, 'blacklist');
});

test('黑名单命中 —— 大小写不敏感', () => {
  assert.equal(judge('ACMEAGENCY', cfg()).blocked, true);
  assert.equal(judge('acmeagency', cfg()).blocked, true);
});

test('黑名单命中 —— 空格敏感（在关键词规则关闭的场景下验证）', () => {
  const c = cfg({ keywordsEnabled: false });
  assert.equal(judge('Widget Staffing', c).blocked, true);
  assert.equal(judge('WidgetStaffing', c).blocked, false);
});

test('关键词命中', () => {
  const r = judge('Foo Recruitment', cfg());
  assert.equal(r.blocked, true);
  assert.equal(r.reason, 'keyword');
  assert.equal(r.matched, 'recruit');
});

test('日文关键词命中', () => {
  const r = judge('Foo人材紹介', cfg());
  assert.equal(r.blocked, true);
  assert.equal(r.reason, 'keyword');
  assert.equal(r.matched, '人材');
});

test('白名单优先级最高', () => {
  const r = judge('Sample Holdings', cfg());
  assert.equal(r.blocked, false);
  assert.equal(r.reason, 'whitelist');
});

test('关键词开关关闭 → 关键词规则失效，黑名单仍生效', () => {
  const c = cfg({ keywordsEnabled: false });
  assert.equal(judge('Foo Recruitment', c).blocked, false);
  assert.equal(judge('AcmeAgency', c).blocked, true);
});

test('未列出的公司不误伤', () => {
  assert.equal(judge('Some Product Company', cfg()).blocked, false);
  assert.equal(judge('Active Connector Inc.', cfg()).blocked, false);
  assert.equal(judge('ヘルスケアテクノロジーズ', cfg()).blocked, false);
});

test('空 / null / 无效输入不崩', () => {
  assert.equal(judge('', cfg()).blocked, false);
  assert.equal(judge(null, cfg()).blocked, false);
  assert.equal(judge(undefined, cfg()).blocked, false);
  assert.equal(judge('AcmeAgency', null).blocked, false);
  assert.equal(judge('AcmeAgency', {}).blocked, false);
});
