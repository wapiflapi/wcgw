/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly WCGW_BUILD_COMMIT_SHA?: string
  readonly WCGW_BUILD_COMMIT_REF?: string
  readonly WCGW_BUILD_DIRTY?: string
}
