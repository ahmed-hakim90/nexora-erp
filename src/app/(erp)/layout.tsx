export default function ErpExperienceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ERP providers must stay here, never in the root layout or portal shell.
  return <>{children}</>;
}
