import { existsSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import type { CLIConfig } from "@clibu/core"
import { pickExport } from "./pick"
import { transpileTsConfig } from "./transpile"

export async function loadConfig(cwd: string): Promise<CLIConfig | null> {
  // 1. Explicit opt-in via package.json `clibu.configFile`
  //    Supports either:
  //    { "clibu": { "configFile": "./path/to/file.ts" } }
  //    Path may point to a file OR a directory containing index.*
  try {
    const pkgPath = resolve(cwd, "package.json")
    if (existsSync(pkgPath)) {
      const pkgRaw = readFileSync(pkgPath, "utf8")
      type PackageJson = { clibu?: unknown } & Record<string, unknown>
      const pkg = JSON.parse(pkgRaw) as PackageJson
      const clibuObj = pkg.clibu
      let configFile: string | undefined
      if (
        clibuObj &&
        typeof clibuObj === "object" &&
        clibuObj !== null &&
        "configFile" in clibuObj &&
        typeof (clibuObj as Record<string, unknown>).configFile === "string"
      ) {
        configFile = String(
          (clibuObj as Record<string, unknown>).configFile
        ).trim()
      }
      if (configFile) {
        const target = resolve(cwd, configFile)
        if (existsSync(target)) {
          // If target is a directory, attempt index.* resolution inside it.
          if (statSync(target).isDirectory()) {
            const idxCandidates = [
              "index.ts",
              "index.mts",
              "index.cts",
              "index.mjs",
              "index.js",
              "index.cjs",
              "index.json"
            ]
            for (const idx of idxCandidates) {
              const p = join(target, idx)
              if (!existsSync(p)) continue
              const loaded = await loadConfigFilePath(p, cwd)
              if (loaded) return loaded
            }
          } else {
            const loaded = await loadConfigFilePath(target, cwd)
            if (loaded) return loaded
          }
        }
      }
    }
  } catch {
    // Swallow errors – explicit opt-in should not crash discovery.
  }

  // 2. Filename discovery candidates (first match wins)
  const candidates = [
    "clibu.config.ts",
    "clibu.config.mts",
    "clibu.config.cts",
    "clibu.config.mjs",
    "clibu.config.js",
    "clibu.config.cjs",
    "clibu.config.json"
  ]
  for (const name of candidates) {
    const p = resolve(cwd, name)
    if (!existsSync(p)) continue
    const loaded = await loadConfigFilePath(p, cwd)
    if (loaded) return loaded
  }
  return null
}

// Internal helper: load a config file path returning CLIConfig or null.
async function loadConfigFilePath(
  p: string,
  cwd: string
): Promise<CLIConfig | null> {
  try {
    if (p.endsWith(".json")) {
      const data = await import(pathToFileURL(p).href)
      const picked = pickExport(data)
      return picked as CLIConfig
    }
    if (p.endsWith(".ts") || p.endsWith(".mts") || p.endsWith(".cts")) {
      const jsFile = transpileTsConfig(p, cwd)
      const mod = await import(pathToFileURL(jsFile).href)
      const picked = pickExport(mod)
      return picked as CLIConfig
    }
    // js/mjs/cjs
    const mod = await import(pathToFileURL(p).href)
    const picked = pickExport(mod)
    return picked as CLIConfig
  } catch {
    return null
  }
}
