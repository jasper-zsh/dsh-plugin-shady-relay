# dsh-plugin-shady-relay

DeepSeek Harness 静态插件：通过 GUI 创建虚拟模型。每个虚拟模型映射到 Harness 中已经注册的真实 `provider/model`，并在每次请求的 system prompt 最前加入用户配置的固定内容。

## GUI 配置

插件挂载后，刷新 Web GUI 一次，然后打开：

```text
设置 → 虚拟模型
```

页面支持：

- 添加、修改和删除虚拟模型映射；
- 从当前 Harness 模型目录选择目标 Provider 和目标模型，也允许手工输入未列出的动态模型 ID；
- 配置虚拟模型 ID、显示名称、描述和固定 System Prompt；
- 保存后立即更新模型目录和后续请求，无需重启；
- 放弃未保存修改，或恢复 profile 中声明的基础配置。

GUI 数据持久化在 `shady-relay` settings namespace。Host schema 会再次校验重复 ID、空字段、路由冲突和直接递归，浏览器校验不是安全边界。

## Profile 配置

最小挂载行：

```yaml
- insert:
    - id: shady-relay
      name: dsh-plugin-shady-relay
```

也可以在 composition 中提供部署基础值；GUI 保存的用户层覆盖基础值：

```yaml
- insert:
    - id: shady-relay
      name: dsh-plugin-shady-relay
      config:
        provider: shady-relay
        displayName: Prompted Models
        models:
          - id: strict-reviewer
            name: Strict Reviewer
            description: 先审查再回答
            targetProvider: deepseek-official
            targetModel: deepseek-v4-flash
            systemPrompt: |-
              在回答任何问题前，先严格检查事实、边界条件和潜在风险。
```

完整配置类型：

```ts
interface Config {
  provider?: string       // 默认 "shady-relay"
  displayName?: string    // 默认 "Shady Relay"
  models?: Array<{
    id: string
    name?: string
    description?: string
    targetProvider: string
    targetModel: string
    systemPrompt: string
  }>
}
```

## System prompt 语义

假设固定内容为 `固定指令`，Harness 组装的原 system prompt 为 `Harness 内容`，真实模型收到：

```text
固定指令

Harness 内容
```

原请求没有 system prompt 时，真实模型只收到固定内容。插件创建新的转发请求，不修改 Harness 冻结的原请求对象。

## 约束和行为

- 同一实例的虚拟模型 `id` 不能重复。
- `targetProvider` 不能等于虚拟 provider，避免直接递归。
- 固定 System Prompt 不能只包含空白。
- 改写 provider 路由时不能占用其他适配器或 configurable-provider directory 已拥有的路由。
- 目标 provider 在实际请求发生时必须已注册。
- 真实模型的上下文窗口、输入模态和推理等级由虚拟模型解析时继承。
- 转发会再次进入 Harness `llm/stream` seam，因此观察器可能同时看到外层虚拟路由和内层真实路由。

## 安装与 HMR

```bash
pnpm install
pnpm check

dsh plugin --profile web add /absolute/path/to/dsh-plugin-shady-relay
```

把仓库 realpath（或至少 `lib/` realpath）加入目标 profile 的 `hmr.config.root`，然后启动构建 watcher：

```bash
pnpm dev
```

构建产物：

- `lib/index.js`：Host adapter、Settings namespace 和模型目录注册；
- `lib/client.js`：Web 设置页 lazy-CJS bundle；
- `lib/client.js.map`：Client sourcemap。

首次新增 Client entry 后需刷新当前 GUI 一次。此后 Host 和 Client bundle 修改均可热替换。

## 开发检查

```bash
pnpm typecheck
pnpm build
pnpm test
# 或
pnpm check
```
