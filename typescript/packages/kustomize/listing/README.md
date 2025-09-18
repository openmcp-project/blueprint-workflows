# Kustomize Listing

GitHub Actions TypeScript action to collect all repository folders which contain Kustomize projects.

## Description

This action searches for `kustomization.yaml` or `kustomization.yml` files in a repository and creates a listing file with metadata about all found Kustomize projects.

## Features

- Searches for both `kustomization.yaml` and `kustomization.yml` files
- Extracts project information from Kustomization files
- Creates a comprehensive listing YAML file
- Supports GitHub Actions workflow integration

## Outputs

Creates a `kustomize-listing.yaml` file in the workspace root containing:
- Directory path
- Project name (from namePrefix/nameSuffix or folder name)
- Folder name
- Relative path
- Manifest path
- Kustomization file type used

## Usage

This package is designed to be used as part of a larger GitHub Actions workflow for Kustomize project management.

## Dependencies

- @actions/core
- @actions/github
- yaml
- semver
- loglevel
