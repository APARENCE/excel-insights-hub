import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Operação Spot Renault — Terminal Tlog" },
      {
        name: "description",
        content:
          "Sistema de gestão da operação Spot Renault no Terminal Tlog: estoque do pátio, controle de demurrage e vazios locados.",
      },
      { name: "author", content: "Tlog" },
      { property: "og:title", content: "Operação Spot Renault — Terminal Tlog" },
      {
        property: "og:description",
        content:
          "Gestão de estoque, demurrage e vazios locados — análise automática a partir de planilha Excel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Operação Spot Renault — Terminal Tlog" },
      { name: "description", content: "Upload Excel files to analyze yard capacity, movements, and demurrage." },
      { property: "og:description", content: "Upload Excel files to analyze yard capacity, movements, and demurrage." },
      { name: "twitter:description", content: "Upload Excel files to analyze yard capacity, movements, and demurrage." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f3430105-fc09-47f0-a4c9-870f3f6b4d49/id-preview-b6264231--9b8264b9-687e-4e91-947d-7bba1a193191.lovable.app-1776538364878.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f3430105-fc09-47f0-a4c9-870f3f6b4d49/id-preview-b6264231--9b8264b9-687e-4e91-947d-7bba1a193191.lovable.app-1776538364878.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
