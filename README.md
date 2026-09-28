# Fiber Documentation

Welcome to the Fiber documentation repository! This contains the official documentation for the Fiber project, built with [Fumadocs](https://fumadocs.vercel.app/).

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

For production deployment, you'll need to set up the following environment variables:

### Required for Devlog Functionality

```bash
# GitHub Personal Access Token for fetching devlog discussions
# Create at: https://github.com/settings/tokens
# Required scopes: 'public_repo'
GITHUB_TOKEN=your_github_personal_access_token_here
```

### Google Analytics (optional)

Set the GA4 measurement ID in the production deployment environment to enable
site-wide page-view and user analytics. When the variable is unset, no Google
Analytics script is loaded.

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

In the GA4 web data stream, keep **Enhanced measurement** enabled and make sure
both page loads and browser-history page changes are tracked. This records
client-side navigation in the Next.js app without custom page-view events.

## Automatic content merges

The `Auto-merge content PRs` workflow squash-merges non-draft PRs by `linnnsss`
targeting `master` when every changed file is under `content/blog/` or
`content/pulse/` (including images). Renames must have both their old and new
paths inside those directories. Changes to any other path require manual review.

The workflow checks PR updates immediately and retries open PRs every 30 minutes
(scheduled runs can be delayed by GitHub). It only merges when GitHub reports a
clean, mergeable PR, respects branch protection, and pins the merge to the
validated head SHA. Required reviews still need to be satisfied if configured.
It never checks out or executes PR code. The workflow must be on `master` to
activate; it also processes existing eligible PRs on its next scheduled run.

No PAT or repository Auto-merge setting is needed; GitHub Actions must be enabled
and allow the workflow's `contents: write` and `pull-requests: write` permissions.
Merges made with `GITHUB_TOKEN` do not trigger subsequent `push` workflows in
GitHub Actions. If deployment later relies on such a workflow, configure an
explicit deployment trigger or a GitHub App token first.

Run the automation regression tests with `node --test test/auto-merge-content.test.mjs`.

## Explore

In the project, you can see:

- `lib/source.ts`: Code for content source adapter, [`loader()`](https://fumadocs.dev/docs/headless/source-api) provides the interface to access your content.
- `app/layout.config.tsx`: Shared options for layouts, optional but preferred to keep.

| Route                     | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `app/(home)`              | The route group for your landing page and other pages. |
| `app/docs`                | The documentation layout and pages.                    |
| `app/api/search/route.ts` | The Route Handler for search.                          |

### Fumadocs MDX

A `source.config.ts` config file has been included, you can customise different options like frontmatter schema.

Read the [Introduction](https://fumadocs.dev/docs/mdx) for further details.

## Learn More

To learn more about Next.js and Fumadocs, take a look at the following
resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js
  features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Fumadocs](https://fumadocs.vercel.app) - learn about Fumadocs
