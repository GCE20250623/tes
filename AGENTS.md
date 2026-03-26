# 测试数据分析平台 V41 - 需求拆解文档

## 产品概述

- **产品类型**: 测试数据分析平台
- **场景类型**: prototype - app
- **目标用户**: 测试工程师、质量管理人员、数据分析人员
- **核心价值**: 专业的测试数据分析平台，支持CPK计算、故障分析、数据导入和报告生成
- **界面语言**: 中文
- **主题偏好**: 深色（深蓝/紫色系）
- **导航模式**: 路径导航
- **导航布局**: Sidebar

---

## 页面结构总览

| 页面名称 | 文件名 | 路由 | 页面类型 | 入口来源 |
|---------|-------|------|---------|---------|
| 数据仪表板 | `DashboardPage.tsx` | `/` | 一级 | 导航 |
| 数据导入 | `ImportPage.tsx` | `/import` | 一级 | 导航 |
| 测试数据管理 | `DataManagementPage.tsx` | `/data` | 一级 | 导航 |
| 故障分析 | `FaultAnalysisPage.tsx` | `/analysis` | 一级 | 导航 |
| 报告中心 | `ReportsPage.tsx` | `/reports` | 一级 | 导航 |

> **页面类型说明**：
> - **一级页面**：出现在侧边栏导航中，用户可直接访问
> - 本系统为功能型应用平台，暂无二三级页面需求

---

## 导航配置

- **导航布局**: Sidebar（左侧固定侧边栏）
- **导航项**（仅一级页面）:

| 导航文字 | 路由 | 图标 |
|---------|------|-----|
| 数据仪表板 | `/` | LayoutDashboard |
| 测试数据 | `/data` | Database |
| 故障分析 | `/analysis` | AlertTriangle |
| 报告中心 | `/reports` | FileText |
| 数据导入 | `/import` | Upload |

---

## 功能列表

### 页面: 数据仪表板 (`DashboardPage.tsx`)
- **页面目标**: 展示测试数据核心指标和可视化图表，提供全局概览
- **功能点**:
  - **CPK过程能力指数计算**: 自动计算并展示Cp、Cpk、Pp、Ppk四个核心指标
  - **测试趋势图**: 使用Recharts折线图展示测试数据的时间趋势变化
  - **FAIL分布饼图**: 使用Recharts饼图展示不同失败类型的占比分布
  - **FAIL步骤TOP5**: 使用Recharts横向条形图展示失败次数最多的前5个步骤
  - **测试直通率**: 展示整体测试通过率，计算方式为（通过数/总数）×100%

### 页面: 数据导入 (`ImportPage.tsx`)
- **页面目标**: 支持CSV/Excel文件上传和数据解析，提供导入预览功能
- **功能点**:
  - **CSV/Excel文件上传**: 支持拖拽或点击上传，文件格式验证
  - **Step列智能合并解析**: 自动识别并合并多行Step列数据，处理复杂测试步骤结构
  - **数据预览**: 上传后展示前10行数据预览，确认字段映射正确性
  - **字段映射**: 自动识别标准字段（如TestName、Step、Result、Value等），支持手动调整映射关系

### 页面: 测试数据管理 (`DataManagementPage.tsx`)
- **页面目标**: 提供测试数据的列表展示、搜索筛选和详情查看功能
- **功能点**:
  - **列表展示**: 表格形式展示所有测试用例，支持分页
  - **搜索筛选**: 按测试名称、结果状态（PASS/FAIL）、日期范围等条件筛选
  - **详情查看**: 点击行项查看单个测试用例的完整执行详情和所有步骤数据
  - **执行历史**: 展示同一测试用例的历史执行记录对比

### 页面: 故障分析 (`FaultAnalysisPage.tsx`)
- **页面目标**: 自动提取失败项，提供AI驱动的根因分析和解决方案建议
- **功能点**:
  - **FAIL项自动提取**: 自动从导入数据中识别并提取所有失败测试项
  - **严重程度分类**: 按规则将故障分为致命/严重/一般/提示四个等级（致命：系统崩溃；严重：核心功能失败；一般：非核心功能失败；提示：警告信息）
  - **AI根因分析建议**: 基于失败类型和上下文，模拟AI给出可能的根因分析和排查方向
  - **故障趋势追踪**: 展示故障出现频率的时间分布，识别高频问题

