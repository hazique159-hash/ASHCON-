import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@ca/ui";
import { NAV_ITEMS } from "../navigation/nav";

/** Breadcrumb trail derived from the route + navigation registry. */
export function Breadcrumbs() {
  const { pathname } = useLocation();
  if (pathname === "/") return null;

  const current = NAV_ITEMS.find((item) => item.path !== "/" && pathname.startsWith(item.path));

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <Link to="/" className="transition-colors hover:text-foreground">
            Dashboard
          </Link>
        </BreadcrumbItem>
        {current ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{current.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
