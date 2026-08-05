import Divider from './divider';

interface SectionProps {
  title?: React.ReactNode;
  titleDescription?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  showDivider?: boolean;
  layout?: 'vertical' | 'horizontal' | 'responsive'; // Add responsive option
  headerLayout?: 'stacked' | 'split';
}

export default function Section({
  title,
  titleDescription,
  description,
  children,
  className = '',
  showDivider = true,
  layout = 'vertical',
  headerLayout = 'stacked',
}: SectionProps) {
  // Responsive layout: vertical on mobile, horizontal on md+
  if (layout === 'responsive') {
    return (
      <>
        <section className={`self-stretch flex flex-col lg:flex-row justify-start items-start gap-lg mb-xxl ${className}`}>
          {(title || titleDescription || description) && (
            <div className="w-full lg:flex-[3] mb-xl lg:mb-0">
              {title && <h1 className="text-primary">{title}</h1>}
              {titleDescription && <div className="mt-md">{titleDescription}</div>}
              {description && <div className="mt-md">{description}</div>}
            </div>
          )}
          <div className="w-full lg:flex-[7]">
            {children}
          </div>
        </section>
        {showDivider && <Divider />}
      </>
    );
  }

  if (layout === 'horizontal') {
    return (
      <>
        <section className={`self-stretch flex justify-start items-start gap-lg mb-xxl ${className}`}>
          {(title || titleDescription || description) && (
            <div className="flex-[3]">
              {title && <h1 className="text-primary">{title}</h1>}
              {titleDescription && <div className="mt-md">{titleDescription}</div>}
              {description && <div className="mt-md">{description}</div>}
            </div>
          )}
          <div className="flex-[7]">
            {children}
          </div>
        </section>
        {showDivider && <Divider />}
      </>
    );
  }

  return (
    <>
      <section className={`self-stretch inline-flex flex-col justify-start items-start mb-xxl ${className}`}>
        {(title || titleDescription || description) && (
          <div
            className={`self-stretch ${
              headerLayout === 'split'
                ? 'flex flex-col md:flex-row justify-between items-start gap-lg'
                : ''
            } mb-xl`}
          >
            {headerLayout === 'split' ? (
              <>
                {(title || titleDescription) && (
                  <div className="min-w-0 flex-1">
                    {title && <h1 className="justify-center text-primary">{title}</h1>}
                    {titleDescription && <div className="mt-md">{titleDescription}</div>}
                  </div>
                )}
                {description && (
                  <div className="w-full md:w-auto md:ml-auto">{description}</div>
                )}
              </>
            ) : (
              <>
                {title && <h1 className="justify-center text-primary">{title}</h1>}
                {titleDescription && <div className="mt-md">{titleDescription}</div>}
                {description && <div className="mt-md">{description}</div>}
              </>
            )}
          </div>
        )}
        {children}
      </section>
      {showDivider && <Divider />}
    </>
  );
}
