# trae-claude-terminal

一键打开 Claude Code 终端的 VS Code 扩展，支持终端会话持久化。

## 安装

从 `.vsix` 文件安装：

```
code --install-extension trae-claude-terminal/trae-claude-terminal-0.1.0.vsix
```

或在 VS Code 扩展面板选择"从 VSIX 安装"。

## 使用

点击编辑器右上角的 ✨ 按钮，自动创建终端并执行启动命令。

## 配置

打开设置（`Ctrl+,`），搜索 `trae-claude-terminal.command`，修改终端启动时执行的命令。默认值为 `claude`。

```json
{
  "trae-claude-terminal.command": "claude --model opus"
}
```

## 开发

```bash
cd trae-claude-terminal
npm install
npm run compile
npx vsce package
```
