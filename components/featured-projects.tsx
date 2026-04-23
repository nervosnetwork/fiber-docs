import Image from 'next/image';
import Link from 'next/link';
import Section from './section';
import { showcaseProjects } from '@/app/showcase/data';

const featuredProjects = showcaseProjects.slice(0, 3);

function FeaturedProjectCard({
  project,
}: {
  project: (typeof showcaseProjects)[number];
}) {
  return (
    <div className="w-1/2 lg:flex-1 border border-invisible inline-flex flex-col justify-start items-start gap-sm hover-border-bright relative">
      {project.demoUrl && (
        <a
          href={project.demoUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open demo for ${project.title}`}
          className="absolute inset-0 z-10 cursor-pointer"
        />
      )}
      <div
        data-hovered="false"
        data-showgithub="true"
        data-showlink={project.demoUrl ? 'true' : 'false'}
        className={`w-full h-full md:h-48 p-sm inline-flex flex-col justify-start items-start gap-sm relative pb-sm ${
          project.demoUrl ? 'cursor-pointer pointer-events-none' : ''
        }`}
      >
        <div className="self-stretch inline-flex justify-between items-start">
          <div className="text-primary text-h4">{project.title}</div>
          <div className="hidden md:flex justify-end items-center gap-xs relative z-20 pointer-events-auto">
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/github.svg"
                alt="GitHub"
                width={16}
                height={16}
                className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
              />
            </a>
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Image
                  src="/external.svg"
                  alt="External"
                  width={16}
                  height={16}
                  className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                />
              </a>
            )}
          </div>
        </div>
        <div className="inline-flex flex-wrap justify-start items-center gap-xs">
          {project.tags.map((tag) => (
            <div
              key={tag}
              className="p-1 bg-layer-02 flex justify-center items-center"
            >
              <div className="text-primary text-xs font-normal font-['Inter'] leading-3 whitespace-nowrap">
                {tag}
              </div>
            </div>
          ))}
        </div>
        <div className="self-stretch text-tertiary text-body3 md:mb-0 mb-10">
          {project.description}
        </div>
        <div className="md:hidden absolute bottom-4 left-4 inline-flex justify-start items-center gap-xs relative z-20 pointer-events-auto">
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/github.svg"
              alt="GitHub"
              width={16}
              height={16}
              className="opacity-50 cursor-pointer"
            />
          </a>
          {project.demoUrl && (
            <a
              href={project.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/external.svg"
                alt="External"
                width={16}
                height={16}
                className="opacity-50 cursor-pointer"
              />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FeaturedProjects() {
  return (
    <Section
      title={
        <>
          <div>
            <span className="text-tertiary">Featured </span>
            Open-Source Projects
          </div>
          <div>
            <span className="text-tertiary">Built on Fiber Network. </span>
          </div>
        </>
      }
      showDivider={false}
    >
      <div className="self-stretch flex flex-wrap justify-start items-stretch">
        {featuredProjects.map((project) => (
          <FeaturedProjectCard key={project.id} project={project} />
        ))}
        <Link
          href="/showcase"
          data-hovered="false"
          data-orientation="Vertical"
          className="w-1/2 lg:w-48 md:h-48 p-sm border border-invisible inline-flex flex-col justify-center items-center gap-xs cursor-pointer hover-invert"
        >
          <Image src="/external.svg" alt="Arrow" width={20} height={20} />
          <div className="text-primary text-button md:whitespace-nowrap" style={{ lineHeight: '16px' }}>
            <div className="md:inline">VIEW ALL </div>
            <div className="md:inline">PROJECTS</div>
          </div>
        </Link>
      </div>
    </Section>
  );
}
