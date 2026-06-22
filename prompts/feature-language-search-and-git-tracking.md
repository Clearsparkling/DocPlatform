# DocPlatform 功能开发 Prompt：语义检索 & Git 追踪

> **项目名称**：DocPlatform（云端文档仓库）
> **技术栈**：Bun + Elysia（后端） / Vue 3 + TypeScript + Element Plus + Pinia（前端） / SQLite（bun:sqlite）
> **创建日期**：2026-06-22

---

## 一、项目背景

DocPlatform 是一个云端文档管理平台，核心理念为"万物皆可 Markdown"。用户可上传 Word、Excel、PPT、PDF、HTML、图片等多种格式文件，系统将其转换为 Markdown 并在线渲染和编辑。

### 现有架构概要

```
backend/src/index.ts        ← 单文件后端，所有路由定义在此（Elysia 框架）
backend/src/db/             ← SQLite 数据库层（bun:sqlite）
backend/src/data/           ← 数据接口与种子数据
backend/src/types/          ← TypeScript 类型定义

src/components/             ← Vue 3 组件（Home / Login / MarkdownText / Compile / UpLoad 等）
src/stores/userStore.ts     ← Pinia 状态管理（token / username / compileDocId）
src/utils/                  ← Axios 请求工具
src/router/index.ts         ← Vue Router 路由配置（含 beforeEach 鉴权守卫）
```

### 现有数据库表结构

```sql
-- 用户表
CREATE TABLE users (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT    UNIQUE NOT NULL,
  password  TEXT    NOT NULL,
  createdAt TEXT    DEFAULT (datetime('now'))
);

-- 文档表
CREATE TABLE documents (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  userId       INTEGER NOT NULL,
  title        TEXT    NOT NULL,
  filename     TEXT    NOT NULL,
  content      TEXT    NOT NULL,       -- Markdown 内容
  originalType TEXT,                   -- 原始文件扩展名
  createdAt    TEXT    DEFAULT (datetime('now'))
);
```

