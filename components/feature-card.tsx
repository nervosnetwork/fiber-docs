interface FeatureCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  isLast?: boolean;
}

export default function FeatureCard({ title, description, children, isLast = false }: FeatureCardProps) {
  return (
    <div className={`self-stretch h-[560px] lg:h-[720px] border-l border-r ${!isLast ? 'border-b' : ''} border-invisible flex flex-col-reverse lg:flex-row justify-start items-start flex-shrink-0 gap-5 lg:gap-0`}>
      {/* Left side - Title and Description */}
      <div className="w-full lg:flex-1 h-auto lg:h-full px-4 pb-10 md:px-[120px] md:pb-10 lg:p-[120px] border-r-0 lg:border-r border-invisible flex flex-col justify-center items-start gap-5">
        <div className="self-stretch text-primary text-h2 font-bold">{title}</div>
        <div className="self-stretch text-tertiary text-body2">{description}</div>
      </div>
      
      {/* Right side - Custom Content */}
      <div className="w-full lg:flex-1 h-full px-4 md:px-[120px] lg:p-lg flex justify-center items-center">
        {children}
      </div>
    </div>
  );
}
