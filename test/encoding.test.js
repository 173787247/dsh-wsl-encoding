import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEncodingAdvice,
  format,
  isUtf8Console,
  parseChcp,
  sampleLineEndings,
} from "../lib/encoding.js";

describe("parseChcp / isUtf8Console", () => {
  it("parses 65001", () => {
    assert.equal(parseChcp("Active code page: 65001"), 65001);
    assert.equal(isUtf8Console(65001, "utf-8"), true);
    assert.equal(isUtf8Console(936, "gb2312"), false);
  });
});

describe("sampleLineEndings", () => {
  it("detects CRLF", () => {
    const s = sampleLineEndings("/tmp/x.sh", {
      readFile: () => Buffer.from("#!/bin/bash\r\nset -euo pipefail\r\n"),
    });
    assert.equal(s.sampleCrlf, true);
    assert.equal(s.sampleLfOnly, false);
  });

  it("detects LF-only", () => {
    const s = sampleLineEndings("/tmp/x.sh", {
      readFile: () => Buffer.from("#!/bin/bash\nset -euo pipefail\n"),
    });
    assert.equal(s.sampleCrlf, false);
    assert.equal(s.sampleLfOnly, true);
  });
});

describe("buildEncodingAdvice", () => {
  it("warns on CRLF sample", () => {
    const tips = buildEncodingAdvice({
      utf8Console: true,
      codePage: 65001,
      lang: "C.UTF-8",
      sampleCrlf: true,
      samplePath: "/mnt/c/x.sh",
    });
    assert.ok(tips.some((t) => /CRLF/i.test(t) && /pipefail/i.test(t)));
  });
});

describe("format", () => {
  it("includes utf8Console", () => {
    assert.match(
      format({ ok: true, utf8Console: true, advice: ["tip"], psOutputEncoding: "utf-8", chcp: "65001" }),
      /utf8Console: true/,
    );
  });
});
