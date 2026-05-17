import { execFileSync } from "node:child_process"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

function readGitValue(args: string[]) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return ""
  }
}

function readLocalGitMetadata() {
  return {
    commitSha: readGitValue(["rev-parse", "HEAD"]),
    commitRef: readGitValue(["branch", "--show-current"]),
    dirty: readGitValue(["status", "--porcelain"]) ? "true" : "",
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "")
  const localGitMetadata = readLocalGitMetadata()

  return {
    define: {
      "import.meta.env.WCGW_BUILD_COMMIT_SHA": JSON.stringify(
        env.VERCEL_GIT_COMMIT_SHA?.trim() || localGitMetadata.commitSha
      ),
      "import.meta.env.WCGW_BUILD_COMMIT_REF": JSON.stringify(
        env.VERCEL_GIT_COMMIT_REF?.trim() || localGitMetadata.commitRef
      ),
      "import.meta.env.WCGW_BUILD_DIRTY": JSON.stringify(
        env.VERCEL ? "" : localGitMetadata.dirty
      ),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
