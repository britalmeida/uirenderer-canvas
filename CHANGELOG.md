# Release Notes

A summary of noteworthy changes for each release. Made for humans. :roll_of_paper:  
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Wip wip...

## [1.1.1] - 2023-08-11

### Fixed
- Regression where `addImage` was no longer accepting null or undefined textures.


## [1.1.0] - 2023-08-05

### Shiny and New
- **New shapes** available: diamonds, arbitrary quads.
  `addDiamond`  `addQuad`
- Exposed `vec2` and `vec4` as types.
- **Improved image loading** and fallback: more efficient and color coded to grey while loading
for end-user feedback and to pink (out of resources) and green (binding mismatch) for developer
feedback.
- Performance and stability improvements.
- **Extensive refactor** for development comfort. These are an investment in code quality and
speed for internal use which can also affect clients:
  - JS->TS (#2),
  - linting (#4),
  - Vue 2->3 examples,
  - renamed directories.

### Experimental
- **Font** and Text Box support.  
  Bare minimum implementation with monospaced font and hardcoded font family, weight, color and
  shadow. `addText` renders a string of text with zoom independent size, while `addGlyph` is zoom
  dependent. `TextBox` has initial support for alignment and wrapping modes.

  **Inconsolata Note:** during development a .png file got added that caused errors for clients.
  This is now fixed, but if you've linked uirenderer-canvas *after* v1.0.6 up to v1.0.7-beta.3 and
  worked around the error, the workaround is no longer necessary and can be undone.

### Fixed
- Rendering more than one unique single image.


## [1.0.7] - 2023-08-05

The longest release in the making, thus far, and foretold to have a lifespan of only 5min.
:smiling_face_with_tear:  

This release rolls up longstanding changes marked as beta, but which are too big for a patch
version bump. It is immediately followed by a new minor version with no additional changes.
This is where we change to semantic versioning.

See actual changes in [1.1.0](#1.1.0)
