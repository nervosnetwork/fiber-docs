import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';

const ROOT = '/Users/sonny/fiber-docs';

// Recursively find .mdx and .md files
function findFiles(dir, result = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      findFiles(full, result);
    } else if (/\.(mdx|md)$/.test(entry)) {
      result.push(relative(ROOT, full));
    }
  }
  return result;
}

const files = findFiles(join(ROOT, 'content'));

const changes = [];

for (const rel of files) {
  const abs = resolve(ROOT, rel);
  const content = readFileSync(abs, 'utf8');

  // Only process files with a date frontmatter field
  if (!/^---[\s\S]*?^date\s*:/m.test(content)) continue;

  // Get last commit date
  let gitDate;
  try {
    // Use --format with a placeholder that won't be expanded by the shell
    gitDate = execSync(
      `git log -1 --format='%ad' --date=short -- "${rel}"`,
      { cwd: ROOT, encoding: 'utf8', shell: '/bin/bash' }
    ).trim();
  } catch {
    console.warn(`  [WARN] Could not get git date for ${rel}`);
    continue;
  }

  if (!gitDate) {
    console.warn(`  [WARN] No git history for ${rel}, skipping`);
    continue;
  }

  // Extract current date value (quoted or unquoted)
  const dateMatch = content.match(/^(date\s*:\s*)(['"]?)(\d{4}-\d{2}-\d{2})\2/m);
  if (!dateMatch) continue;

  const oldDate = dateMatch[3];
  const hasQuotes = dateMatch[2] !== '';
  const unchanged = oldDate === gitDate && !hasQuotes;

  if (unchanged) continue;

  // Replace: normalize to unquoted and update date
  const newContent = content.replace(
    /^(date\s*:\s*)(['"]?)(\d{4}-\d{2}-\d{2})\2/m,
    `$1${gitDate}`
  );

  writeFileSync(abs, newContent, 'utf8');
  changes.push({ file: rel, oldDate: `${dateMatch[2]}${oldDate}${dateMatch[2]}`, newDate: gitDate });
}

console.log('\n=== Date Update Summary ===\n');
if (changes.length === 0) {
  console.log('No changes needed.');
} else {
  for (const { file, oldDate, newDate } of changes) {
    console.log(`  ${file}`);
    console.log(`    ${oldDate}  ->  ${newDate}`);
  }
  console.log(`\nTotal: ${changes.length} file(s) updated.`);
}
