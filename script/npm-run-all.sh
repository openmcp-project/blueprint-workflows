#!/bin/bash
###################################################################
#script name	: npm run all
#description	: Run npm commands for all packages in a repo
#
#args         : -
###################################################################
set -e
resultPwd=$(pwd)
###################################################################
# Function to check if "node_modules" exists in a string
contains_node_modules() {
  local input_string="$1" # The string to check
  if [[ "$input_string" == *"node_modules"* ]]; then
    return 0 # Return true (0) if "node_modules" is found
  else
    return 1 # Return false (1) if not found
  fi
}
###################################################################
collect() {
  folders=()
  # always add typescript/packages/shared to be the first folder!
  folders+=("typescript/packages/shared")

  IFS=$'\n' # make newlines the only separator
  for dir in $(find . -type f -name '*tsconfig.json*' | sed -r 's|^\./||; s|/[^/]+$||' | sort | uniq); do
    if [ -f "$resultPwd/$dir/tsconfig.json" ] && [ -f "$resultPwd/$dir/package.json" ]; then
      if ! contains_node_modules "$dir"; then
        folders+=("$dir")
      fi
    fi
  done
  echo "${folders[@]}"
}
###################################################################
compareDirectoryDist() {

  if [ ! -d dist/ ]; then
    echo "Expected dist/ directory does not exist.  See status below:"
    ls -la ./
    exit 1
  fi
  if [ "$(git diff --ignore-space-at-eol --text dist/ | wc -l)" -gt "0" ]; then
    echo "Detected uncommitted changes after build. See status below:"
    git diff --ignore-space-at-eol --text dist/
    exit 1
  fi
  echo "dir: $1 / $(pwd)"
}
###################################################################
echo "###############################################################"

executeCmds=()

for arg in "$@"; do
  case $arg in
  --lint)
    executeCmds+=("npm run lint") # # error mcp-blueprint-gh-action/typescript/packages/helm-chart/linting/node_modules/fastq/test/tsconfig.json no such file or directory!
    ;;
  --package)
    executeCmds+=("rm -r ./dist/")
    executeCmds+=("npm run package")
    ;;
  --bundle)
    executeCmds+=("rm -r ./dist/")
    executeCmds+=("npm run bundle")
    ;;
  --audit-fix)
    executeCmds+=("npm audit fix")
    ;;
  --ci)
    executeCmds+=("npm ci")
    ;;
  --ci-test)
    executeCmds+=("npm run ci-test")
    ;;
  --local-test)
    executeCmds+=("npm run test")
    ;;
  --format-check)
    executeCmds+=("npm run format:check")
    ;;
  --format-write)
    executeCmds+=("npm run format:write")
    ;;
  --compare-directories)
    executeCmds+=("compareDirectoryDist \$dir")
    ;;
  *)
    echo "Unknown argument: $arg"
    exit 1
    ;;
  esac
done

for dir in $(collect); do
  if [ -f "$resultPwd/$dir/tsconfig.json" ] && [ -f "$resultPwd/$dir/package.json" ]; then
    if ! contains_node_modules "$dir"; then
      cd "$resultPwd/$dir" || exit
      echo "Found package at $dir..."
      for executeCmd in "${executeCmds[@]}"; do
        echo "--------------------------------------------------------------"
        echo "$executeCmd"
        eval "$executeCmd"
      done
      echo "###############################################################"
    fi
  else
    echo "$resultPwd/$dir/tsconfig.json no such file or directory!"
  fi
done
###################################################################
