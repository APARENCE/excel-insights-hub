// Controle de acesso por e-mail
// Cada e-mail tem permissões específicas para as páginas do sistema

export type PageKey = "dashboard" | "cliente" | "transportadora" | "importar";

export interface UserPermissions {
  [email: string]: PageKey[];
}

// E-mails autorizados e suas permissões
export const USER_PERMISSIONS: UserPermissions = {
  "renaultdobrasil.com@outlook.com": ["dashboard", "transportadora", "importar"],
  "patiotlog@outlook.com": [
    "dashboard",
    "cliente",
    "transportadora",
    "importar",
  ],
};

// Páginas públicas (acessíveis sem autenticação)
export const PUBLIC_PAGES: PageKey[] = [];

// Mapeia paths de rotas para chaves de página
export const ROUTE_TO_PAGE: Record<string, PageKey> = {
  "/": "dashboard",
  "/cliente": "cliente",
  "/transportadora": "transportadora",
  "/importar": "importar",
};

// Verifica se um e-mail tem permissão para uma página
export function hasPermission(email: string | undefined, page: PageKey): boolean {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();
  const permissions = USER_PERMISSIONS[normalizedEmail];
  if (!permissions) return false;
  return permissions.includes(page);
}

// Retorna as páginas permitidas para um e-mail
export function getAllowedPages(email: string | undefined): PageKey[] {
  if (!email) return [];
  const normalizedEmail = email.toLowerCase().trim();
  return USER_PERMISSIONS[normalizedEmail] || [];
}
