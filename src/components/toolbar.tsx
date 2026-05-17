import { useCallback, useEffect, useRef, useState } from "react"
import {
  Broom,
  Copy,
  GithubLogo,
  Info,
  Moon,
  ShareNetwork,
  Sun,
  SunHorizon,
  Warning,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { useTheme } from "@/components/theme-provider"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

type Theme = "dark" | "light" | "system"

type ToolbarProps = {
  onResetModelInput: () => void
}

const githubRepositoryUrl = "https://github.com/wapiflapi/wcgw"
const buildCommitSha = import.meta.env.WCGW_BUILD_COMMIT_SHA?.trim() || null
const buildCommitRef = import.meta.env.WCGW_BUILD_COMMIT_REF?.trim() || null
const buildDirty = import.meta.env.WCGW_BUILD_DIRTY?.trim() === "true"
const buildShortCommitSha = buildCommitSha?.slice(0, 7) || null
const buildVersion = [buildCommitRef, buildShortCommitSha]
  .filter((part): part is string => part !== null)
  .join("@")
const buildUrl = buildCommitSha
  ? `${githubRepositoryUrl}/commit/${buildCommitSha}`
  : buildCommitRef
    ? `${githubRepositoryUrl}/tree/${buildCommitRef}`
    : githubRepositoryUrl

function getNextTheme(theme: Theme) {
  if (theme === "light") {
    return "dark"
  }

  if (theme === "dark") {
    return "system"
  }

  return "light"
}

function getThemeMessage(theme: Theme) {
  if (theme === "system") {
    return "Using system theme"
  }

  return `Using ${theme} theme`
}

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "light") {
    return <Sun size={16} />
  }

  if (theme === "system") {
    return <SunHorizon size={16} />
  }

  return <Moon size={16} />
}

export function Toolbar({ onResetModelInput }: ToolbarProps) {
  const shareUrlInputRef = useRef<HTMLInputElement>(null)
  const [shareUrl, setShareUrl] = useState("")
  const { setTheme, theme } = useTheme()

  function cycleTheme() {
    const nextTheme = getNextTheme(theme)

    setTheme(nextTheme)
    toast(getThemeMessage(nextTheme))
  }

  async function copyShareUrl() {
    const url = shareUrl || window.location.href

    try {
      await navigator.clipboard.writeText(url)
      toast("Share URL copied")
    } catch {
      toast("Could not copy URL")
    }
  }

  const revealShareUrlStart = useCallback(() => {
    function resetInputScroll() {
      const input = shareUrlInputRef.current

      if (!input) {
        return
      }

      input.setSelectionRange(0, 0)
      input.scrollLeft = 0
    }

    requestAnimationFrame(() => {
      resetInputScroll()
      requestAnimationFrame(resetInputScroll)
    })
  }, [])

  useEffect(() => {
    revealShareUrlStart()
  }, [revealShareUrlStart, shareUrl])

  function handleShareOpenChange(open: boolean) {
    if (!open) {
      return
    }

    setShareUrl(window.location.href)
    revealShareUrlStart()
  }

  return (
    <div className="flex items-center justify-between border-b bg-background">
      <div className="flex h-7 min-w-0 items-center gap-1.5 overflow-hidden px-2 text-xs text-muted-foreground">
        <a
          aria-label="Open GitHub repository"
          className="flex min-w-0 items-center gap-1.5 hover:text-foreground"
          href={githubRepositoryUrl}
          rel="noreferrer"
          target="_blank"
        >
          <GithubLogo size={16} />
          <span className="min-w-0 truncate">wapiflapi/wcgw</span>
        </a>
        {buildVersion ? (
          <>
            <span className="shrink-0">—</span>
            <a
              aria-label="Open deployed source version on GitHub"
              className="shrink-0 hover:text-foreground"
              href={buildUrl}
              rel="noreferrer"
              target="_blank"
            >
              {buildVersion}
            </a>
          </>
        ) : null}
        {buildDirty ? (
          <span className="flex shrink-0 items-center gap-1 text-amber-600 dark:text-amber-400">
            <Warning size={14} />
            <span>has local changes</span>
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center">
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                aria-label="Back to defaults"
                size="icon"
                variant="ghost"
              />
            }
          >
            <Broom size={16} />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Back to defaults?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset every input and clear the share URL for the
                current model.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                render={<Button variant="ghost" />}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onResetModelInput}
                render={<Button variant="destructive" />}
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Popover onOpenChange={handleShareOpenChange}>
          <PopoverTrigger
            render={
              <Button
                aria-label="Share model"
                size="icon"
                variant="ghost"
              />
            }
          >
            <ShareNetwork size={16} />
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[min(calc(100vw-2rem),28rem)]"
          >
            <PopoverHeader>
              <PopoverTitle>Share model</PopoverTitle>
              <PopoverDescription>
                Copy this URL to reopen the current inputs.
              </PopoverDescription>
            </PopoverHeader>
            <InputGroup>
              <InputGroupInput
                readOnly
                ref={shareUrlInputRef}
                aria-label="Share URL"
                className="text-left"
                onFocus={revealShareUrlStart}
                value={shareUrl || window.location.href}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label="Copy share URL"
                  onClick={copyShareUrl}
                  size="icon-xs"
                >
                  <Copy size={16} />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </PopoverContent>
        </Popover>
        <Button
          aria-label="Toggle theme"
          onClick={cycleTheme}
          size="icon"
          variant="ghost"
        >
          <ThemeIcon theme={theme} />
        </Button>
        <Popover>
          <PopoverTrigger render={<Button size="icon" variant="ghost" />}>
            <Info size={16} />
          </PopoverTrigger>
          <PopoverContent align="end">
            <PopoverHeader>
              <PopoverTitle className="flex items-center gap-2 text-xl text-muted-foreground">
                <img
                  alt=""
                  className="inline size-[0.86em] -translate-y-px"
                  src="/wcgw.svg"
                />
                WCGW
              </PopoverTitle>
              <PopoverDescription className="text-xs uppercase tracking-wide">
                What Could Go Wrong.
              </PopoverDescription>
            </PopoverHeader>
            <p className="text-muted-foreground">
              A small approximate calculator for building intuition about
              marbles going ballistic.
            </p>
            <section>
              <h4 className="font-medium">Caveat</h4>
              <p className="text-muted-foreground">
                Might ignore friction, losses, bounce, flex, tolerances, and
                probably other things. Built by someone still checking the math.
              </p>
            </section>
            <section>
              <h4 className="font-medium">Author</h4>
              <p className="text-muted-foreground">
                Wannes Rombouts - @vvapi on Discord.
                <br />I do not take responsibility for floor marbles.
              </p>
            </section>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
