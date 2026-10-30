# numunuu.com

Landing page for numunuu.com, hosted free on GitHub Pages. The domain stays registered at Hostinger.

## Files

- `index.html` – the page (edit the text here)
- `404.html` – shown for any address that doesn't exist
- `CNAME` – tells GitHub Pages this site is numunuu.com (don't delete it)
- `favicon.svg` – the browser tab icon

## Setup

1. Create a **public** GitHub repository named `numunuu-site` and push these files to `main`.
   (GitHub Pages is free for public repositories.)
2. Repository **Settings → Pages**: Source **Deploy from a branch**, Branch **main**, folder **/ (root)**, Save.
3. Same page, **Custom domain**: enter `numunuu.com`, Save.
4. In Hostinger DNS for numunuu.com:
   - Delete the existing **A** record for **@** (`2.57.91.91`).
   - Add four **A** records, Name **@**, one for each:
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - Edit the **www** CNAME to point to `YOUR-GITHUB-USERNAME.github.io`
   - Leave the **dictionary** CNAME alone.
5. When GitHub shows the DNS check passed, tick **Enforce HTTPS** (can take up to 24 hours to become available).

## Updating

Edit `index.html`, then:

```bash
git add . && git commit -m "Update landing page" && git push
```

The live site updates within a minute or two.
