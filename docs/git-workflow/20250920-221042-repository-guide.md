# Working with Repositories: A Simple Guide

**Created**: 2025-09-20 22:10:42

## TL;DR - Industry Workflow

**For experienced developers who just need the commands:**

```bash
# Start new feature
git fetch origin
git switch -c my-feature origin/dev

# Before pushing (always!)
git fetch origin
git rebase origin/dev
git push -u origin my-feature

# Create pull request targeting dev branch
gh pr create --title "Add my feature" --body "Description of changes" --base dev

# After PR is merged, clean up
git branch -d my-feature
```

**Key principles:** 
- **ALWAYS fetch before rebasing** - Without fetching, you're rebasing against a potentially days-old version!
- **Developers only work with dev branch** - All PRs go to dev, never to main (admin only)

---

## What is a Repository?

A repository is like a folder for your project. It stores all your files and tracks every change you make.

GitHub stores your repository online. Your computer has a local copy.

## Basic Daily Workflow

### Step 1: Get the Latest Updates
```bash
git fetch
```
This downloads information about new changes. It doesn't change your files.

### Step 2: Switch to the Right Branch
```bash
git switch main
```
This moves you to the main branch. Think of branches as different versions of your project.

### Step 3: Update Your Files
```bash
git pull --ff-only
```
This updates your files only if no conflicts exist. It's the safe way to update.

### Step 4: Create Your Own Branch
```bash
git switch -c my-feature
```
This creates a new branch for your work. You can work safely without affecting others.

### Step 5: Do Your Work
Edit your files. Add new features. Fix bugs.

### Step 6: Save Your Changes
```bash
git add .
git commit -m "Add new feature"
```
This saves your changes to the repository with a description.

### Step 7: Share Your Work
```bash
git push
```
This uploads your changes to GitHub.

## Essential Commands

### Moving Between Branches
- `git switch branch-name` - Go to another branch
- `git switch -c new-branch` - Create and go to new branch

### Fixing Mistakes
- `git restore file.txt` - Undo changes to one file
- `git restore --staged file.txt` - Remove file from staging area

### Getting Updates
- `git fetch` - **CRITICAL: Download info about changes (always do this first!)**
- `git pull` - Download and merge changes
- `git pull --rebase` - Download changes and keep history clean

> ⚠️ **WARNING**: Never rebase without fetching first! Your local git might have stale branch info from days ago.

### Sharing Work  
- `git push` - Send your changes to GitHub
- `git push -u origin branch-name` - Send new branch to GitHub

## Working with Others

### When Someone Else Makes Changes

1. **Get their changes first**
   ```bash
   git fetch
   git pull --rebase
   ```

2. **Fix conflicts if they happen**
   - Git will mark conflicted files
   - Edit files to fix conflicts
   - Run `git add .` then `git rebase --continue`

3. **Push your combined work**
   ```bash
   git push
   ```


## Three Ways to Pull Changes

### 1. Regular Merge (Default)
```bash
git pull
```
- Creates a merge commit
- Shows that work happened in parallel
- Most common in teams

### 2. Rebase (Clean History)
```bash
git pull --rebase
```
- Makes history look like a straight line
- Cleaner but changes commit IDs
- Good for personal branches

### 3. Fast-Forward Only (Safest)
```bash
git pull --ff-only
```
- Only works if you have no new commits
- Prevents accidental merges
- Use when starting work each day

## Pull Requests on GitHub

### Creating a Pull Request

**Option 1: Command Line (using GitHub CLI)**
```bash
gh pr create --title "Add my feature" --body "Description of changes" --base dev
```

**Option 2: GitHub Website**
1. Push your branch to GitHub
2. Go to GitHub website
3. Click "New Pull Request" 
4. **Important: Change target branch to `dev`** (not main!)
5. Write description of your changes
6. Click "Create Pull Request"

> **⚠️ CRITICAL**: Always target the `dev` branch, never `main`. Only admins merge dev → main.

### Reviewing Pull Requests
1. Read the changes
2. Test the code if possible
3. Leave comments on specific lines
4. Approve or request changes
5. Merge when ready

### Merge Options
- **Create merge commit** - Keeps full history
- **Squash and merge** - Combines all commits into one
- **Rebase and merge** - Keeps individual commits but makes linear history

## Useful GitHub Aliases

Add these shortcuts to make commands faster:

