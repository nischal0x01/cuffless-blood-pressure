"use client"

import { Github } from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const element = document.querySelector("#home")
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <a
            href="#home"
            onClick={handleHomeClick}
            className="flex items-center gap-0 text-xl font-bold transition-all hover:scale-105 cursor-pointer"
          >
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              Pulse
            </span>
            <span className="bg-gradient-to-r from-pink-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
              AI
            </span>
          </a>

          {/* GitHub Link */}
          <a
            href="https://github.com/nischal0x01/pulseAI"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="GitHub Repository"
          >
            <Github className="h-5 w-5" />
          </a>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © {currentYear} PulseAI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
