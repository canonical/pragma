# react-ds-core-form

The collection of Form Components in the DS25.

## Architecture

This package uses the same build as `ds-core` in the same folder. All comments made on the README.md file apply here.

## Notes

+ This package uses MSW to mock back-end requests - in particular related to field-level middleware. For that purpose, this package exposes a unique command, `init:msw` which populates the public folder with the service worker necessary to intercept requests with our mock API. This script only has to be run once, but is nevertheless kept on the package.json for reference.