```bash
# Basic shortcuts
git config --global alias.co checkout
git config --global alias.sw switch  
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status

# Advanced shortcuts
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual '!gitk'

# Pull request shortcuts
git config --global alias.pf 'pull --ff-only'
git config --global alias.pr 'pull --rebase'
git config --global alias.po 'push origin'

# Branch management
git config --global alias.bd 'branch -d'
git config --global alias.bdf 'branch -D'
git config --global alias.sw-c 'switch -c'

# Viewing history
git config --global alias.lg "log --oneline --decorate --graph"
git config --global alias.ls 'log --pretty=format:"%C(yellow)%h%Cred%d\\ %Creset%s%Cblue\\ [%cn]" --decorate'

# Stash shortcuts
git config --global alias.sl 'stash list'
git config --global alias.sa 'stash apply'
git config --global alias.ss 'stash save'
```

### Using Aliases
After setting up aliases, use them like this:
- `git co main` instead of `git checkout main`
- `git sw feature-branch` instead of `git switch feature-branch`
- `git pf` instead of `git pull --ff-only`
- `git lg` instead of `git log --oneline --decorate --graph`

## Common Problems and Solutions

### Problem: "Cannot fast-forward"
**Solution:** Use `git pull --rebase` or `git pull` instead

### Problem: Merge conflicts
**Solution:** 
1. Edit conflicted files
2. Remove conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
3. Run `git add .`
4. Run `git commit` or `git rebase --continue`

### Problem: Pushed wrong commits
**Solution:** Don't force push. Create new commits to fix the problem.

### Problem: Lost work
**Solution:** Use `git reflog` to find lost commits

### Problem: Accidentally deleted branch
**Solution:** Use `git reflog` to find last commit, then recreate branch

## Best Practices

1. **⚠️ CRITICAL: Always fetch before rebasing** - Local git caches branch info that gets stale
2. **Always fetch before starting work**
3. **Use descriptive commit messages**
4. **Keep commits small and focused**
5. **Test before pushing**
6. **Use pull requests for team review**
7. **Delete branches after merging**
8. **Don't force push to shared branches**
9. **Backup important work by pushing regularly**

### ⚠️ Common Dangerous Mistake
**NEVER do this:**
```bash
git rebase origin/dev  # DANGER! Using potentially old cached info
```

**ALWAYS do this:**
```bash
git fetch origin       # Get latest info first
git rebase origin/dev  # Now rebase against actual latest
```

## Quiz Questions

### Basic Concepts
1. What command downloads information about remote changes without updating your files?
2. What's the difference between `git switch` and `git checkout`?
3. How do you create a new branch and switch to it in one command?
4. What does `git restore file.txt` do?
5. What's the safest way to update your local branch?

### Working with Others  
6. What are the three ways to merge changes when using `git pull`?
7. When would you use `git pull --rebase` instead of regular `git pull`?
8. What happens when you run `git pull --ff-only` and you have local commits?
9. How do you fix merge conflicts?
10. What's the first thing you should do each morning before starting work?

### Collaboration
11. What are the three merge options available in GitHub pull requests?
12. What's the most common way to merge changes in team projects?
13. How do you share a new branch with your team?
14. What command removes a branch after it's been merged?
15. Why shouldn't you force push to shared branches?

### Advanced Usage
16. How do you set `git pull --rebase` as your default pull strategy?
17. What's the difference between `git restore` and `git restore --staged`?
18. How do you see your commit history in a nice graph format?
19. What command shows you all recent actions in git (including deleted commits)?
20. How do you temporarily save your work without committing it?

## Answer Key

1. `git fetch`
2. `git switch` only changes branches; `git checkout` can change branches OR restore files
3. `git switch -c branch-name`
4. Discards changes to file.txt and restores it to the last committed version
5. `git pull --ff-only`
6. Default merge (creates merge commit), rebase (linear history), fast-forward only (safest)
7. When you want clean linear history without merge commits
8. The command fails with an error message
9. Edit conflicted files, remove conflict markers, then `git add .` and continue
10. `git fetch` followed by `git pull --ff-only`
11. Create merge commit, Squash and merge, Rebase and merge
12. Using GitHub pull requests (click merge button on website)
13. `git push -u origin branch-name`
14. `git branch -d branch-name`
15. It can overwrite other people's work and cause data loss
16. `git config pull.rebase true`
17. `git restore` affects working directory; `git restore --staged` affects staging area
18. `git log --oneline --decorate --graph` (or alias `git lg`)
19. `git reflog`
20. `git stash` or `git stash save "message"`