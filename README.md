# OKFL OS v0.6 — Vercel Fix

This package removes the environment-specific lock file that caused Vercel's `npm install` to fail.

## GitHub update
1. Delete `package-lock.json` from the repository if it is still present.
2. Upload all files from this package, including `.npmrc` and `.gitignore`.
3. Commit the changes.
4. Redeploy in Vercel with **Redeploy without build cache**.

Vercel should detect Next.js automatically. No custom build command or output directory is required.
