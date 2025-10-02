# 🚀 Complete Git Rebase Alias Guide

Here's your complete arsenal of rebase aliases with explanations and real-world use cases:

## 📋 **Quick Reference**

| Alias | Command | Purpose |
|-------|---------|---------|
| `git rb [branch]` | Smart Rebase | Daily syncing with progress output |
| `git rbs [branch]` | Auto-Stash Rebase | Rebase with dirty working tree |
| `git rbi [branch]` | Interactive Rebase | Clean up commit history |
| `git rbonto <target> <base>` | Advanced Rebase | Move commits between branches |
| `git rbcont` | Quick Continue | Resume rebase after conflicts |
| `git rbabort` | Emergency Exit | Abort rebase safely |

---

## 🎯 **1. `git rb [branch]` - Smart Rebase**

### What it does:
- Fetches latest changes from remote
- Shows progress with emojis and current branch name
- Rebases your current branch onto target branch (defaults to `dev`)
- Confirms success

### Sample Output:
```
🚀 Fetching latest changes from origin...
🔄 Rebasing feature/ai-integration onto origin/dev...
Successfully rebased and updated refs/heads/feature/ai-integration.
✅ Successfully rebased onto origin/dev!
```

### Use Cases:
```bash
git rb              # Rebase onto origin/dev (most common)
git rb main         # Rebase onto origin/main
git rb staging      # Rebase onto origin/staging
```

**When to use:** Daily workflow when you need to sync with the latest changes from your target branch.

---

## 🎨 **2. `git rbi [branch]` - Interactive Rebase**

### What it does:
- Same as `git rb` but opens interactive editor
- Lets you squash, reorder, edit, or drop commits
- Perfect for cleaning up commit history

### Use Cases:
```bash
git rbi             # Interactive rebase onto dev
git rbi main        # Clean up commits before merging to main
```

### Interactive Commands:
```bash
pick 1234567 Add user authentication
squash 8901234 Fix typo in auth
reword 5678901 Update user model
drop 2345678 Debug logging (remove this)
```

**When to use:** Before creating a pull request to clean up messy commit history.

**Pro tip:** Use commands like:
- `squash` - combine commits
- `reword` - edit commit message
- `drop` - remove commits
- `edit` - pause to amend commit

---

## 💾 **3. `git rbs [branch]` - Auto-Stash Rebase**

### What it does:
- Automatically stashes uncommitted changes with message "auto-stash for rebase"
- Performs the rebase
- Pops the stash back afterwards

### Use Cases:
```bash
git rbs             # You have uncommitted work but need to rebase
git rbs main        # Same but onto main branch
```

**When to use:** You're in the middle of coding but need to rebase urgently. No more "commit to save state" commits!

### Example scenario:
```bash
# You're coding and realize you need latest changes
# OLD WAY: 
git add . && git commit -m "wip" && git rb && git reset HEAD~1

# NEW WAY:
git rbs
```

---

## 🎯 **4. `git rbonto <target> <base>` - Advanced Rebase**

### What it does:
- Rebases commits between `base` and `HEAD` onto `target`
- Most advanced and powerful rebase technique
- Uses `git rebase --onto` under the hood

### Use Cases:
```bash
git rbonto main dev           # Move your commits from dev-base onto main
git rbonto staging feature    # Cherry-pick commit range to staging
```

### Visual Example:
```
Before:
  A---B---C  main
       \
        D---E---F  dev
             \
              G---H  feature (HEAD)

After git rbonto main dev:
  A---B---C  main
       \   \
        \   G'--H'  feature (HEAD)
         \
          D---E---F  dev
```

**When to use:** Complex branch management scenarios:
- Moving feature from one base branch to another
- Applying specific commit ranges to different branches
- Fixing branch hierarchy mistakes

---

## 🆘 **5. `git rbabort` - Emergency Exit**

### What it does:
- Aborts current rebase operation
- Returns repository to pre-rebase state
- Shows friendly "back to safety" message

### Use Cases:
```bash
git rbabort    # Things went wrong during rebase
```

### Sample Output:
```
🔥 Rebase aborted - back to safety!
```

**When to use:** 
- Rebase conflicts are too complex
- You made a mistake and want to start over
- Emergency escape when things go wrong

---

## ✅ **6. `git rbcont` - Quick Continue**

### What it does:
- Stages all changes (`git add .`)
- Continues the rebase (`git rebase --continue`)
- Shows success message

