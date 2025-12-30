interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

export function PageContainer({ children, title, actions }: PageContainerProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      {(title || actions) && (
        <div className="mb-8 flex items-center justify-between">
          {title && <h1 className="text-2xl font-bold">{title}</h1>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
