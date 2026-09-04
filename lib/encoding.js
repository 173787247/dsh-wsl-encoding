import { readFileSync } from "node:fs";
import { runPowerShell, runCmd } from "./wsl-host.js";

export function notWsl() {
  return { ok: false, error: "not running in WSL", advice: [] };
}

export function parameters() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      path: {
        type: "string",
        description: "Optional file to sample for CRLF (e.g. a .sh under /mnt/c).",
      },
    },
  };
}

export function outputSchema() {
  return { type: "object", additionalProperties: true };
}

export function format(v) {
  const lines = [`encoding_doctor ok=${v.ok}`];
  lines.push(`powershell OutputEncoding: ${v.psOutputEncoding || "?"}`);
  lines.push(`cmd chcp: ${v.chcp || "?"}`);
  if (v.codePage != null) lines.push(`codePage: ${v.codePage}`);
  lines.push(`utf8Console: ${v.utf8Console}`);
  lines.push(`LANG: ${v.lang || "(empty)"}`);
  if (v.samplePath) {
    lines.push(`sample: ${v.samplePath} crlf=${v.sampleCrlf} lfOnly=${v.sampleLfOnly}`);
  }
  for (const a of v.advice || []) lines.push(`- ${a}`);
  return lines.join("\n");
}

/** Parse `Active code page: 65001` style chcp output. */
export function parseChcp(text) {
  const m = String(text || "").match(/(\d{3,5})/);
  return m ? Number(m[1]) : null;
}

export function isUtf8Console(codePage, psWebName) {
  if (codePage === 65001) return true;
  const name = String(psWebName || "").toLowerCase();
  return name === "utf-8" || name === "utf8";
}

/**
 * Sample a file for CRLF vs LF. Returns null fields when unreadable.
 */
export function sampleLineEndings(filePath, { readFile = readFileSync, maxBytes = 8192 } = {}) {
  if (!filePath) {
    return { samplePath: "", sampleCrlf: false, sampleLfOnly: false, sampleError: "" };
  }
  try {
    const buf = readFile(filePath);
    const slice = Buffer.isBuffer(buf) ? buf.subarray(0, maxBytes) : Buffer.from(String(buf)).subarray(0, maxBytes);
    const text = slice.toString("binary");
    const hasCrLf = text.includes("\r\n");
    const hasLf = text.includes("\n");
    const crlf = hasCrLf;
    const lfOnly = hasLf && !hasCrLf && !text.includes("\r");
    return {
      samplePath: filePath,
      sampleCrlf: crlf,
      sampleLfOnly: lfOnly,
      sampleError: "",
    };
  } catch (err) {
    return {
      samplePath: filePath,
      sampleCrlf: false,
      sampleLfOnly: false,
      sampleError: err instanceof Error ? err.message : String(err),
    };
  }
}

export function buildEncodingAdvice({
  utf8Console,
  codePage,
  lang,
  sampleCrlf,
  samplePath,
  sampleError,
} = {}) {
  const tips = [];
  if (!utf8Console) {
    tips.push(
      `Console is not UTF-8 (chcp=${codePage ?? "?"}). Prefer chcp 65001 and [Console]::OutputEncoding = [Text.UTF8Encoding]::UTF8 before bridging Chinese paths.`,
    );
  } else {
    tips.push("Console looks UTF-8-capable (chcp 65001 and/or PowerShell utf-8).");
  }
  if (lang && !/utf-?8/i.test(lang)) {
    tips.push(`WSL LANG=${lang} is not UTF-8 — export LANG=C.UTF-8 (or en_US.UTF-8) in the shell that starts dsh.`);
  }
  if (sampleError) {
    tips.push(`Could not sample ${samplePath}: ${sampleError}`);
  } else if (samplePath && sampleCrlf) {
    tips.push(
      `${samplePath} contains CRLF. Bash in WSL will mis-parse shebangs / set -o pipefail — run sed -i 's/\\r$//' or dos2unix on scripts under /mnt/c.`,
    );
  } else if (samplePath && !sampleCrlf) {
    tips.push(`${samplePath}: no CRLF detected in the sampled bytes.`);
  }
  tips.push("Pass Windows paths via wslpath / path_convert rather than embedding CJK in fragile code pages.");
  tips.push("Kit shell scripts should stay LF (see dsh-wsl-kit .gitattributes).");
  return tips;
}

export async function execute(args, _config = {}, deps = {}) {
  const runPs = deps.runPowerShell || runPowerShell;
  const runCommand = deps.runCmd || runCmd;
  const readFile = deps.readFile || readFileSync;

  let psOutputEncoding = "";
  let chcp = "";
  try {
    const { stdout } = await runPs("[Console]::OutputEncoding.WebName", { timeoutMs: 10_000 });
    psOutputEncoding = stdout.trim();
  } catch (err) {
    psOutputEncoding = err instanceof Error ? err.message : String(err);
  }
  try {
    const { stdout } = await runCommand(["/c", "chcp"], { timeoutMs: 10_000 });
    chcp = stdout.trim();
  } catch (err) {
    chcp = err instanceof Error ? err.message : String(err);
  }

  const codePage = parseChcp(chcp);
  const utf8Console = isUtf8Console(codePage, psOutputEncoding);
  const lang = process.env.LANG || process.env.LC_ALL || "";
  const samplePath = typeof args?.path === "string" && args.path.trim() ? args.path.trim() : "";
  const sample = sampleLineEndings(samplePath, { readFile });
  const advice = buildEncodingAdvice({
    utf8Console,
    codePage,
    lang,
    sampleCrlf: sample.sampleCrlf,
    samplePath: sample.samplePath,
    sampleError: sample.sampleError,
  });

  return {
    ok: utf8Console && !sample.sampleCrlf,
    psOutputEncoding,
    chcp,
    codePage: codePage == null ? 0 : codePage,
    utf8Console,
    lang,
    samplePath: sample.samplePath || "",
    sampleCrlf: Boolean(sample.sampleCrlf),
    sampleLfOnly: Boolean(sample.sampleLfOnly),
    sampleError: sample.sampleError || "",
    advice,
  };
}
