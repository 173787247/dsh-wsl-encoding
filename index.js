import { detectWsl } from "./lib/wsl-host.js";
import * as core from "./lib/encoding.js";

export const name = "dsh-wsl-encoding";
export const inject = ["tools", "systemPrompt"];

export function apply(ctx, config = {}) {
  const timeoutMs = positive(config.timeoutMs, 15_000);
  const wsl = detectWsl();

  ctx.systemPrompt.section({
    name: "tool:encoding_doctor",
    order: 122,
    text: "Use encoding_doctor for WSL/Windows interop: Diagnose UTF-8 vs Windows code-page issues for cmd/PowerShell.",
  });

  ctx.tools.register({
    name: "encoding_doctor",
    description: "Diagnose UTF-8 vs Windows code-page issues for cmd/PowerShell.",
    parameters: core.parameters(config),
    output: {
      schema: core.outputSchema(),
      render: (_args, value) => [{ type: "text", text: core.format(value) }],
    },
    timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args) {
      if (!wsl) return core.notWsl ? core.notWsl() : { ok: false, error: "not running in WSL" };
      return core.execute(args, config);
    },
    presentCall: () => ({ card: "generic", title: "encoding_doctor" }),
    presentResult: (_args, result) => (
      result.isError
        ? { card: "generic", title: "encoding_doctor failed", content: result.content }
        : { card: "generic", title: "encoding_doctor", content: result.content }
    ),
  });
}

function positive(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
