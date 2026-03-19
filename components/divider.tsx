interface DividerProps {
  className?: string;
}

export default function Divider({ className = '' }: DividerProps) {
  return (
    <div className={`flex w-full py-xxl items-start ${className}`}>
      <div className="w-full h-px border-invisible border-t"></div>
    </div>
  );
}