### 页面: 报告中心 (`ReportsPage.tsx`)
- **页面目标**: 生成和导出各类测试分析报告
- **功能点**:
  - **测试报告生成**: 一键生成包含统计摘要、图表和详细数据的完整测试报告
  - **故障分析报告**: 针对FAIL项生成专项分析报告，包含根因和修复建议
  - **报告预览**: 在线预览生成的报告内容，支持翻页浏览
  - **报告导出**: 支持导出为PDF或HTML格式，方便存档和分享

---

## 数据共享配置

| 存储键名 | 数据说明 | 使用页面 |
|---------|---------|---------|
| `__global_tdp_testCases` | 测试用例数据列表，类型为 `ITestCase[]` | 仪表板、数据管理、故障分析、报告中心 |
| `__global_tdp_faults` | 故障分析数据列表，类型为 `IFault[]` | 故障分析、报告中心 |
| `__global_tdp_reports` | 生成的报告数据列表，类型为 `IReport[]` | 报告中心 |

```typescript
interface ITestCase {
  id: string;
  testName: string;
  result: 'PASS' | 'FAIL' | 'SKIP';
  value?: number;
  lowerLimit?: number;
  upperLimit?: number;
  unit?: string;
  testTime: string;
  steps: ITestStep[];
  cpkData?: {
    cp: number;
    cpk: number;
    pp: number;
    ppk: number;
  };
}

interface ITestStep {
  stepNumber: number;
  stepName: string;
  result: 'PASS' | 'FAIL' | 'SKIP';
  value?: number;
  limit?: string;
}

interface IFault {
  id: string;
  testCaseId: string;
  testName: string;
  stepName: string;
  severity: 'fatal' | 'critical' | 'general' | 'hint';
  errorMessage: string;
  occurrenceTime: string;
  aiAnalysis?: {
    rootCause: string;
    suggestions: string[];
    confidence: number;
  };
}

interface IReport {
  id: string;
  title: string;
  type: 'test' | 'fault';
  createTime: string;
  content: any;
  status: 'draft' | 'completed';
}
```

---

## 技术规格补充

- **图表库**: Recharts（折线图、饼图、横向条形图）
- **CSV解析**: 支持Step列合并解析，处理多行数据合并为单条测试记录
- **AI功能**: 模拟AI分析，基于失败类型匹配预设的根因分析和解决方案建议库
- **数据处理**: CPK计算基于导入的数值测试数据，自动计算过程能力指数

-------

# UI 设计指南

> **场景类型**: `prototype - app`（应用架构设计 - 后台管理系统）
> **确认检查**: 本指南适用于测试数据分析平台，包含数据仪表板、数据导入、测试数据管理、故障分析、报告中心五大模块，采用 Sidebar 导航布局。

> ℹ️ Section 1-2 为设计意图与决策上下文。Code agent 实现时以 Section 3 及之后的具体参数为准。

## 1. Design Archetype (设计原型)

### 1.1 内容理解
- **目标用户**: 测试工程师、质量管理人员、数据分析人员（专业技术背景，注重效率与准确性）
- **核心目的**: 专业的测试数据分析平台，支持CPK计算、故障分析、数据导入和报告生成（数据驱动决策）
- **期望情绪**: 专业、专注、高效、数据可信、技术先进
- **需避免的感受**: 混乱、廉价感、不可靠、视觉疲劳

### 1.2 设计语言
- **Aesthetic Direction**: 深邃科技蓝紫基调，强调数据可视化的清晰度和专业感，营造高端实验室或数据中心的工作氛围
- **Visual Signature**: 
  1. 深蓝紫色渐变背景营造沉浸感
  2. 高对比度数据卡片（毛玻璃质感）
  3. 网格状纹理装饰强化数据感
  4. 等宽数字字体确保数据对齐
  5. 侧边栏导航图标采用线性风格保持轻盈
- **Emotional Tone**: 冷静精确（Cold Precision）— 深色背景减少眼部疲劳，高饱和度强调色突出关键指标，整体设计传递严谨的专业态度
- **Design Style**: **Grid 网格**（主）+ **Frosted Glass 毛玻璃**（辅）— 网格纹理强化数据/技术感，毛玻璃卡片增加现代层次感；深蓝紫色调符合用户要求的"深蓝/紫色系深色主题"
- **Application Type**: 后台管理系统（SaaS/工具类）

