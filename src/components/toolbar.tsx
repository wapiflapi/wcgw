import { useState } from "react"
import {
  ArrowCounterClockwise,
  Copy,
  Info,
  Moon,
  ShareNetwork,
  Sun,
  SunHorizon,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  const [shareUrl, setShareUrl] = useState("")
  const { setTheme, theme } = useTheme()

  function cycleTheme() {
    const nextTheme = getNextTheme(theme)

    setTheme(nextTheme)
    toast(getThemeMessage(nextTheme))
  }

  function updateShareUrl() {
    setShareUrl(window.location.href)
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

  return (
    <div className="flex items-center justify-end border-b bg-background">
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
          <ArrowCounterClockwise size={16} />
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
      <Popover>
        <PopoverTrigger
          render={
            <Button
              aria-label="Share model"
              onClick={updateShareUrl}
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
          <div className="flex gap-2">
            <Input
              readOnly
              aria-label="Share URL"
              value={shareUrl || window.location.href}
            />
            <Button onClick={copyShareUrl} variant="secondary">
              <Copy size={16} />
              Copy
            </Button>
          </div>
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
            A small approximate calculator for building intuition about marbles
            going ballistic.
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
  )
}
