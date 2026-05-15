# trae-claude-terminal

一键打开 Claude Code 终端，支持终端会话持久化（关闭 VS Code 后自动恢复）。

## 使用

点击编辑器右上角的 ✨ 按钮，自动创建终端并执行 Claude Code。

## 配置

打开设置（`Ctrl+,`），搜索 `trae-claude-terminal.command`，修改终端启动时执行的命令。默认值为 `claude`。

示例：

```json
{
  "trae-claude-terminal.command": "claude --model opus"
}
```

## 开发

```bash
npm install
npm run compile
npx vsce package
```

## 许可证

MIT
