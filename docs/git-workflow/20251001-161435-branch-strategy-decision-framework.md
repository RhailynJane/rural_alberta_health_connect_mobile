# Branch Strategy Decision Framework

**Created**: 2025-10-01 16:14:35

**Author**: Yue Zhou

**Purpose**: Personal decision-making framework for git branch management

---

## Overview

This document outlines my thinking framework for deciding between rebasing and merging when integrating changes between branches. This is my personal mental model to quickly evaluate the situation and make informed decisions.

## The Decision Matrix

Use this quick checklist to determine your approach:

| Question | Rebase | Merge |
|----------|--------|-------|
| Is this a personal/solo branch? | ✓ | |
| Are others working on this branch? | | ✓ |
| Do I want linear history? | ✓ | |
| Do I want to preserve exact history? | | ✓ |
| Is my commit history clean? | ✓ | Either |
| Is my commit history messy? | Consider squash | ✓ |
| Am I many commits behind? | ✓ | Either |

## The Three Core Strategies

### Strategy 1: Rebase Feature onto Target

**When to use:**
- Solo work on the feature branch
- Want clean, linear project history
- Commits are logical and well-organized
- Haven't shared the branch widely

**Mental model:**
> "I'm replaying my work on top of the latest target branch, as if I just started today"

**Command pattern:**
```bash
git checkout feature/my-feature
git fetch origin
git rebase origin/target-branch
# Resolve conflicts if any
git push --force-origin
```

**Why force-push is safe here:**
- Only I'm working on this branch
- Remote branch is just my backup
- No one else will be affected

### Strategy 2: Merge Target into Feature

**When to use:**
- Multiple people working on the feature
- Branch has been shared/pulled by others
- Want to preserve complete development history
- Less comfortable with rebase workflows

**Mental model:**
> "I'm bringing target's changes into my branch, keeping both histories intact"

**Command pattern:**
```bash
git checkout feature/my-feature
git fetch origin
git merge origin/target-branch
# Resolve conflicts once
git push origin feature/my-feature
```

**Why this is safer for teams:**
- No history rewriting
- All SHAs stay the same
- Others can pull without issues

### Strategy 3: Fresh Branch (Rare)

**When to use:**
- Current branch is extremely messy
- Want to cherry-pick specific commits
- Major refactoring of approach needed

**Mental model:**
> "Starting fresh, bringing over only what matters"

**This is usually overkill** - only use if branch is truly broken.

## My Personal Default Strategy

Based on my work style:

1. **During active development** (daily work):
   - Pull target changes regularly
   - Rebase frequently to stay current
   - Keep commits small and logical

2. **Before creating PR**:
   - One final rebase onto target
   - Ensure all tests pass
   - Clean, reviewable history

3. **If collaborating**:
   - Switch to merge strategy
   - Communicate with team
   - Never force-push shared branches

## The "Why" Behind Each Approach

### Why Rebase Creates Cleaner History

**Without rebase (merge):**
```
A---B---C---D (target)
     \       \
      E---F---G---H (feature with merge commit)
```

**With rebase:**
```
A---B---C---D (target)
             \
              E'---F'---G' (feature, replayed)
```

The second one is easier to read, understand, and review.

### Why Merge Is Safer for Teams

Rewriting history (rebase) changes commit SHAs:
- Commit E becomes E' (different SHA)
- Anyone who pulled E will have conflicts
- Their local branch diverges from remote

Merge preserves SHAs:
- Everyone's commits stay the same
- No confusion about "what happened"
- Pull requests work smoothly

## Context-Specific Decisions

### Scenario: Solo Feature, Many Commits Behind

**My choice:** Rebase
**Reasoning:** Clean history matters more than preserving original SHAs since only I'm affected.

### Scenario: Shared Feature, A Few Commits Behind

**My choice:** Merge
**Reasoning:** Team safety > history cleanliness. Don't break others' work.

### Scenario: Solo Feature, Just 1-2 Commits Behind

**My choice:** Either (slight preference for rebase)
**Reasoning:** Minimal difference, rebase is slightly cleaner but merge is fine too.

## Red Flags & Warnings

**Never rebase if:**
- ❌ Others have pulled your branch
- ❌ Branch is in a PR under review
- ❌ Commits are on main/master/production
- ❌ You're unsure about conflicts

**Never merge if:**
- ❌ You want to maintain linear history on main
- ❌ Team policy explicitly forbids merge commits
- ❌ You're about to create a "merge hell" (too many cross-merges)

## Quick Decision Tree

```
Are others working on this branch?
├─ YES → Merge target into feature
└─ NO  → Is history clean?
         ├─ YES → Rebase feature onto target
         └─ NO  → Is it very messy?
                  ├─ YES → Consider fresh branch (rare)
                  └─ NO  → Rebase, optionally squash
```

## My Workflow Pattern

This is what I typically do for a feature:

1. **Start**: Branch off target
   ```bash
   git checkout -b feature/ai-integration
   ```

2. **During development**: Regular commits
   ```bash
   git commit -m "Implement X"
   git commit -m "Fix Y"
   ```

3. **Stay current**: Rebase weekly (or as needed)
   ```bash
   git fetch origin
   git rebase origin/main
   ```

4. **Before PR**: Final rebase + cleanup
   ```bash
   git rebase -i origin/main  # Interactive to clean up
   git push --force-origin
   ```

5. **Create PR**: Merge into target via PR
   - GitHub/GitLab handles the merge
   - Usually squash or rebase merge depending on team

## Key Principles

1. **Linear history on main is valuable** - easier to understand project evolution
2. **Feature branch history matters less** - it's temporary workspace
3. **Safety > cleanliness when collaborating** - don't break teammates
4. **Consistency helps team coordination** - establish patterns together

## When in Doubt

**Default to merge** if:
- Unsure if others touched the branch
- Stakes are high (production code)
- You can clean it up later anyway

**You can always:**
- Squash merge when PR is approved
- Let the target branch maintainer decide
- Ask the team

## Recommended Team Policy (If I Were Leading)

For future team discussions:

**Personal Feature Branches:**
- Developer choice: rebase or merge
- Recommendation: rebase for cleaner history
- Must be current before PR

**Shared Feature Branches:**
- Merge only (no rebase)
- Clear communication required
- Regular syncs with target

**Main/Production Branches:**
- Never rebase (immutable history)
- Squash or rebase merge via PR
- Linear history maintained

## Resources for Deeper Learning

When I need to refresh my understanding:
- `git rebase --help` - official docs
- Visualize with: `git log --graph --oneline --all`
- Practice in throwaway repos before real work

## Reflection Notes

**What matters most to me:**
- Clean, understandable history for code review
- Not blocking or confusing teammates
- Efficient workflow (not too many steps)

**My natural tendency:**
- Prefer rebase for solo work
- Bias toward cleanliness
- Need to remember: team safety first

**Growth areas:**
- Get faster at resolving rebase conflicts
- Better at anticipating when branches become shared
- More proactive about keeping branches current

---

*This is a living document. Update as I learn and refine my approach.*