### Use Cases:
```bash
# After resolving conflicts manually:
git rbcont    # Instead of: git add . && git rebase --continue
```

### Sample Output:
```
✅ Rebase continued!
```

**When to use:** During rebase conflicts after you've resolved them manually in your editor.

---

## 🏆 **Pro Workflow Examples**

### **Daily Development:**
```bash
git checkout feature/new-api
git rbs                    # Stash work, rebase onto dev, restore work
# Continue coding...
```

### **Before Pull Request:**
```bash
git rbi                    # Clean up commit history
# In the interactive editor:
# - Squash "fix typo" commits
# - Reword commit messages
# - Drop debug commits
```

### **Emergency Branch Switch:**
```bash
# Oops! Built feature on wrong branch
git rbonto correct-base wrong-base
```

### **Conflict Resolution Workflow:**
```bash
git rb
# Conflicts appear in files...
# Open VS Code/editor and resolve conflicts manually
# Remove conflict markers: <<<<<<< ======= >>>>>>>
git rbcont                 # Quick continue
```

---

## 🧠 **Advanced Configuration**

### **Disable Cherry-pick Warnings:**
```bash
git config --global advice.skippedCherryPicks false
```

### **Enable Auto-stash for ALL rebases:**
```bash
git config --global rebase.autoStash true
```

### **Better Conflict Resolution Display:**
```bash
git config --global merge.conflictStyle diff3
```

### **Show Original Base in Conflicts:**
```bash
git config --global merge.conflictStyle zdiff3
```

---

## 🎯 **When Each Alias Shines**

| Alias | Best For | Frequency | Complexity |
|-------|----------|-----------|------------|
| `git rb` | Daily syncing | 🔥🔥🔥🔥🔥 | ⭐ |
| `git rbs` | Dirty working tree | 🔥🔥🔥🔥 | ⭐⭐ |
| `git rbi` | PR preparation | 🔥🔥🔥 | ⭐⭐⭐ |
| `git rbonto` | Complex branching | 🔥🔥 | ⭐⭐⭐⭐⭐ |
| `git rbcont` | Conflict resolution | 🔥🔥🔥 | ⭐⭐ |
| `git rbabort` | Emergency escape | 🔥 | ⭐ |

---

## 🛡️ **Safety Tips**

### **Before Rebasing:**
1. **Always commit or stash your work** (or use `git rbs`)
2. **Make sure you're on the right branch**: `git branch --show-current`
3. **Know your target branch**: Don't rebase onto random branches

### **During Conflicts:**
1. **Read the conflict markers carefully**
2. **Test your resolution**: Make sure code still works
3. **Don't rush**: Take time to understand the conflicts

### **Recovery Commands:**
```bash
# If you mess up during rebase:
git rbabort                    # Safe exit

# If you completed rebase but want to undo:
git reflog                     # Find previous state
git reset --hard HEAD@{n}     # Reset to previous state
```

---

## 🎓 **Mastery Checklist**

- [ ] Use `git rb` for daily syncing
- [ ] Master `git rbi` for clean commit history
- [ ] Use `git rbs` when working directory is dirty
- [ ] Understand `git rbonto` for advanced scenarios
- [ ] Know `git rbabort` as your safety net
- [ ] Practice conflict resolution with `git rbcont`
- [ ] Configure global rebase settings
- [ ] Share this guide with your team

---

## 🤝 **Team Adoption**

Share these aliases with your team:

```bash
# Each team member runs these commands:
git config --global alias.rb '!f() { target=${1:-dev}; echo "🚀 Fetching latest changes from origin..."; git fetch origin && echo "🔄 Rebasing $(git branch --show-current) onto origin/$target..."; git rebase origin/$target && echo "✅ Successfully rebased onto origin/$target!"; }; f'

git config --global alias.rbs '!f() { git stash push -m "auto-stash for rebase" && git fetch origin && git rebase origin/${1:-dev} && git stash pop; }; f'

git config --global alias.rbi '!f() { git fetch origin && git rebase -i origin/${1:-dev}; }; f'

git config --global alias.rbonto '!f() { git fetch origin && git rebase --onto origin/$1 origin/$2 HEAD; }; f'

git config --global alias.rbabort '!git rebase --abort && echo "🔥 Rebase aborted - back to safety!"'

git config --global alias.rbcont '!git add . && git rebase --continue && echo "✅ Rebase continued!"'
```

---

**Made with ❤️ for efficient Git workflows**

*This setup will make you look like a Git wizard to your teammates! 🧙‍♂️*