### 现有 API 路由

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/auth/register` | 用户注册 | 无 |
| POST | `/auth/login` | 用户登录，返回 JWT | 无 |
| GET | `/auth/me` | 获取当前用户信息 | JWT |
| POST | `/documents/upload` | 上传文件（multipart/form-data） | JWT |
| GET | `/documents` | 获取当前用户文档列表 | JWT |
| GET | `/documents/:id` | 获取单个文档 | JWT |
| PUT | `/documents/:id` | 更新文档内容 | JWT |
| DELETE | `/documents/:id` | 删除文档 | JWT |

---

## 二、需求描述

请为 DocPlatform 实现以下两大功能模块：

### 功能 A：多语言语义检索文档内容

#### 目标

用户可以通过自然语言（支持中文、英文等多语言）搜索已上传文档的内容。系统对文档内容建立索引，支持关键词搜索和语义模糊匹配，返回相关文档列表并高亮匹配片段。

#### 功能要求

1. **全文索引**
   - 文档上传或更新时，自动对其 `content` 字段建立全文检索索引
   - 利用 SQLite 的 FTS5（Full-Text Search 5）扩展实现，避免引入外部搜索引擎依赖
   - 索引应支持中文分词（可使用 SQLite 的 `unicode61` tokenizer 或集成 `jieba` 等分词方案）

2. **搜索 API**
   - 新增 `GET /documents/search?q=<keyword>&lang=<lang>&page=1&pageSize=20`
   - 参数：
     - `q`：搜索关键词（必填）
     - `lang`：语言偏好，`zh` / `en` / `auto`（可选，默认 `auto`）
     - `page` / `pageSize`：分页参数
   - 返回结果包含：
     - 匹配的文档列表（id, title, filename, originalType, createdAt）
     - 每个文档的 **高亮摘要片段**（snippet），匹配词用 `<mark>` 标签包裹
     - 总匹配数量（用于前端分页）

3. **前端搜索界面**
   - 在 `MarkdownText.vue` 的文档列表侧边栏顶部增加搜索输入框
   - 使用 Element Plus 的 `<el-input>` 组件，带搜索图标和防抖（300ms）
   - 搜索结果实时展示在侧边栏，替代默认文档列表
   - 支持清空搜索恢复原始列表
   - 搜索无结果时显示空状态提示

4. **多语言支持**
   - 搜索时自动检测输入语言或由用户手动选择
   - 中文使用字符级分词，英文使用词级分词
   - 搜索结果按相关性排序（BM25 算法）

#### 技术约束

- 使用 SQLite FTS5，不引入 Elasticsearch、Meilisearch 等外部服务
- 中文分词方案优先使用轻量级实现（如在 Bun 中调用 `nodejieba` 或基于 Unicode 规则的简单分词）
- FTS 索引表应与主文档表保持同步（INSERT/UPDATE/DELETE 时同步更新）

---

### 功能 B：Git 追踪文件修改和提交记录

#### 目标

为每个文档维护一个版本历史系统，记录每次修改的内容差异（diff）、修改时间和修改者。用户可以查看文档的历史版本、对比不同版本之间的差异、并回滚到任意历史版本。

#### 功能要求

1. **版本记录数据模型**
   - 新增 `document_versions` 表：
     ```sql
     CREATE TABLE document_versions (
       id           INTEGER PRIMARY KEY AUTOINCREMENT,
       documentId   INTEGER NOT NULL,
       userId       INTEGER NOT NULL,
       content      TEXT    NOT NULL,       -- 该版本的完整内容
       commitMessage TEXT,                  -- 修改说明（可选）
       diffPatch    TEXT,                   -- 与上一版本的 unified diff
       versionNum   INTEGER NOT NULL,       -- 版本号，自增
       createdAt    TEXT    DEFAULT (datetime('now')),
       FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE,
       FOREIGN KEY (userId) REFERENCES users(id)
     );
     ```
   - 新增 `document_tags` 表（可选，用于标记重要版本）：
     ```sql
     CREATE TABLE document_tags (
       id         INTEGER PRIMARY KEY AUTOINCREMENT,
       versionId  INTEGER NOT NULL,
       tagName    TEXT    NOT NULL,          -- 如 "v1.0", "初始版本"
       createdAt  TEXT    DEFAULT (datetime('now')),
       FOREIGN KEY (versionId) REFERENCES document_versions(id) ON DELETE CASCADE
     );
     ```

2. **版本管理 API**

   | 方法 | 路径 | 说明 |
   |------|------|------|
   | GET | `/documents/:id/versions` | 获取文档的版本历史列表（分页） |
   | GET | `/documents/:id/versions/:versionId` | 获取指定版本的完整内容 |
   | GET | `/documents/:id/versions/:versionId/diff` | 获取指定版本与前一版本的 diff |
   | GET | `/documents/:id/versions/compare?v1=<id>&v2=<id>` | 对比任意两个版本的差异 |
   | POST | `/documents/:id/versions/:versionId/rollback` | 回滚到指定版本（创建新版本） |
   | POST | `/documents/:id/versions/:versionId/tag` | 为版本添加标签 |

   **版本自动创建逻辑**：
   - 当用户通过 `PUT /documents/:id` 更新文档时，自动创建新版本记录
   - 计算新旧内容的 unified diff 并存储到 `diffPatch` 字段
   - 如果内容无变化，跳过版本创建

3. **Diff 计算**
   - 使用 `diff` 库（如 `diff` npm 包）生成 unified diff 格式
   - 后端在版本创建时计算并持久化 diff，避免前端重复计算

4. **前端版本历史界面**
   - 在 `MarkdownText.vue` 或 `Compile.vue` 中增加"版本历史"入口按钮
   - 新增独立组件 `VersionHistory.vue`：
     - 左侧：版本时间线列表（时间、版本号、修改说明、操作按钮）
     - 右侧：选中版本的 diff 渲染（使用 `diff2html` 或类似库可视化展示）
     - 支持"查看完整内容"和"回滚到此版本"操作
   - 使用 Element Plus 组件：
     - `<el-timeline>` 展示版本时间线
     - `<el-dialog>` 展示 diff 详情
     - `<el-tag>` 展示版本标签
     - `<el-button>` 操作按钮（查看、回滚、打标签）

5. **回滚机制**
   - 回滚操作创建一个新版本（而非覆盖当前版本），确保历史完整性
   - 回滚后自动刷新文档内容和版本列表
   - 回滚前弹出确认对话框

#### 技术约束

- Diff 计算在后端完成，前端仅负责渲染
- 版本记录与文档使用外键关联，文档删除时级联删除版本
- 使用 `bun:sqlite` 的事务确保版本创建与文档更新的原子性

---

## 三、实现规范

### 代码风格

- 后端 TypeScript 使用 Elysia 框架风格，路由定义在 `backend/src/index.ts` 中（或按需拆分）
- 前端 Vue 3 使用 `<script setup lang="ts">` 语法
- 使用 Element Plus 组件库，保持现有 UI 风格统一
- Pinia store 管理全局状态，Axios 封装 API 调用

### 目录结构建议

```
backend/src/
├── index.ts                    ← 现有路由（需修改：更新文档时触发版本创建）
├── routes/
│   ├── search.ts               ← 新增：搜索相关路由
│   └── versions.ts             ← 新增：版本管理相关路由
├── services/
│   ├── searchService.ts        ← 新增：FTS 索引与搜索逻辑
│   └── versionService.ts       ← 新增：版本管理与 diff 计算逻辑
├── db/
│   ├── schema.ts               ← 修改：新增表定义
│   └── migrations.ts           ← 新增：数据库迁移脚本
└── ...