## 2. Design Principles (设计理念)

1. **数据优先**：所有设计决策服务于数据的可读性和可比性，图表、表格、KPI卡片必须清晰展示数据关系
2. **深度沉浸**：深色主题贯穿全局，减少界面干扰，让用户专注于数据分析任务
3. **层次分明的信息密度**：通过毛玻璃效果、阴影和边框建立清晰的视觉层级，区分导航区、内容区和数据展示区
4. **精确的交互反馈**：每个可交互元素（按钮、链接、表格行）必须有明确的 hover/active 状态，使用 accent 色提供即时视觉反馈
5. **技术美学**：等宽字体用于数值展示，网格纹理作为背景装饰，传递"精密仪器"般的专业感

## 3. Color System (色彩系统)

> 基于"深蓝/紫色系深色主题"要求自主生成配色方案，确保整体协调且符合数据可视化需求。
> **⚠️ App 场景配色规则**：App 子场景**禁止使用**共用预设配色方案库中的 7 个方案，必须根据产品定位自主设计完整配色体系。

**配色设计理由**：选择深蓝紫色系（H: 220-240）作为基底，营造专业沉稳的技术氛围；主色使用亮蓝紫色（H: 217）确保在深色背景上有足够的视觉冲击力，用于关键操作和图表高亮；整体低饱和度背景配合高饱和度强调色，符合数据可视化最佳实践。

### 3.1 主题颜色

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|-----|---------|----------------|--------|---------|
| bg | `--background` | `bg-background` | `hsl(222 47% 6%)` | 极深蓝黑，页面主背景，减少眼部疲劳 |
| surface | `--card` | `bg-card` | `hsl(222 47% 9%)` | 卡片背景，比 bg 稍亮，形成层次 |
| header | `--header` | `bg-[hsl(222_47%_11%)]` | `hsl(222 47% 11%)` | Sidebar 和 Topbar 背景，导航基底 |
| text | `--foreground` | `text-foreground` | `hsl(210 40% 98%)` | 主要文字，接近纯白，高对比度 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | `hsl(215 20% 60%)` | 次要文字，灰蓝色，用于描述和标签 |
| primary | `--primary` | `bg-primary` | `hsl(217 91% 60%)` | 主交互色，亮科技蓝，用于主按钮、激活态、图表主色 |
| primary-foreground | `--primary-foreground` | `text-primary-foreground` | `hsl(210 40% 98%)` | 主交互文字，白色 |
| accent | `--accent` | `bg-accent` | `hsl(222 47% 14%)` | 次级交互反馈色，hover/focus 背景，深灰蓝 |
| accent-foreground | `--accent-foreground` | `text-accent-foreground` | `hsl(210 40% 98%)` | accent 区域文字，白色 |
| border | `--border` | `border-border` | `hsl(222 47% 16%)` | 边框色，深蓝灰，低对比度分隔 |
| muted | `--muted` | `bg-muted` | `hsl(222 47% 12%)` | 静态非交互区域背景，禁用态、次级说明 |

> **Color Token 语义速查（供 code agent 参考）**:
> - `primary` → 主行动：主按钮填充、保存/提交操作、图表主色、关键指标高亮
> - `accent` → 状态反馈：Ghost/Outline 按钮 hover、Sidebar 菜单项 hover、Table 行 hover、DropdownMenu focus
> - `muted` → 静态非交互：禁用按钮背景、占位符文字、Skeleton 骨架屏、次级标签背景

