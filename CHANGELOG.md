# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2023-09-15

### Changed

- Reorganized filesystem APIs so they're easier to mock on different test platforms.

## [1.1.1] - 2023-09-11

### Fixed

- Restored `-v` command line argument to print the app's version.

## [1.1.0] - 2023-09-07

### Added

- Option to download all annotations.
- Option to read annotations from a local file instead of online.

### Changed

- Simplified login instructions slightly.

### Fixed

- Handle `purple` and `dark_blue` mark colors.
- Don't require a login cookie to download document contents. As far as I know, they're all accessible by anyone now.

## [1.0.0] - 2023-09-04

### Added

- Load and view notes and annotations from https://www.churchofjesuschrist.org.
- Navigation in CLI by arrow keys.

[1.1.2]: https://github.com/AverageHelper/gospel-library-export/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/AverageHelper/gospel-library-export/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/AverageHelper/gospel-library-export/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/AverageHelper/gospel-library-export/releases/tag/v1.0.0
