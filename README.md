# Jianyu Cai — Portfolio

A responsive static portfolio for 蔡健宇. Open `index.html` locally, or serve this directory with any static web server. No package installation or build step is required.

## Content

- `portfolio-data.js`: 10 projects, credits, dates, awards, links and galleries.
- `index.html`: homepage, biography, recognition and contact.
- `styles.css`: responsive presentation and scroll-pinned project chapters.
- `app.js`: filters, frame selector, project dialogs, keyboard navigation and image viewer.
- `assets/`: optimized WebP images in full-size and small variants. Original image files remain untouched in the repository or their source folders.

The Way Back and 12 Twelve use their posters as the first project image. All project images retain their full aspect ratio. The immersive hero uses responsive framing; ultra-wide screens preserve the full sharp image with a blurred extension at the sides. Its three selectable frames feature The Way Back, 12 Twelve, and HKU Museum Culture Week.

Wide/tall screens use overlapping scroll-pinned chapters. Narrow or short screens use natural document flow; reduced-motion preferences also disable pinning and spring movement. Menus and project dialogs use interruptible, critically damped motion.

Project links can be shared as `#project/way-back`, `#project/shandong`, etc. Clicking the Shandong project photograph opens the supplied WeChat video URL.

To deploy, upload `index.html`, `styles.css`, `app.js`, `portfolio-data.js`, `favicon.svg` and the entire `assets/` directory to the same static site directory. The old original images are not required by the redesigned site. No external font or CSS CDN is required.
