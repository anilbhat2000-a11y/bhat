# SentinelCore — working rules

## Always update the installation guide (standing instruction from the project owner)

Whenever a change touches the portal (any screen, workflow, setting, role, API
behaviour users see, environment variable, or install step), update the
installation guide **in the same piece of work**, before reporting it done:

1. Re-capture the screenshots from a fresh install:
   `bash docs/install-guide/capture.sh <python-with-requirements>`
   Extend `docs/install-guide/capture.js` when a new screen or step is added.
2. Update `docs/install-guide/index.html`: the affected sections, the version and
   "Guide updated" date in the header, and a new entry under "What's new".
3. Check every `img/...` reference exists and every screenshot shows the new UI.
4. Republish the guide to the existing artifact, keeping its link:
   https://claude.ai/artifact/5XRxcihSpZHHQp5n8k32Hr
   (publish `docs/install-guide/index.html` with `url` set to that link and the
   `img/*.webp` files in `files`, `root` = `docs/install-guide`).
5. Commit the guide together with the code change, and give the guide link in the reply.

## Other rules

- Keep `docs/VERIFICATION.md` honest: list what is tested, what is written but
  not verified on hardware, and what is not done.
- Run `pytest -q` before committing; all tests must pass.
- Never invent device APIs. Mark vendor endpoints as "verify on your firmware".
