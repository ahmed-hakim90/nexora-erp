export default function PortalExperienceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Portal providers must stay lightweight and must not load ERP module state.
  return <>{children}</>;
}
