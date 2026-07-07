// Client-side middleware that attaches the user's active workspace id
// as an `x-active-org` header to every server-fn call so backend queries
// can scope by the workspace the user selected in the UI.
import { createMiddleware } from "@tanstack/react-start";

const ACTIVE_ORG_STORAGE = "lovable.activeOrgId";

export const attachActiveOrg = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let orgId: string | null = null;
    try {
      if (typeof window !== "undefined") {
        orgId = window.localStorage.getItem(ACTIVE_ORG_STORAGE);
      }
    } catch {
      orgId = null;
    }
    return next({
      headers: orgId ? { "x-active-org": orgId } : {},
    });
  },
);