### 3.2 Sidebar 颜色（Navigation Type = Sidebar）

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|-----|---------|----------------|--------|---------|
| sidebar | `--sidebar` | `bg-sidebar` | `hsl(222 47% 11%)` | 与 header 一致，导航基底 |
| sidebar-foreground | `--sidebar-foreground` | `text-sidebar-foreground` | `hsl(210 40% 98%)` | 导航文字，高对比度白色 |
| sidebar-primary | `--sidebar-primary` | `bg-sidebar-primary` | `hsl(217 91% 60%)` | 当前激活项背景，使用 primary 色 |
| sidebar-primary-foreground | `--sidebar-primary-foreground` | `text-sidebar-primary-foreground` | `hsl(210 40% 98%)` | 激活项文字，白色 |
| sidebar-accent | `--sidebar-accent` | `bg-sidebar-accent` | `hsl(222 47% 16%)` | Hover 态背景，比 sidebar 稍亮 |
| sidebar-accent-foreground | `--sidebar-accent-foreground` | `text-sidebar-accent-foreground` | `hsl(210 40% 98%)` | Hover 态文字，白色 |
| sidebar-border | `--sidebar-border` | `border-sidebar-border` | `hsl(222 47% 18%)` | Sidebar 内部分隔线，低对比度 |
| sidebar-ring | `--sidebar-ring` | `ring-sidebar-ring` | `hsl(217 91% 60%)` | 聚焦环，使用 primary 色 |

### 3.3 语义颜色（状态反馈）

> 用于表单验证、数据状态（涨跌、PASS/FAIL）、故障等级等

| 用途 | CSS 变量 | HSL 值 | 设计说明 |
|-----|---------|--------|---------|
| success / 上升 | `--success` | `hsl(142 71% 45%)` | 绿色，测试通过、数据上升、正常状态 |
| warning / 中风险 | `--warning` | `hsl(38 92% 50%)` | 橙黄色，警告、一般故障、提示信息 |
| error / 下降 / FAIL | `--error` | `hsl(0 84% 60%)` | 红色，测试失败、致命故障、数据下降 |
| info | `--info` | `hsl(217 91% 60%)` | 与 primary 一致，信息提示 |

**故障等级配色**：
- 致命 (fatal): `hsl(0 84% 60%)` 红色
- 严重 (critical): `hsl(25 95% 53%)` 橙色
- 一般 (general): `hsl(38 92% 50%)` 黄色
- 提示 (hint): `hsl(215 20% 65%)` 灰色

## 4. Typography (字体排版)

**字体选择理由**：测试数据分析平台需要同时兼顾专业感（标题）和数据可读性（正文与数值）。几何无衬线字体提供现代科技感，等宽数字字体确保表格和图表中的数值对齐。

- **Heading**: `Inter` + `system-ui, -apple-system, sans-serif` 回退
- **Body**: `Inter` + `system-ui, -apple-system, sans-serif` 回退  
- **数字/数据专用**: `JetBrains Mono` + `Consolas, monospace` 回退（等宽字体，确保表格对齐）

**字体导入**:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
```

**Tailwind 配置**:
```javascript
fontFamily: {
  sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
  mono: ['JetBrains Mono', 'Consolas', 'monospace'],
}
```

## 5. Global Layout Structure (全局布局结构)

### 5.1 页面结构（Sidebar Layout）

```html
<div class="min-h-screen bg-background flex">
  <!-- Sidebar: 固定宽度 64 (16rem/256px)，全高，独立滚动 -->
  <aside class="w-64 bg-sidebar border-r border-sidebar-border flex flex-col fixed h-screen">
    <!-- Logo区域 -->
    <div class="h-16 flex items-center px-6 border-b border-sidebar-border">
      <span class="text-lg font-bold text-sidebar-foreground">测试数据分析平台</span>
    </div>
    <!-- 导航菜单 -->
    <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
      <!-- 导航项: 默认 text-sidebar-foreground/70, hover:bg-sidebar-accent, active:bg-sidebar-primary -->
    </nav>
    <!-- 底部信息（可选） -->
    <div class="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/50">
      V41
    </div>
  </aside>

  <!-- 主内容区: 左侧偏移 64，剩余宽度自适应 -->
  <main class="flex-1 ml-64 min-h-screen bg-background">
    <!-- 可选 Topbar（本系统不需要，Sidebar 已足够） -->
    
    <!-- 页面内容容器 -->
    <div class="max-w-[1400px] mx-auto px-6 py-8">
      <!-- 页面标题区 -->
      <header class="mb-8">
        <h1 class="text-2xl font-bold text-foreground">页面标题</h1>
        <p class="text-muted-foreground mt-1">页面描述</p>
      </header>
      
      <!-- 内容区 -->
      <div class="space-y-6">
        <!-- 内容卡片/表格/图表 -->
      </div>
    </div>
  </main>
