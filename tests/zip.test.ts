import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { criarZip, crc32 } from "../src/export/zip.ts";

test("crc32 vetor conhecido", () => assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926));
test("zip abre no python", () => {
  const z = criarZip([{ nome: "a.json", dados: new TextEncoder().encode('{"x":1}') }, { nome: "b.txt", dados: new TextEncoder().encode("olá") }]);
  const dir = mkdtempSync(join(tmpdir(), "zip-")); const f = join(dir, "t.zip"); writeFileSync(f, z);
  let out = "";
  try { out = execFileSync("python3", ["-c", "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);print(z.testzip());print(z.read('a.json').decode())", f]).toString(); } catch { return; }
  assert.match(out, /None\n\{"x":1\}/);
});
