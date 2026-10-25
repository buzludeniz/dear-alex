#!/usr/bin/env python3
"""
Dear Alex — Automated showcase demo script.

Drives a real browser through the full happy path using Playwright.
Install:  pip install playwright && playwright install chromium
Usage:    python scripts/demo.py [--url http://localhost:5173] [--slow] [--headed]

Options
-------
--url URL        Frontend URL (default: http://localhost:5173)
--slow           Add visible delays for screen-recording / live demos
--headed         Show the browser window (default: headless)
--seed           Also seed demo data before running (requires backend running)
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from typing import Optional

DEMO_STORY = (
    "I got my midterm back and it was much worse than I hoped. "
    "I studied hard for weeks and still failed. I don't know what to do next."
)
DEMO_VOICE = "I'm just not smart enough for this."
DEMO_DEVICE_ID = "00000000-0000-0000-0000-000000000001"
BACKEND_URL = "http://localhost:8000"


# ── Helpers ──────────────────────────────────────────────────────────────────

def log(msg: str, ok: bool = True) -> None:
    icon = "  ✓" if ok else "  ✗"
    print(f"{icon} {msg}", flush=True)


def step(msg: str) -> None:
    print(f"\n── {msg}", flush=True)


# ── Main demo ────────────────────────────────────────────────────────────────

async def run_demo(
    url: str,
    slow: bool,
    headed: bool,
    seed: bool,
) -> None:
    try:
        from playwright.async_api import async_playwright, Page
    except ImportError:
        print(
            "\n❌  Playwright is not installed.\n"
            "    Run:  pip install playwright && playwright install chromium\n",
            file=sys.stderr,
        )
        sys.exit(1)

    pause = 900 if slow else 250   # ms between major actions
    type_delay = 28 if slow else 8  # ms between keystrokes

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=not headed,
            slow_mo=0,
        )
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()

        print(f"\n🎬  Dear Alex auto-demo")
        print(f"    URL : {url}")
        print(f"    Mode: {'slow (recording)' if slow else 'fast'} | {'headed' if headed else 'headless'}")
        print()

        # ── Navigate & inject device ID ────────────────────────────────
        step("Loading app")
        await page.goto(url, wait_until="networkidle")
        await page.evaluate(
            f"localStorage.setItem('dear-alex-device-id', '{DEMO_DEVICE_ID}')"
        )
        await page.reload(wait_until="networkidle")
        log("App loaded, device ID injected")

        # ── Check-in: select mood 2 (Tender) ──────────────────────────
        step("Check-in")
        await page.wait_for_timeout(pause)
        mood_btns = page.locator('[role="radio"]')
        await mood_btns.nth(1).click()   # index 1 → mood 2 "Tender"
        log("Mood 2 (Tender) selected")
        await page.wait_for_timeout(pause)
        await page.locator("text=Begin gently").click()
        log("Proceeding to intake")

        # ── Intake: typewriter story ───────────────────────────────────
        step("Intake — writing Alex's story")
        await page.wait_for_timeout(pause // 2)
        story_textarea = page.locator("textarea").first
        await story_textarea.focus()
        await story_textarea.type(DEMO_STORY, delay=type_delay)
        log(f"Story typed ({len(DEMO_STORY)} chars)")

        await page.wait_for_timeout(400)
        voice_textarea = page.locator("textarea").nth(1)
        await voice_textarea.focus()
        await voice_textarea.type(DEMO_VOICE, delay=type_delay * 2)
        log(f"Inner voice typed")

        await page.wait_for_timeout(300)
        await page.locator("button", has_text="Academic").click()
        log("Category: Academic")

        await page.wait_for_timeout(pause)
        await page.locator("button", has_text="Meet").click()
        log("Submitted — waiting for scene screen")

        # ── Scene 1: The Moment ────────────────────────────────────────
        step("Scene 1 — The Moment")
        await page.wait_for_selector("text=The moment", timeout=10_000)
        await page.wait_for_timeout(pause)
        await page.locator(".cards button").first.click()
        log("Compassion card selected")

        # ── Scene 2: The Voice ─────────────────────────────────────────
        step("Scene 2 — The Voice")
        await page.wait_for_timeout(1_400)
        await page.locator(".cards button").first.click()
        log("Compassion card selected")

        # ── Scene 3: Tomorrow ──────────────────────────────────────────
        step("Scene 3 — Tomorrow")
        await page.wait_for_timeout(1_400)
        await page.locator(".cards button").first.click()
        log("Compassion card selected")

        # ── Reveal ────────────────────────────────────────────────────
        step("The Reveal")
        await page.wait_for_selector("text=That advice was", timeout=10_000)
        log("Reveal screen loaded — watching token animation…")
        reveal_pause = 5_000 if slow else 3_500
        await page.wait_for_timeout(reveal_pause)
        await page.locator("text=Read your letter").click()
        log("Navigated to letter")

        # ── Letter to You ─────────────────────────────────────────────
        step("Letter to You")
        await page.wait_for_selector("text=Dear you", timeout=8_000)
        await page.wait_for_timeout(pause * 2)
        await page.locator("text=Seal in vault").click()
        log("Letter sealed in vault")

        # ── Vault ─────────────────────────────────────────────────────
        step("Letter Vault")
        await page.wait_for_selector("text=Letter vault", timeout=8_000)
        await page.wait_for_timeout(pause)
        await page.locator("text=Open a letter from past you").click()
        log("Past letter opened")

        # ── Done ──────────────────────────────────────────────────────
        await page.wait_for_timeout(pause * 2)
        print("\n  🎉  Full happy path complete.\n")
        await context.close()
        await browser.close()


# ── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Dear Alex automated showcase demo",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--url", default="http://localhost:5173", metavar="URL", help="Frontend dev-server URL")
    parser.add_argument("--slow", action="store_true", help="Add visible delays (good for screen recording)")
    parser.add_argument("--headed", action="store_true", help="Show a real browser window")
    parser.add_argument("--seed", action="store_true", help="Seed demo data via backend before running")
    args = parser.parse_args()

    print(
        "\n┌─────────────────────────────────────────────┐"
        "\n│          Dear Alex — Automated Demo          │"
        "\n│  Make sure both servers are running first:   │"
        "\n│  Backend:  uvicorn app.main:app --reload     │"
        "\n│  Frontend: npm run dev                       │"
        "\n└─────────────────────────────────────────────┘"
    )

    if args.seed:
        import subprocess, os
        backend_dir = (
            "c:\\Users\\ESA\\Desktop\\Detyra Deniz\\01-Academic"
            "\\University\\1st year\\hackathons\\uvec\\backend"
        )
        print("\n  Seeding demo data…")
        result = subprocess.run(
            [".venv\\Scripts\\python.exe", "-m", "app.seed_demo"],
            cwd=backend_dir,
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            print("  ✓ Demo data seeded")
            print(f"    {result.stdout.strip()}")
        else:
            print(f"  ✗ Seed failed: {result.stderr.strip()}")

    try:
        asyncio.run(run_demo(args.url, args.slow, args.headed, args.seed))
    except KeyboardInterrupt:
        print("\nDemo cancelled by user.")
        sys.exit(0)
    except Exception as exc:
        print(f"\n❌  Demo failed: {exc}", file=sys.stderr)
        print(
            "  Checklist:\n"
            "    - Is the frontend running?  npm run dev\n"
            "    - Is the backend running?   uvicorn app.main:app --reload\n"
            "    - Is playwright installed?  pip install playwright && playwright install chromium\n",
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
