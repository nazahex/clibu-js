---
"@clibu/loader": patch
"clibu": patch
---

Support for explicit configuration file or directory opt-in via the `package.json` `clibu.configFile` field with directory resolution for common index files (`index.ts`, `index.mts`, etc.), allowing users to specify a config file or directory for Clibu to load before falling back to filename-based discovery.
