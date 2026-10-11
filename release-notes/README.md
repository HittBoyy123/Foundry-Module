# Player release notes

Each release has a versioned Markdown file ready to copy into Discord. Include major player-facing changes, rebalances and relevant fixes in plain language without images or implementation details. Prepare this file before tagging a release; the release workflow uses it as the GitHub release description.

## Required for every release

- Prepare versioned release notes and a matching `vVERSION-discord.txt` containing literal Discord Markdown (`**bold**`, `- bullets`), without an enclosing code fence or images. Keep messages within Discord limits or split into clearly labelled files.
- Review the latest user-supplied campaign rules document against the release. Preserve the original. Record the exact source edition, stale sections, additions, removals and replacement wording in `docs/rulebook-review-vVERSION.md`. Do not imply the live Google Doc was reviewed when only a supplied file was available.
- If providing a replacement DOCX, preserve the source formatting and colours and render and inspect all pages before delivery. Otherwise provide a concrete update checklist with copy-ready wording.
- Publish the Discord text and rulebook review as release assets alongside the module and manifest, and link them in the completion response.
