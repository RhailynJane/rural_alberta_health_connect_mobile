# CI Build Optimization - Android Timeout Fix

## Problem
GitHub Actions Android builds were timing out after 6 hours due to:
- Building 4 architectures (armeabi-v7a, arm64-v8a, x86, x86_64)
- New Architecture enabled
- Heavy native dependencies (WatermelonDB, Reanimated, Mapbox, Vision Camera, etc.)
- C++ native code compilation (CMake)
- No build caching
- Disabled parallelization (`--no-daemon`, `--no-parallel`)

## Solutions Applied

### 1. GitHub Actions Workflow (`native-build.yml`)

#### Added Build Timeout
```yaml
timeout-minutes: 60
```
Prevents jobs from running indefinitely; fails fast after 1 hour.

#### Added NPM Caching
```yaml
- name: Setup Node
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```
Caches `node_modules` between builds.

#### Added Java Setup
```yaml
- name: Setup Java
  uses: actions/setup-java@v4
  with:
    distribution: 'temurin'
    java-version: '17'
```
Ensures consistent Java version.

#### Added Gradle Caching
```yaml
- name: Setup Gradle
  uses: gradle/actions/setup-gradle@v4
  with:
    cache-read-only: false
    gradle-version: wrapper
```
Caches Gradle dependencies, build outputs, and wrapper - **major speedup**.

#### Reduced Architecture Count for CI
```yaml
env:
  ORG_GRADLE_PROJECT_reactNativeArchitectures: arm64-v8a
```
Builds only 1 architecture (arm64-v8a) instead of 4, reducing build time by ~75%.

#### Removed Problematic Flags
```bash
# BEFORE:
./gradlew assembleDebug --no-daemon --no-parallel

# AFTER:
./gradlew assembleDebug --max-workers=2
```
- Removed `--no-daemon`: Gradle daemon speeds up builds
- Removed `--no-parallel`: Allows parallel task execution
- Added `--max-workers=2`: Limits workers to prevent OOM on CI

### 2. Gradle Properties (`android/gradle.properties`)

Added performance optimizations:
```properties
org.gradle.caching=true
org.gradle.daemon=true
org.gradle.configureondemand=true
```

- `org.gradle.caching=true`: Enables build cache
- `org.gradle.daemon=true`: Keeps Gradle daemon alive between builds
- `org.gradle.configureondemand=true`: Only configures projects that are needed

## Expected Results

### Before:
- Build time: 6+ hours (timeout)
- Architecture builds: 4 (armeabi-v7a, arm64-v8a, x86, x86_64)
- No caching
- Sequential execution

### After:
- Build time: 15-30 minutes (estimated)
- Architecture builds: 1 (arm64-v8a for CI only)
- Full Gradle + NPM caching
- Parallel execution with controlled workers

## Additional Recommendations

### For Local Development
Keep all 4 architectures in `gradle.properties`:
```properties
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64
```

### For Production Builds
Consider splitting architectures:
```yaml
strategy:
  matrix:
    arch: [armeabi-v7a, arm64-v8a]
```

### Monitor Build Times
Check GitHub Actions run duration after these changes. If still slow:
1. Consider disabling New Architecture for CI: `newArchEnabled=false`
2. Skip C++ compilation: Add conditional CMake build
3. Use self-hosted runners with more resources

## Verification

After pushing these changes:
1. Monitor the next CI build in GitHub Actions
2. Check build time is under 30 minutes
3. Verify APK is generated successfully
4. Confirm caching works (second build should be faster)

## Rollback

If issues occur, revert to:
```bash
git revert <commit-hash>
```

Or manually:
1. Remove `timeout-minutes` from workflow
2. Restore `--no-daemon --no-parallel` flags
3. Remove Gradle caching setup
4. Remove architecture override
