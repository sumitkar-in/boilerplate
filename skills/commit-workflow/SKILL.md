---
name: commit-workflow
description: When and how to commit code after a change has been written and verified in this repo.
---

# Skill: Commit Workflow

This skill defines the single commit convention for this repo. Other process
skills (`feature`, `bug-fix`, etc.) reference this skill for their final
"commit" step instead of repeating these rules.

## When to commit

- Only after the change is **written and verified**: lint passes, the build
  succeeds, and relevant tests pass (unit/e2e as applicable for the change).
  Never commit code that fails lint, build, or tests.
- Commit as a logical unit of work — one feature, one bug fix, one refactor —
  not as a running checkpoint after every file edit.
- **Always confirm with the user before running `git commit`**, unless the
  user has given standing authorization for this conversation/session to
  commit without asking. Proposing a commit message and waiting for a go-ahead
  is the default; silently committing is not.
- Never use `git commit --amend`, `--no-verify`, or force-push as part of this
  workflow — see the repo's general git safety rules for those.

## Commit message format

This repo enforces [Conventional Commits](https://www.conventionalcommits.org/)
via a Husky `commit-msg` hook running
[commitlint](https://commitlint.js.org/) (`commitlint.config.js`, extending
`@commitlint/config-conventional`). A commit that doesn't match this format is
rejected by the hook, so always write messages in this shape:

```
<type>(<optional scope>): <short summary>

<optional body>
```

Allowed `type` values: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
`test`, `build`, `ci`, `chore`, `revert`.

- `<summary>` is imperative, present tense, lowercase, no trailing period:
  `add user avatar upload`, not `Added user avatar upload.`
- `<scope>` is optional and should name the module/area touched, e.g.
  `fix(auth): handle expired refresh token`.
- Keep the summary line short (~70 chars). Put any additional context in the
  body, focused on *why*, not a restatement of the diff.

## How to commit

1. Run `git status` and `git diff` (staged + unstaged) to confirm exactly
   what will be included — don't stage unrelated in-progress work.
2. Stage the specific files for this change (avoid `git add -A`/`git add .`
   unless you've reviewed the full status first).
3. Propose a Conventional Commits message to the user and get confirmation
   (unless already authorized to commit without asking).
4. Commit via a heredoc so multi-line messages format correctly:
   ```bash
   git commit -m "$(cat <<'EOF'
   feat: add user avatar upload

   EOF
   )"
   ```
5. If the Husky `commit-msg` or `pre-commit` hook fails, fix the underlying
   issue (message format, lint, failing test) and re-commit — never bypass
   with `--no-verify`.
