type PageContainerProps = {
  children: React.ReactNode;
  // Tablets get a little more room. On large screens, "wide" pages use
  // the whole panel (for side-by-side columns); "reading" pages such as
  // forms and policies stay at a comfortable line length.
  width?: "reading" | "wide";
};

const widths = {
  reading: "md:max-w-none lg:max-w-2xl",
  wide: "md:max-w-none lg:px-10",
};

export default function PageContainer({
  children,
  width = "reading",
}: PageContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-md px-5 py-6 ${widths[width]}`}>
      {children}
    </div>
  );
}
