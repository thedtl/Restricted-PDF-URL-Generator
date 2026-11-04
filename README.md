# Restricted PDF URL Generator

Published at https://thedtl.github.io/Restricted-PDF-URL-Generator/.
This is separate from the streaming chapter-link generator.

Allow download starts selected, including after Clear. Staff can uncheck it
before generating a link; existing generated links keep their own setting.

Short Display contains only the parsed book title and subtitle. It does not append
authors, publication details, series volumes or editions. Missing titles and parsed
publication imprints leave it empty for manual entry instead of copying the whole
citation. Existing manual Short Display and footnote edits are preserved.
The full citation and footnote keep their bibliographic details.

Run the PDF-free formatting/link checks with `node --test test-display-defaults.cjs`.
These checks do not establish fresh metadata-reading accuracy. No extra AI calls,
reader changes or Worker deployment are required for these display defaults.
