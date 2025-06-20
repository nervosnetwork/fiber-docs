import { source } from "@/lib/source";
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { getMDXComponents } from "@/mdx-components";
import { VersionBadge } from "@/components/VersionBadge";

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDXContent = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <div className="mb-4">
        <DocsTitle className="mb-4">{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        <VersionBadge
          author={page.data.author}
          authorUrl={page.data.authorUrl}
          date={
            typeof page.data.date === "string"
              ? page.data.date
              : page.data.date.toLocaleDateString()
          }
          dependencies={page.data.dependencies}
        />
      </div>

      <DocsBody>
        <MDXContent
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const author = page.data.author;
  const description =
    page.data.description ||
    (author ? `${page.data.title} - By ${author}` : page.data.title);

  return {
    title: page.data.title,
    description,
    authors: author ? [{ name: author, url: page.data.authorUrl }] : undefined,
  };
}
