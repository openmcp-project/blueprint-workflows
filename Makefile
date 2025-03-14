
# Image URL to use all building/pushing image targets
#IMG_VERSION ?= dev

SET_BASE_DIR := $(eval BASE_DIR=$(shell git rev-parse --show-toplevel))

# Setting SHELL to bash allows bash commands to be executed by recipes.
# Options are set to exit when a recipe line exits non-zero or a piped command fails.
SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec


.PHONY: npm-run-all
npm-run-all:
	$(PWD)/script/npm-run-all.sh --ci --bundle --audit-fix --ci-test

.PHONY: npm-run-bundle
npm-run-bundle:
	$(PWD)/script/npm-run-all.sh --bundle

.PHONY: npm-run-package
npm-run-package:
	$(PWD)/script/npm-run-all.sh --package

.PHONY: collect-folders
collect-folders:
	$(PWD)/script/collect-package-folders.sh

.PHONY: npm-run-ci-tests
npm-run-ci-tests:
	$(PWD)/script/npm-run-all.sh --ci-test

.PHONY: npm-run-local-tests
npm-run-local-tests:
	$(PWD)/script/npm-run-all.sh --local-tests

.PHONY: npm-run-ci
npm-run-ci:
	$(PWD)/script/npm-run-all.sh --ci

.PHONY: npm-run-format-check
npm-run-format-check:
	$(PWD)/script/npm-run-all.sh --format-check

.PHONY: npm-run-format-write
npm-run-format-write:
	$(PWD)/script/npm-run-all.sh --format-write

.PHONY: compare-directories
compare-directories:
	$(PWD)/script/npm-run-all.sh --compare-directories

.PHONY: all
all: npm-run-all
	
##@ General

# The help target prints out all targets with their descriptions organized
# beneath their categories. The categories are represented by '##@' and the
# target descriptions by '##'. The awk command is responsible for reading the
# entire set of makefiles included in this invocation, looking for lines of the
# file as xyz: ## something, and then pretty-format the target and help. Then,
# if there's a line with ##@ something, that gets pretty-printed as a category.
# More info on the usage of ANSI control characters for terminal formatting:
# https://en.wikipedia.org/wiki/ANSI_escape_code#SGR_parameters
# More info on the awk command:
# http://linuxcommand.org/lc3_adv_awk.php

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
