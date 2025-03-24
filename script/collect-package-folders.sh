#!/bin/bash
###################################################################
#script name	: collect-package-folders.sh
#description	: This script collects all package folders in the repository
#
#args         : -
###################################################################

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

IFS=$'\n' # make newlines the only separator
folders=$(find . -type f -name '*tsconfig.json*' | sed -r 's|^\./||; s|/[^/]+$||' | sort | uniq)
packageFolders=()
# always add typescript/packages/shared to be the first folder!
packageFolders+=("typescript/packages/shared")
for dir in $folders; do
  if [ -f "$resultPwd/$dir/tsconfig.json" ] && [ -f "$resultPwd/$dir/package.json" ]; then
    if ! contains_node_modules "$dir"; then
      echo "found package at $dir"
      #cd "$resultPwd/$dir"
      packageFolders+=("$dir")
    fi
  else
    echo "$resultPwd/$dir/tsconfig.json no such file or directory!"
  fi
done

# Format as JSON array for GitHub Actions
json=$(printf '[%s]' "$(echo "${packageFolders[*]}" | jq -R -s -c 'split("\n")[:-1]')")
echo "JSON Array: $json"
echo "::set-output name=folders::$json"
###################################################################
