import { inferAsyncReturnType } from '@trpc/server';
import { verifyToken } from '../utils/handleAuth';
import { returnUserJwtPayload } from '../utils/handleAuth';
import { UserSession } from '../types/authTypes';

/**
 * Extract a cookie value from a Cookie header string
 */
function getCookieFromHeader(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match?.[1] ?? null;
}

/**
 * Creates context for an incoming request
 * trpc-nuxt passes the Nitro event as the opts parameter
 */
export const createContext = async (opts: { req?: { headers?: { cookie?: string } } }) => {
  // Try to get token from cookie (set by @sidebase/nuxt-auth)
  const cookieHeader = opts?.req?.headers?.cookie ?? null;
  const token = getCookieFromHeader(cookieHeader, 'auth.token');

  if (!token) return { user: null };

  try {
    const decoded = await verifyToken(token);
    const user = await returnUserJwtPayload(decoded);
    return { user };
  } catch {
    return { user: null };
  }
};

export type Context = inferAsyncReturnType<typeof createContext>;