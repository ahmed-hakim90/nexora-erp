import { PortalExperienceProviders } from "./portal-experience-providers";

export default function PortalExperienceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Portal providers must stay lightweight and must not load ERP module state.
  return <PortalExperienceProviders>{children}</PortalExperienceProviders>;
}
