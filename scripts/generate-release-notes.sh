#!/bin/bash
# Generate release notes from commits since last release tag
# Usage: ./scripts/generate-release-notes.sh [next-version]

set -e

# Get the latest release tag
LAST_TAG=$(git tag --sort=-version:refname | head -1)

if [ -z "$LAST_TAG" ]; then
  echo "No release tags found"
  exit 1
fi

# Next version (optional argument)
NEXT_VERSION=${1:-"vX.X.X"}

echo "## What's Changed in $NEXT_VERSION"
echo ""

# Get commits since last tag, excluding merge commits
COMMITS=$(git log "$LAST_TAG"..HEAD --pretty=format:"%s" --no-merges)

# Arrays for different commit types
declare -a FEATURES=()
declare -a FIXES=()
declare -a DOCS=()
declare -a CHORES=()
declare -a OTHERS=()

# Categorize commits
while IFS= read -r commit; do
  [ -z "$commit" ] && continue

  # Remove Co-Authored-By and emoji lines
  commit=$(echo "$commit" | head -1)

  if [[ "$commit" =~ ^feat ]]; then
    # Remove "feat: " or "feat(scope): " prefix, capitalize first letter
    msg=$(echo "$commit" | sed -E 's/^feat(\([^)]+\))?:\s*//' | sed 's/^ *//')
    msg=$(echo "${msg:0:1}" | tr '[:lower:]' '[:upper:]')${msg:1}
    FEATURES+=("$msg")
  elif [[ "$commit" =~ ^fix ]]; then
    msg=$(echo "$commit" | sed -E 's/^fix(\([^)]+\))?:\s*//' | sed 's/^ *//')
    msg=$(echo "${msg:0:1}" | tr '[:lower:]' '[:upper:]')${msg:1}
    FIXES+=("$msg")
  elif [[ "$commit" =~ ^docs ]]; then
    msg=$(echo "$commit" | sed -E 's/^docs(\([^)]+\))?:\s*//' | sed 's/^ *//')
    msg=$(echo "${msg:0:1}" | tr '[:lower:]' '[:upper:]')${msg:1}
    DOCS+=("$msg")
  elif [[ "$commit" =~ ^(chore|ci|build|refactor|perf|test|style) ]]; then
    msg=$(echo "$commit" | sed -E 's/^(chore|ci|build|refactor|perf|test|style)(\([^)]+\))?:\s*//' | sed 's/^ *//')
    msg=$(echo "${msg:0:1}" | tr '[:lower:]' '[:upper:]')${msg:1}
    CHORES+=("$msg")
  elif [[ "$commit" =~ ^release ]]; then
    # Skip release commits
    continue
  else
    OTHERS+=("$commit")
  fi
done <<< "$COMMITS"

# Print features
if [ ${#FEATURES[@]} -gt 0 ]; then
  echo "### ✨ New Features"
  echo ""
  for feat in "${FEATURES[@]}"; do
    echo "- $feat"
  done
  echo ""
fi

# Print fixes
if [ ${#FIXES[@]} -gt 0 ]; then
  echo "### 🐛 Bug Fixes"
  echo ""
  for fix in "${FIXES[@]}"; do
    echo "- $fix"
  done
  echo ""
fi

# Print docs
if [ ${#DOCS[@]} -gt 0 ]; then
  echo "### 📚 Documentation"
  echo ""
  for doc in "${DOCS[@]}"; do
    echo "- $doc"
  done
  echo ""
fi

# Print chores (ci, build, refactor, etc.)
if [ ${#CHORES[@]} -gt 0 ]; then
  echo "### 🔧 Maintenance"
  echo ""
  for chore in "${CHORES[@]}"; do
    echo "- $chore"
  done
  echo ""
fi

# Print others
if [ ${#OTHERS[@]} -gt 0 ]; then
  echo "### 📝 Other Changes"
  echo ""
  for other in "${OTHERS[@]}"; do
    echo "- $other"
  done
  echo ""
fi

echo "---"
echo "**Full Changelog**: https://github.com/anthropics/packageflow/compare/$LAST_TAG...$NEXT_VERSION"
