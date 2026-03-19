import Divider from './divider';

interface SectionProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  showDivider?: boolean;
  layout?: 'vertical' | 'horizontal' | 'responsive'; // Add responsive option
}

export default function Section({ title, children, className = '', showDivider = true, layout = 'vertical' }: SectionProps) {
  // Responsive layout: vertical on mobile, horizontal on md+
  if (layout === 'responsive') {
    return (
      <>
        <section className={`self-stretch flex flex-col lg:flex-row justify-start items-start gap-lg mb-xxl ${className}`}>
          {title && (
            <h1 className="w-full lg:flex-[3] text-primary mb-xl lg:mb-0">
              {title}
            </h1>
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
          {title && (
            <h1 className="flex-[3] text-primary">
              {title}
            </h1>
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
        {title && (
          <h1 className="self-stretch justify-center text-primary mb-xl">
            {title}
          </h1>
        )}
        {children}
      </section>
      {showDivider && <Divider />}
    </>
  );
}