src/components/
├── MarkdownText.vue            ← 修改：增加搜索框
├── Compile.vue                 ← 修改：增加版本历史入口
├── SearchResults.vue           ← 新增：搜索结果列表组件
├── VersionHistory.vue          ← 新增：版本历史面板组件
├── DiffViewer.vue              ← 新增：Diff 可视化组件
└── ...
```

### 新增依赖

**后端（backend/package.json）**：
- `diff` — 计算文本 unified diff

**前端（package.json）**：
- `diff2html` — 将 unified diff 渲染为 HTML 可视化

### API 响应格式

所有新增 API 应遵循现有响应格式：

```json
// 成功
{
  "success": true,
  "data": { ... }
}

// 错误
{
  "success": false,
  "error": "错误描述"
}
```

---

## 四、验收标准

### 功能 A 验收

- [ ] 上传中文和英文文档后，可通过关键词搜索到对应文档
- [ ] 搜索结果包含高亮摘要片段
- [ ] 搜索输入带防抖，不造成频繁请求
- [ ] 清空搜索框后恢复原始文档列表
- [ ] 无结果时显示友好的空状态
- [ ] FTS 索引与文档表保持同步（增删改文档后索引自动更新）

### 功能 B 验收

- [ ] 编辑并保存文档后，自动生成新版本记录
- [ ] 内容无变化时不创建重复版本
- [ ] 版本历史列表按时间倒序展示
- [ ] 可查看任意版本与前一版本的 diff
- [ ] 可对比任意两个版本之间的差异
- [ ] 回滚操作创建新版本，不破坏历史记录
- [ ] 可为重要版本打标签
- [ ] 文档删除时级联删除所有版本记录

---

## 五、注意事项

1. **SQLite FTS5 中文支持**：Bun 的 SQLite 绑定默认可能不包含中文分词 tokenizer。如果 `unicode61` 分词效果不佳，考虑以下方案：
   - 在应用层预分词后存入 FTS 表（将中文文本按字符/词组拆分后用空格连接）
   - 使用 `simple` tokenizer 配合自定义分词函数

2. **性能考量**：文档内容可能较大，diff 计算和 FTS 索引应在后台异步处理，避免阻塞 API 响应。

3. **向后兼容**：数据库表结构变更应使用迁移脚本，确保已有数据不丢失。

4. **错误处理**：版本创建失败不应影响文档保存操作；搜索服务不可用时应优雅降级。
