import { Info, Moon, Sun, SunHorizon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"

type Theme = "dark" | "light" | "system"

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

export function Toolbar() {
  const { setTheme, theme } = useTheme()

  function cycleTheme() {
    const nextTheme = getNextTheme(theme)

    setTheme(nextTheme)
    toast(getThemeMessage(nextTheme))
  }

  return (
    <div className="flex items-center justify-end border-b bg-background">
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
