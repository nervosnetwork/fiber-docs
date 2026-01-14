import Divider from './divider';

interface SectionProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  showDivider?: boolean;
  layout?: 'vertical' | 'horizontal';
}

export default function Section({ title, children, className = '', showDivider = true, layout = 'vertical' }: SectionProps) {
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
