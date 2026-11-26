# dsh-voice-anywhere

在 DSH 里把官方语音输入按钮搬到**任意自己声明的输入框**旁边。

官方对话输入框始终由官方插件负责，本插件不接管、不修改、也无法关闭它——那是官方逻辑。

## 哪些位置自动可用

| 位置 | 行为 |
|---|---|
| 提问卡片 | 停靠在页脚「跳过/提交」左侧，避开页码 |
| 弹窗（如重命名会话） | 有底部按钮行时停靠在按钮行左侧、向左生长；没有则贴在字段旁 |
| 快捷键参考页（`data-shortcut-modal="shortcuts"`） | 贴字段，录音时接管该字段宽度 |
| 官方对话输入框 | **不接管**（官方自带麦克风） |

其余位置**默认不出现**，必须显式注册（见下）。

设置面板（`data-shortcut-modal="settings"`）、账户/平台浮层（`platform`）以及设置面板打开期间出现的其它弹窗，一律不出现麦克风。

## 注册方式一：属性标记（推荐）

给输入框本身，或它的任意祖先，加上 `data-voice-input` 即可：

```html
<input data-voice-input placeholder="搜索会话" />
```

```html
<div data-voice-input>
  <input placeholder="这个输入框也会获得麦克风" />
</div>
```

属性标记与界面语言无关，重命名 DOM 也不受影响，是给其它插件用的首选方式。

## 注册方式二：配置文件

配置文件位于**当前 profile** 的工作目录，插件首次加载时自动创建：

```
~/.dsh/profiles/<profile>/voice-anywhere/config.json
```

例如 Web 版本就是 `~/.dsh/profiles/web/voice-anywhere/config.json`。

```json
{
  "allow": [
    "input[aria-label='搜索会话']",
    "#some-panel textarea",
    "[data-some-card] input"
  ],
  "disable": ["dialog"]
}
```

- `allow`：CSS 选择器列表。命中输入框本身**或它的任一祖先**即生效；写法错误的选择器会被忽略，不会影响其它输入框。
- `disable`：关闭内置位置，可选值为 `question-card`、`dialog`、`shortcuts`。官方对话输入框不在可关闭范围内。
- 修改文件后**刷新页面**即可生效，无需重新构建或重启。

## 自定义触发键

官方快捷键在部分环境里只放行很少的组合（例如当前 Web 客户端在 Linux 上只有 `Ctrl+/`、`Ctrl+Shift+,`、`Ctrl+Shift+.` 三组）。想要别的组合、鼠标侧键或媒体键，用配置文件里的 `triggers`：

```json
{
  "triggers": ["Ctrl+Shift+Space", "Mouse:Back", "MediaPlayPause"],
  "submit": ["Ctrl+Shift+Enter", "Mouse:Forward"]
}
```

- `triggers`：开始/停止录音；
- `submit`：**等同按回车**——向当前输入框派发一次 `Enter`，把内容提交出去（提问卡片、重命名、对话框、对话输入框都适用）；录音进行中不动作。

两者都是**任意可捕获的键**：键盘组合、鼠标侧键、媒体键，遥控器编程后发出的键也能用。页面里点「录制按键」直接捕获即可。

- 写法：`修饰键+键`（`Ctrl` / `Alt` / `Shift` / `Meta`）、`Mouse:Back` / `Mouse:Forward`、`MediaPlayPause` 这类媒体键名；
- 单独的字母、数字会被忽略（否则打字就会触发）；`F1–F24` 与媒体键可以不带修饰键；
- 与官方快捷键**并存**：录音中按下，两者都是"停止"。

「设置」里默认有一页「语音输入」；把 `settingsPage` 写成 `false` 可以彻底不显示它。页面里点「录制按键」直接按键录入、删除已有触发键。页面里的改动保存在客户端本地存储，配置文件里的 `triggers` 只作为初始值。

页面内点「关闭此设置页」会隐藏该页；**再次显示需要修改配置文件**（任意改动都会更新 revision），或清除客户端本地存储里的 `dsh.voice-anywhere.settings-closed:<profile>`。

注意：

- 被运行环境先占用的组合（`Ctrl+T/W/N`、`Ctrl+Tab`、`F11`、`F12` 等）到不了页面，配了也不会触发；
- 触发器命中时会 `preventDefault + stopPropagation`，意味着**该组合在页面内不再传给其它处理者**（终端、编辑器、官方快捷键）；这是有意为之，否则一次按键会同时触发两套逻辑；
- 页面里删掉全部触发键后会保存一个空列表，配置文件里的 `triggers` 从此不再生效——想回到配置值，清除客户端本地存储里的 `dsh.voice-anywhere.triggers`。

## 定位规则

插件按以下条件识别输入框，不使用 id 或类名：

- `<input>` 且 `type` 为 `text`、`search`、`url`、`tel`、`email`；
- `<textarea>`；
- `contenteditable` 编辑器的根节点；
- 排除 `disabled`、`readOnly`、隐藏或尺寸过小的元素；
- 官方对话输入框内部一律排除。

## 交互

- 点击麦克风开始录音，再点停止键转写；
- 文本**追加**到字段末尾，不在光标处插入，因此不会覆盖弹窗里已有的内容；
- 录音期间普通输入框的文字与占位符会暂时隐藏，停止后恢复；
- 快捷键命令「任意输入框语音输入」默认不绑定键位，在「设置 → 快捷键」里自行设置；录音中按下它会停止录音。

## 配置文件失效时

文件缺失、不可解析、或宿主未提供配置路由时，`allow` 视为空：所有未标记的普通输入框都不出现麦克风，内置位置不受影响。

## 开发

```bash
npm install          # 只装 devDependencies（typescript）
npm run build        # 产出 client.js（内联官方组件与样式，并写入源码哈希）
npm run typecheck    # tsc --noEmit，0 错误
npm test             # 逐个跑 tests/*.test.mjs
npm run check-build  # 校验 client.js 与源码一致（防止改了没重建）
npm run verify       # 以上三项串起来，CI 跑的就是它
```

### 结构

| 路径 | 职责 |
|---|---|
| `index.js`、`host/config.mjs` | 宿主半边：profile 工作目录、配置路由、revision |
| `src/client.ts` | 装配：locale、样式、槽位、快捷键、触发器、设置页 |
| `src/face.ts` | 交给官方组件的注入面（录音、转写、导航） |
| `src/locales.ts` | 命令名与设置页文案（扁平键） |
| `src/diagnostics.ts` | `window.__voiceAnywhere` 的唯一写入点 |
| `src/config.ts` | 配置类型、解析、拉取 |
| `src/storage.ts` | 本地存储（带版本，迁移旧的裸数组） |
| `src/policy.ts` | 谁可见 |
| `src/surfaces.ts` | 表面识别与聚焦解析 |
| `src/placement.ts` | 几何：停靠与字段布局 |
| `src/activate.ts` | 唯一的“录音中=停 / 否则开录”决策 |
| `src/floating/use-surface-control.ts` | 控件的状态与同步 |
| `src/floating/view.ts` | 只负责渲染 portal |
| `src/settings/section.ts`、`styles.ts` | 设置页的行为与排版 |
| `src/trigger/expression.ts` | 触发器表达式的解析与匹配（纯函数） |
| `src/trigger/engine.ts` | 捕获阶段的键盘/鼠标监听 |
| `src/targets.ts`、`src/controls.ts`、`src/speech.ts`、`src/recording.ts` | 输入框识别与写入、控件状态契约、语音服务、录音 |
