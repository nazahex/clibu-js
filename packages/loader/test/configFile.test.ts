import { describe, expect, it } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { loadConfig } from "../src/index"

function makeTempDir(prefix = "clibu-loader-cfgfile-") {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  const cleanup = () => rmSync(dir, { recursive: true, force: true })
  return { dir, cleanup }
}

describe("@clibu/loader package.json clibu.configFile", () => {
  it("loads config from explicit file path", async () => {
    const { dir, cleanup } = makeTempDir()
    try {
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({ clibu: { configFile: "./myconfig.ts" } }, null, 2)
      )
      writeFileSync(
        join(dir, "myconfig.ts"),
        `export default { name: "explicit-file", commands: { hi: { run(){ return 0 } } } }`
      )
      const cfg = await loadConfig(dir)
      expect(cfg).not.toBeNull()
      if (!cfg) throw new Error("expected config")
      expect(cfg.name).toBe("explicit-file")
      expect(Object.keys(cfg.commands)).toContain("hi")
    } finally {
      cleanup()
    }
  })

  it("loads config from directory index (configFile points to directory)", async () => {
    const { dir, cleanup } = makeTempDir()
    try {
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({ clibu: { configFile: "./src" } }, null, 2)
      )
      mkdirSync(join(dir, "src"))
      writeFileSync(
        join(dir, "src", "index.mjs"),
        `export default { name: "dir-index", commands: { ok: { run(){ return true } } } }`
      )
      const cfg = await loadConfig(dir)
      expect(cfg).not.toBeNull()
      if (!cfg) throw new Error("expected config")
      expect(cfg.name).toBe("dir-index")
      expect(Object.keys(cfg.commands)).toContain("ok")
    } finally {
      cleanup()
    }
  })
})
