# GitWorkflow.md

> A complete, step-by-step reference for contributing to this project via the **Fork → Clone → Branch → Push → Pull Request** workflow.
>
> Read this file whenever you're unsure how to sync your fork, start new work, push changes, or open a Pull Request (PR).

---

## Table of Contents

1. [Overview of the Workflow](#1-overview-of-the-workflow)
2. [One-Time Setup](#2-one-time-setup)
3. [Understanding Remotes (origin vs upstream)](#3-understanding-remotes-origin-vs-upstream)
4. [Keeping Your Fork Updated](#4-keeping-your-fork-updated)
5. [Starting New Work (Branching)](#5-starting-new-work-branching)
6. [Making and Committing Changes](#6-making-and-committing-changes)
7. [Pushing Your Branch](#7-pushing-your-branch)
8. [Creating a Pull Request](#8-creating-a-pull-request)
9. [Keeping Your PR Updated](#9-keeping-your-pr-updated)
10. [Handling Merge Conflicts](#10-handling-merge-conflicts)
11. [After Your PR Is Merged (Cleanup)](#11-after-your-pr-is-merged-cleanup)
12. [Branch Naming Conventions](#12-branch-naming-conventions)
13. [Commit Message Conventions](#13-commit-message-conventions)
14. [Common Git Commands Cheat Sheet](#14-common-git-commands-cheat-sheet)
15. [Troubleshooting](#15-troubleshooting)
16. [Do's and Don'ts](#16-dos-and-donts)

---

## 1. Overview of the Workflow

This project uses the **Fork & Pull Request** model, commonly used in open-source and multi-collaborator projects. The high-level flow looks like this:

```
Original Repo (upstream)
        │
        │  Fork (on GitHub)
        ▼
Your Fork (origin)
        │
        │  Clone (to your machine)
        ▼
Local Repository
        │
        │  Create branch → Make changes → Commit
        ▼
Push branch to your fork (origin)
        │
        │  Open Pull Request
        ▼
Original Repo (upstream) ← reviewed & merged
```

**Key idea:** You never push directly to the original repository. You push to *your own fork*, and then open a Pull Request asking the maintainers to pull your changes into the original repository.

---

## 2. One-Time Setup

These steps are done **only once** per collaborator, per machine.

### Step 2.1 — Fork the Repository

1. Go to the original repository on GitHub (the "upstream" repo).
2. Click the **Fork** button (top-right corner).
3. This creates a copy of the repository under your own GitHub account:
   `https://github.com/<your-username>/<repo-name>`

### Step 2.2 — Clone Your Fork (Not the Original Repo)

Clone **your fork**, not the original repository, onto your local machine.

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
```

### Step 2.3 — Add the Original Repo as "upstream"

This lets you pull the latest changes from the original repository later.

```bash
git remote add upstream https://github.com/<original-owner>/<repo-name>.git
```

### Step 2.4 — Verify Your Remotes

```bash
git remote -v
```

Expected output:

```
origin    https://github.com/<your-username>/<repo-name>.git (fetch)
origin    https://github.com/<your-username>/<repo-name>.git (push)
upstream  https://github.com/<original-owner>/<repo-name>.git (fetch)
upstream  https://github.com/<original-owner>/<repo-name>.git (push)
```

### Step 2.5 — Configure Git Identity (if not already set)

```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

### Step 2.6 — (Optional but Recommended) Set Up SSH Authentication

Using SSH avoids typing your username/password (or token) every time.

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
cat ~/.ssh/id_ed25519.pub
```

Copy the output and add it under **GitHub → Settings → SSH and GPG Keys → New SSH Key**.

Then use the SSH URL instead of HTTPS when cloning/adding remotes:

```
git@github.com:<username>/<repo-name>.git
```

---

## 3. Understanding Remotes (origin vs upstream)

| Remote | Points To | Purpose |
|---|---|---|
| `origin` | Your fork (`github.com/<your-username>/<repo>`) | Where **you push** your branches and open PRs from |
| `upstream` | The original repo (`github.com/<original-owner>/<repo>`) | Where **you pull** the latest official changes from |

Rule of thumb:

- `git pull upstream main` → get the latest official code
- `git push origin <branch-name>` → send your work to your fork

---

## 4. Keeping Your Fork Updated

Before starting **any new work**, always sync your local `main` branch (and your fork) with the latest changes from `upstream`. This avoids outdated code and painful conflicts later.

```bash
# 1. Switch to your local main branch
git checkout main

# 2. Fetch the latest changes from the original repo
git fetch upstream

# 3. Merge those changes into your local main
git merge upstream/main

# 4. Push the updated main branch to your own fork on GitHub
git push origin main
```

> **Tip:** You can also use `git pull upstream main` to combine steps 2 and 3 in one command.

Do this **every time before creating a new branch**, and periodically while working on a long-running branch.

---

## 5. Starting New Work (Branching)

**Never work directly on `main`.** Always create a new branch for every feature, fix, or task.

```bash
# Make sure main is up to date first (see Section 4)
git checkout main

# Create and switch to a new branch
git checkout -b feature/employee-attendance-api
```

See [Section 12](#12-branch-naming-conventions) for naming conventions.

Verify which branch you're on at any time:

```bash
git branch
```

---

## 6. Making and Committing Changes

### Step 6.1 — Check What Changed

```bash
git status
git diff
```

### Step 6.2 — Stage Your Changes

```bash
# Stage a specific file
git add path/to/file.js

# Stage everything
git add .
```

### Step 6.3 — Commit Your Changes

```bash
git commit -m "feat: add clock-in API endpoint"
```

See [Section 13](#13-commit-message-conventions) for message format guidelines.

### Step 6.4 — Commit Often, in Small Logical Chunks

- One commit = one logical change.
- Avoid giant commits that mix unrelated changes.
- Use `git add -p` to stage changes interactively (partial staging) if a file has multiple unrelated edits.

---

## 7. Pushing Your Branch

Push your branch to **your fork** (`origin`), never to `upstream`.

```bash
git push origin feature/employee-attendance-api
```

### First-Time Push of a New Branch

If the branch doesn't exist on your fork yet, set the upstream tracking branch:

```bash
git push -u origin feature/employee-attendance-api
```

After this, future pushes for this branch can simply be:

```bash
git push
```

---

## 8. Creating a Pull Request

1. Go to your fork on GitHub: `https://github.com/<your-username>/<repo-name>`
2. GitHub usually shows a banner: **"Compare & pull request"** — click it.
   - If not, go to the **Pull Requests** tab → **New Pull Request**.
3. Set:
   - **Base repository:** `<original-owner>/<repo-name>`, base branch: `main`
   - **Head repository:** `<your-username>/<repo-name>`, compare branch: `feature/employee-attendance-api`
4. Fill in:
   - **Title:** Short, descriptive summary (e.g., `feat: add clock-in API endpoint`)
   - **Description:** What was changed, why, how to test, related issue numbers (e.g., `Closes #42`)
5. Click **Create Pull Request**.

### Alternative: Using GitHub CLI (`gh`)

```bash
gh pr create --base main --head <your-username>:feature/employee-attendance-api \
  --title "feat: add clock-in API endpoint" \
  --body "Adds the clock-in endpoint with validation and tests. Closes #42."
```

### Good PR Practices

- Keep PRs small and focused on a single purpose.
- Link related issues (`Closes #<issue-number>`).
- Add screenshots/logs for UI or behavior changes.
- Request review from relevant teammates.
- Respond to review comments promptly.

---

## 9. Keeping Your PR Updated

If `main` on the original repo moves forward while your PR is still open, update your branch to avoid conflicts and keep it mergeable.

```bash
# Get the latest changes from upstream
git checkout main
git fetch upstream
git merge upstream/main
git push origin main

# Go back to your feature branch and bring it up to date
git checkout feature/employee-attendance-api
git merge main

# Push the updated branch (this updates the open PR automatically)
git push origin feature/employee-attendance-api
```

> **Alternative (cleaner history):** Instead of `git merge main`, some teams prefer `git rebase main`. Only rebase branches that **you alone** are working on, and that haven't been shared/reviewed heavily, since rebasing rewrites commit history.

```bash
git checkout feature/employee-attendance-api
git rebase main
# Resolve any conflicts, then:
git push --force-with-lease origin feature/employee-attendance-api
```

---

## 10. Handling Merge Conflicts

Conflicts happen when the same lines of code were changed both in `main` and in your branch.

```bash
git checkout feature/employee-attendance-api
git merge main
```

If conflicts occur, Git will mark them in the affected files like this:

```
<<<<<<< HEAD
your code
=======
incoming code from main
>>>>>>> main
```

### Resolve Step by Step

1. Open each conflicted file and manually decide what the final code should look like.
2. Remove the `<<<<<<<`, `=======`, and `>>>>>>>` markers.
3. Stage the resolved files:
   ```bash
   git add <resolved-file>
   ```
4. Complete the merge:
   ```bash
   git commit
   ```
5. Push the resolved branch:
   ```bash
   git push origin feature/employee-attendance-api
   ```

### Useful Conflict Tools

```bash
git status              # See which files are conflicted
git diff                # See conflict details
git mergetool           # Open a visual merge tool (if configured)
git merge --abort       # Cancel the merge and go back to the pre-merge state
```

---

## 11. After Your PR Is Merged (Cleanup)

Once your PR is approved and merged into the original repo:

```bash
# Switch back to main
git checkout main

# Sync main with the latest upstream (which now includes your merged PR)
git fetch upstream
git merge upstream/main
git push origin main

# Delete the local feature branch (no longer needed)
git branch -d feature/employee-attendance-api

# Delete the remote branch on your fork
git push origin --delete feature/employee-attendance-api
```

> Keeping branches deleted after merge keeps your fork clean and avoids confusion later.

---

## 12. Branch Naming Conventions

Use short, descriptive, lowercase, hyphen-separated names with a type prefix:

| Prefix | Use Case | Example |
|---|---|---|
| `feature/` | New feature | `feature/leave-approval-flow` |
| `fix/` | Bug fix | `fix/attendance-duplicate-entry` |
| `hotfix/` | Urgent production fix | `hotfix/login-crash` |
| `chore/` | Maintenance, config, tooling | `chore/update-dependencies` |
| `docs/` | Documentation only | `docs/update-readme` |
| `refactor/` | Code restructuring, no behavior change | `refactor/employee-service-cleanup` |
| `test/` | Adding or fixing tests | `test/leave-module-coverage` |

```bash
git checkout -b fix/attendance-duplicate-entry
```

---

## 13. Commit Message Conventions

This project follows the **Conventional Commits** style:

```
<type>(<optional scope>): <short summary>

<optional longer description>

<optional footer, e.g., Closes #12>
```

### Common Types

| Type | Meaning |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, no logic change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Tooling, build process, dependencies |
| `perf` | Performance improvement |

### Examples

```bash
git commit -m "feat(attendance): add clock-out validation"
git commit -m "fix(auth): correct refresh token expiry check"
git commit -m "docs: update setup instructions in README"
git commit -m "refactor(employee): simplify repository layer"
```

---

## 14. Common Git Commands Cheat Sheet

### Setup & Remotes

```bash
git clone https://github.com/<your-username>/<repo-name>.git
git remote add upstream https://github.com/<original-owner>/<repo-name>.git
git remote -v
```

### Syncing

```bash
git fetch upstream
git merge upstream/main
git pull upstream main          # fetch + merge combined
git push origin main
```

### Branching

```bash
git branch                      # list local branches
git branch -a                   # list all branches (local + remote)
git checkout -b <branch-name>   # create + switch to new branch
git checkout <branch-name>      # switch to existing branch
git branch -d <branch-name>     # delete local branch
```

### Status & Changes

```bash
git status
git diff
git diff --staged
git log --oneline --graph --all
```

### Staging & Committing

```bash
git add <file>
git add .
git add -p
git commit -m "message"
git commit --amend              # edit the last commit
```

### Pushing & Pulling

```bash
git push origin <branch-name>
git push -u origin <branch-name>   # first push, sets tracking
git pull origin <branch-name>
```

### Stashing (Save Work Temporarily)

```bash
git stash                # save uncommitted changes
git stash list            # see stashed changes
git stash pop             # reapply the latest stash
git stash drop            # discard a stash
```

### Undoing Things

```bash
git restore <file>              # discard unstaged changes in a file
git restore --staged <file>     # unstage a file (keep changes)
git reset --soft HEAD~1         # undo last commit, keep changes staged
git reset --hard HEAD~1         # undo last commit, discard changes (careful!)
git revert <commit-hash>        # create a new commit that undoes a previous commit
```

### Inspecting

```bash
git log
git log --oneline
git show <commit-hash>
git blame <file>
```

---

## 15. Troubleshooting

**"Your branch is ahead/behind 'origin/main' by N commits"**
→ Run `git pull origin main` (or `git push origin main` if you're ahead and want to publish).

**"Updates were rejected because the remote contains work that you do not have locally"**
→ Someone else pushed changes. Run:
```bash
git pull origin <branch-name>
```
then resolve any conflicts and push again.

**Accidentally committed to `main` instead of a feature branch**
```bash
git branch feature/my-fix        # create a branch at current commit
git reset --hard upstream/main   # reset main back to the correct state
git checkout feature/my-fix      # continue work on the new branch
```

**Need to update your PR after force-pushing a rebase**
```bash
git push --force-with-lease origin <branch-name>
```
> Never use plain `--force` on shared branches — `--force-with-lease` is safer because it fails if someone else has pushed new commits you don't have.

**Fork is far behind upstream and has diverged significantly**
```bash
git checkout main
git fetch upstream
git reset --hard upstream/main
git push origin main --force-with-lease
```
> Only do this on your `main` branch, never on a branch with active PR work you want to keep.

---

## 16. Do's and Don'ts

### Do

- ✅ Always sync `main` with `upstream` before starting new work.
- ✅ Create a new branch for every feature/fix.
- ✅ Write clear, descriptive commit messages.
- ✅ Push regularly so your work isn't only local.
- ✅ Keep PRs small and focused.
- ✅ Pull the latest `main` into your branch before requesting a final review.
- ✅ Delete branches after they're merged.

### Don't

- ❌ Don't commit directly to `main`.
- ❌ Don't push directly to `upstream` (you don't have write access anyway, in most fork workflows).
- ❌ Don't use `git push --force` on shared/team branches without `--force-with-lease`.
- ❌ Don't mix unrelated changes into a single commit or PR.
- ❌ Don't commit secrets, `.env` files, or credentials.
- ❌ Don't let a branch sit for weeks without syncing with `main` — conflicts get worse over time.

---

## Quick Reference: Full Workflow in One Glance

```bash
# 1. One-time setup
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
git remote add upstream https://github.com/<original-owner>/<repo-name>.git

# 2. Before starting new work — sync main
git checkout main
git fetch upstream
git merge upstream/main
git push origin main

# 3. Create a branch
git checkout -b feature/my-new-feature

# 4. Work, stage, commit
git add .
git commit -m "feat: implement my new feature"

# 5. Push to your fork
git push -u origin feature/my-new-feature

# 6. Open a Pull Request on GitHub (base: upstream/main ← head: your-fork/feature branch)

# 7. Keep PR updated if needed
git checkout main && git fetch upstream && git merge upstream/main && git push origin main
git checkout feature/my-new-feature && git merge main && git push origin feature/my-new-feature

# 8. After merge — cleanup
git checkout main
git fetch upstream && git merge upstream/main && git push origin main
git branch -d feature/my-new-feature
git push origin --delete feature/my-new-feature
```

---

**End of GitWorkflow.md**
