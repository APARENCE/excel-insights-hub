import type { ReactNode } from "react";
import { useEffect, useState } from "react";

/**
 * Universal navigation link that works with both TanStack Router (Lovable preview)
 * and React Router DOM (Vercel SPA build). Uses History API navigation when
 * available to avoid full page reloads, falling back to standard <a> behavior.
 */
export function NavLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    window.history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  return (
    <a href={to} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

export function usePathname() {
  const [pathname, setPathname] = useState(() =>
    typeof window === "undefined" ? "/" : window.location.pathname,
  );
  useEffect(() => {
    function update() {
      setPathname(window.location.pathname);
    }
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return pathname;
}
