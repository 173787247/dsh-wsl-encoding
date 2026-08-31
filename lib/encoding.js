import { runPowerShell, runCmd } from "./wsl-host.js";

export function notWsl() {
  return { ok: false, error: "not running in WSL" };
}

export function parameters() {
  return { type: "object", additionalProperties: false, properties: {} };
}

export function outputSchema() {
  return { type: "object", additionalProperties: true };
}

export function format(v) {
  const lines = [`encoding_doctor ok=${v.ok}`];
  lines.push(`powershell OutputEncoding: ${v.psOutputEncoding}`);
  lines.push(`cmd chcp: ${v.chcp}`);
  lines.push(`LANG: ${v.lang}`);
  for (const a of v.advice || []) lines.push(`- ${a}`);
  return lines.join("\n");
}

export async function execute() {
  let psOutputEncoding = "";
  let chcp = "";
  try {
    const { stdout } = await runPowerShell("[Console]::OutputEncoding.WebName", { timeoutMs: 10_000 });
    psOutputEncoding = stdout.trim();
  } catch (err) {
    psOutputEncoding = err.message;
  }
  try {
    const { stdout } = await runCmd(["/c", "chcp"], { timeoutMs: 10_000 });
    chcp = stdout.trim();
  } catch (err) {
    chcp = err.message;
  }
  const lang = process.env.LANG || process.env.LC_ALL || "";
  const advice = [
    "Prefer UTF-8: chcp 65001 in cmd, and [Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8 in PowerShell bridges.",
    "Pass paths via wslpath rather than embedding Chinese in fragile code pages when possible.",
  ];
  return { ok: true, psOutputEncoding, chcp, lang, advice };
}
