// src/components/common/Card.tsx
interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
  }
  
  export const Card: React.FC<CardProps> = ({ children, className, title }) => {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        {title && <h3 className="text-xl font-semibold mb-4">{title}</h3>}
        {children}
      </div>
    );
  };