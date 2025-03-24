#!/bin/bash
###################################################################
#Script Name  : Helm Chart Metadat Validation
#Description  : Validates if helm chart metadata contains required fields
#Args         : -
#Hint         : execute this script from github repository root!
###################################################################
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
# shellcheck disable=SC1091
source "$SCRIPT_DIR"/../../shared-variables.sh
declare resultPwd newLineString helmChartListingFileName msgHelpStart

set +e
echo "The script you are running has:"
echo "basename: [$(basename "$0")]"
echo "dirname : [$(dirname "$0")]"
echo "pwd     : [$(pwd)]"

cmd="yq"
###################################################################
if [ -z "$BASH_SCRIPT" ]; then
  echo "!!! ERROR: \$BASH_SCRIPT NEEDS TO BE SET e.g. \"export BASH_SCRIPT=helm-chart-metadata-validation.sh\"!!!" >> "$resultPwd/pr-status-check-human-friendly.txt"
  exit 1
fi

declare -a filesToRemove=("pr-status-check-human-friendly.txt")
REMOVE_FILES_IF_EXISTS "$resultPwd" "${filesToRemove[@]}"

ASSERT_FILE_EXISTS_WITH_MSG "$resultPwd" "$helmChartListingFileName" "Run helm-chart-listing.sh first!!"

declare -a variablesToCheck=(".apiVersion" ".name" ".description" ".type" ".version" ".appVersion" ".icon" ".sources" ".kubeVersion" ".home" ".maintainers" ".annotations" ".keywords" ".deprecated")
###################################################################
echo "$newLineString" >> "$resultPwd/pr-status-check-human-friendly.txt"
echo "\$ $cmd --version" >> "$resultPwd/pr-status-check-human-friendly.txt"
$cmd --version
echo "$newLineString" >> "$resultPwd/pr-status-check-human-friendly.txt"
###################################################################

echo -e "# $newLineString\n# Use command to template manifests of helm charts on your local machine!\n$msgHelpStart" >> "$resultPwd/pr-status-check-human-friendly.txt"

while read -r dir
do
  
  if [ ! -f "$dir/Chart.yaml" ]; then
    echo "ERROR $dir/Chart.yaml missing!!" >> "$resultPwd/pr-status-check-human-friendly.txt"
    exitCode=1
  fi

  for variableToCheck in "${variablesToCheck[@]}"
  do
    # Use yq to check if the variable exists in the YAML file
    if ! yq eval -e "$variableToCheck" "$dir/Chart.yaml" &> /dev/null; then
      #echo "Variable $variableToCheck exist in the YAML file $dir/Chart.yaml"        
    #else 
      echo "Variable $variableToCheck does not exist in the YAML file $dir/Chart.yaml" >> "$resultPwd/pr-status-check-human-friendly.txt"
      exitCode=1      
    fi
  done  
  
done < "$helmChartListingFileName"
exit "$exitCode"
###################################################################