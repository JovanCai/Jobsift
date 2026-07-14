# 打包上传 Chrome Web Store

## 打包命令

在项目根目录跑：

```bash
zip -r job-feed-filter.zip \
  manifest.json \
  _locales/ \
  icons/ \
  src/ \
  options/ \
  popup/ \
  -x "*.DS_Store" -x "*/.*"
```

## 排除的文件

不打包进 zip 的内容（减小体积、避免开发资料泄露）：

- `docs/` — 本地设计文档
- `test/` — 单元测试和 DOM fixtures
- `tools/` — DOM 探测和图标生成脚本
- `.git/` — 版本控制
- `PACKAGING.md` — 本文件

## 上架清单

- [ ] 隐私政策 URL（`storage` 权限必需）。可以写在 GitHub Pages 或类似地方。基本要点：
  - 扩展只使用 `chrome.storage.sync` 存本地配置
  - 不采集、不上传任何数据
  - 不追踪用户
- [ ] 提交 zip
- [ ] 商品页 5 张截图（1280×800 或 640×400）
- [ ] 促销小图 440×280
- [ ] 商品简介（英文优先，日文/中文可选）
- [ ] 类目：Productivity
- [ ] 商店语言：至少 en，也可以加 zh-CN / ja（跟 `_locales` 对齐）

## 品牌 / 商标注意

- 扩展名、描述、图标里不出现 LinkedIn 品牌元素
- 描述里可以说 "Works on LinkedIn Jobs" 这种被公认的合理描述性使用
- 不要在 Web Store 标题里加 LinkedIn 字样，避免商标审查
