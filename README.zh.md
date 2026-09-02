# dsh-wsl-encoding
> **套件安装：** 见 [dsh-wsl-kit](https://github.com/173787247/dsh-wsl-kit)。推荐 `KIT_SET=daily` | `llm` | `github` | `full`。故障树：[TROUBLESHOOTING.zh.md](https://github.com/173787247/dsh-wsl-kit/blob/master/docs/TROUBLESHOOTING.zh.md)。


DeepSeek Harness 插件：诊断 cmd/PowerShell 桥接时的 UTF-8 与 Windows 代码页问题。

配套 **[dsh-wsl-kit](https://github.com/173787247/dsh-wsl-kit)**。

[English → README.md](./README.md)

## 安装

```sh
dsh plugin --profile web add github:173787247/dsh-wsl-encoding
```

重启 `dsh web` 并开**新**会话。工具名：`encoding_doctor`。

## 许可

MIT
