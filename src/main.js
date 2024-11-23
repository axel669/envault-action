import fs from "node:fs/promises"
import path from "node:path"

import core from "@actions/core"
import yaml from "js-yaml"

const hash = async (text) => {
    const bytes = await new Blob([text]).arrayBuffer()
    const hashBytes = await crypto.subtle.digest("SHA-512", bytes)
    return Array.from(
        new Uint8Array(hashBytes),
        (byte) => byte.toString(16).padStart(2, "0")
    ).join("")
}

const target = path.resolve(process.cwd(), "envault.yml")
const settings = yaml.load(
    await fs.readFile(target, "utf8")
)

const envKeyName = settings.apiKeyName ?? "envault_key"
const apiURL = new URL("/api/env", settings.origin).href

const apiKey = process.env[envKeyName]

const vaults = Object.entries(settings.vaults)

let envVars = {}
for (const [vaultName, vaultInfo] of vaults) {
    const vaultKey = process.env[vaultInfo.vaultKeyName]
    const key = await hash(vaultKey)
    const res = await fetch(
        `${apiURL}/${vaultName}`,
        {
            method: "POST",
            headers: {
                "api-key": apiKey,
            },
            body: JSON.stringify({
                vaultKey: key,
                keys: vaultInfo.keys,
            }),
        }
    )
    const keyPart = await res.json()

    if (res.ok === false) {
        core.setFailed(
            `Failed to load from vault "${vaultName}": (${res.status}) ${keyPart.message}`
        )
        process.exit(1)
    }

    envVars = { ...envVars, ...keyPart }
}

for (const [key, value] of Object.entries(envVars)) {
    console.log("Setting ENV Var:", key)
    core.exportVariable(key, value)
    core.setSecret(value)
}
