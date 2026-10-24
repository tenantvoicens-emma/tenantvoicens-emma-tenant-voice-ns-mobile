type PageContainerProps = {
  children: React.ReactNode;
};

export default function PageContainer({
  children,
}: PageContainerProps) {
  return (
    <div className="mx-auto max-w-md px-5 py-6">
      {children}
    </div>
  );
}