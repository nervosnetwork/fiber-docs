import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const icons = new Set([
  'icon-copy.svg',
  'icon-checkmark.svg',
  'icon-chevron-down.svg',
  'icon-download.svg',
]);

// Repository development uses the root public assets directly. The standalone
// ZIP supplies these files in public/ instead and does not include this route.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ icon: string }> },
) {
  const { icon } = await params;
  if (!icons.has(icon)) return new Response(null, { status: 404 });
  const svg = await readFile(resolve(process.cwd(), '../../../public', icon), 'utf8');
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
}