</div>
```

### 5.2 Page Content Zones (页面区块配置)

**Standard Content Zone（全页面统一）**:
- **Maximum Width**: `max-w-[1400px]`（数据密集应用，需要较宽展示空间）
- **Padding**: `px-6 py-8`（桌面端），`px-4 py-6`（移动端，但本系统主要为桌面端设计）
- **Alignment**: `mx-auto` 居中
- **Vertical Spacing**: `gap-6` / `space-y-6`（卡片间距），`space-y-8`（区块间距）

**Sidebar 尺寸**:
- **Width**: `w-64` (16rem / 256px)
- **Position**: `fixed left-0 top-0 h-screen`
- **Z-Index**: `z-40`

## 6. Visual Effects & Motion (视觉效果与动效)

- **Header/Hero 视觉方案**: 无独立 Hero 区域，页面标题区使用简洁排版（Mode E 纯排版风格）
- **装饰手法**: 
  - 背景纹理：body 背景叠加极淡的网格点阵纹理（CSS radial-gradient），透明度 0.03，营造"数据网格"感
  - 卡片装饰：KPI 卡片顶部 2px 渐变边框（primary 色到紫色），强化数据卡片识别度
- **圆角**: 
  - 卡片: `rounded-lg` (0.5rem)
  - 按钮: `rounded-md` (0.375rem)
  - 输入框: `rounded-md` (0.375rem)
  - Sidebar: `rounded-none`
- **阴影**: 
  - 卡片: `shadow-sm`（深色主题下阴影不明显，主要依靠边框和背景色区分层次）
  - 悬浮元素: `shadow-lg`（Modal、Dropdown）
- **复杂背景文字处理**: 本系统无复杂图片背景，主要为纯色背景，无需特殊处理
- **缓动函数**: `cubic-bezier(0.4, 0, 0.2, 1)`（标准 ease-out）
- **关键动效**:
  1. **Sidebar 菜单项 Hover**: `transition-colors duration-150`，背景色从 transparent 变为 sidebar-accent
  2. **卡片 Hover**: `transition-all duration-200`，边框色变为 primary/50，轻微上浮 `translate-y-[-1px]`（可选）
  3. **按钮 Hover**: `transition-colors duration-150`，背景色加深或透明度变化
  4. **数据加载**: Skeleton 骨架屏使用 `animate-pulse`，背景色为 muted

## 7. Components (组件指南)

> 必须引用 Color System 中的颜色角色，使用 Tailwind 语义化 class（如 `bg-primary`）
> 深色主题下，状态变化主要通过亮度/透明度调整，而非色相变化

### Buttons

**Primary Button**:
- 背景: `bg-primary`
- 文字: `text-primary-foreground`
- Hover: `bg-primary/90`（透明度降低）
- Active: `bg-primary/80`
- Disabled: `bg-primary/50 cursor-not-allowed`

**Secondary Button**:
- 背景: `bg-card`
- 边框: `border border-border`
- 文字: `text-foreground`
- Hover: `bg-accent`

**Ghost Button**:
- 背景: `transparent`
- 文字: `text-foreground`
- Hover: `bg-accent text-accent-foreground`

**Outline Button**:
- 背景: `transparent`
- 边框: `border border-border`
- Hover: `bg-accent`

### Form Elements

**Input / Select**:
- 背景: `bg-card`（或 `bg-background` 若嵌入卡片内）
- 边框: `border border-border`
- 文字: `text-foreground`
- Placeholder: `text-muted-foreground`
- Focus: `ring-2 ring-primary/20 border-primary`
- Disabled: `bg-muted text-muted-foreground cursor-not-allowed`

**Textarea**: 同 Input，高度自适应

### Cards

**标准卡片**:
- 背景: `bg-card`
- 边框: `border border-border`
- 圆角: `rounded-lg`
- 阴影: `shadow-sm`（可选，深色主题下可省略）
- 内边距: `p-6`

**KPI 指标卡片**（Dashboard 专用）:
- 顶部边框: `border-t-2 border-primary`（或对应语义色）
- 背景: `bg-card/50 backdrop-blur-sm`（毛玻璃效果）
- 数值字体: `font-mono text-2xl font-bold text-foreground`
- 标签字体: `text-sm text-muted-foreground`

### Tables

**数据表格**:
- 表头: `bg-muted text-muted-foreground text-xs font-medium uppercase tracking-wider`
- 表体行: `border-b border-border hover:bg-accent/50 transition-colors`
- 单元格: `py-3 px-4 text-sm text-foreground`
- 数值列: `font-mono text-right`（右对齐，等宽字体）

### Charts (Recharts 样式覆盖)

**通用图表样式**:
- 坐标轴文字: `fill: hsl(215 20% 60%)`（textMuted）
- 网格线: `stroke: hsl(222 47% 16%)`（border）
- Tooltip 背景: `bg-card border-border`（毛玻璃效果 `backdrop-blur`）

**折线图**:
- 线条颜色: `hsl(217 91% 60%)`（primary）
- 填充渐变: `from-primary/20 to-transparent`

**饼图/环形图**:
- 配色序列: primary → primary 色相偏移 +30° → +60° → +90°，或使用语义色（success/error/warning）

**横向条形图**:
- 条形颜色: `hsl(217 91% 60%)`（primary）
- 高亮条（TOP1）: `hsl(217 91% 70%)`（更亮）

### Menu / Dropdown

- 菜单背景: `bg-card border border-border shadow-lg rounded-md`
- 菜单项: `px-3 py-2 text-sm text-foreground hover:bg-accent cursor-pointer`
- 分割线: `border-t border-border my-1`

### Skeleton

- 背景: `bg-muted`
- 动画: `animate-pulse`
- 圆角: `rounded-md`

### Sidebar Navigation Items

- 默认: `flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground/70 rounded-md transition-colors`
- Hover: `bg-sidebar-accent text-sidebar-foreground`
- Active/Current: `bg-sidebar-primary text-sidebar-primary-foreground font-medium`
- 图标: `w-5 h-5`（Lucide icons）

## 8. Flexibility Note (灵活性说明)

> **一致性优先原则**：多页应用（MPA）中，所有页面必须使用相同的核心参数（最大宽度、容器边距、圆角、阴影等），确保整体设计语言统一。
>
> **允许的微调范围**（code agent 可自行判断）：
> - 响应式断点适配（本系统主要为桌面端，但移动端应保证基本可用性）
> - 页面内部的局部间距（如表格行高、卡片内边距根据内容微调）
> - Dashboard 页面的图表尺寸根据数据量自适应（见下方详细规则）
> - 表单页面的最大宽度可限制为 `max-w-2xl` 以优化阅读体验（在 Standard Content Zone 内嵌套）
>
> **禁止的随意变更**：
> - ❌ 不同页面使用不同的最大宽度（所有页面必须使用 `max-w-[1400px]` 作为内容区上限）
> - ❌ 不同页面使用不同的圆角/阴影风格（全局统一 `rounded-lg` 卡片圆角）
> - ❌ 不同页面使用不同的主色调（全局统一 `hsl(217 91% 60%)` 为主色）

## 9. Signature & Constraints (设计签名与禁区)

### DO (视觉签名)
1. **深蓝紫基底**: Body 背景使用 `hsl(222 47% 6%)`，所有页面统一
2. **毛玻璃数据卡片**: KPI 卡片使用 `bg-card/50 backdrop-blur-sm`，顶部 2px primary 色边框线
3. **等宽数字**: 所有数值数据（CPK指标、测试值、统计数字）必须使用 `font-mono` 确保对齐
4. **网格纹理背景**: Body 背景叠加 `radial-gradient(circle, hsl(217 91% 60% / 0.03) 1px, transparent 1px)`，size 24px，营造数据感
5. **Sidebar 激活态高亮**: 当前页面导航项使用 `bg-primary` 背景，白色文字，圆角 `rounded-md`

### DON'T (禁止做法)
> 通用约束参见「通用约束」。以下为 Prototype 特有：
- ❌ 使用浅色主题（用户明确要求深色深蓝/紫色系）
- ❌ 在 Dashboard 页面添加 Sidebar 以外的导航（如顶部 Tab 切换）
- ❌ 使用彩虹色或多色系图表配色（保持蓝紫色调统一，仅使用语义色区分状态）
- ❌ 表格中使用 sans-serif 字体展示数值（必须用 mono 等宽字体）
- ❌ 卡片使用大阴影（深色主题下使用边框和背景色区分层次，阴影仅用于悬浮元素）