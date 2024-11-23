import core from "@actions/core"
import yaml from "js-yaml"
import fs from "node:fs/promises"

core.exportVariable("envault_success", "true")
console.log(process.cwd())
console.log(
    await fs.readdir(
        process.cwd()
    )
)
