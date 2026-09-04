# dsh-wsl-encoding

> **套件安装：** 见 [dsh-wsl-kit](https://github.com/173787247/dsh-wsl-kit)。

工具 **`encoding_doctor`**：检查 chcp / UTF-8；可选 `path=` 抽样 CRLF（`/mnt/c` 上脚本常导致 `set: pipefail` 报错）。

[English → README.md](./README.md)

```sh
dsh plugin --profile web add github:173787247/dsh-wsl-encoding
# 例：encoding_doctor path=/mnt/c/.../restart-dsh-web.sh
npm test
```

MIT
