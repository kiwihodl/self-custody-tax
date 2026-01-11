// Advisor client context management
// Handles "Viewing as [Client]" mode for advisors

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { hasClientAccess } from './clients';
import { logAdvisorAction, AuditActions } from './audit';
import type { PermissionLevel } from './types';

const CONTEXT_COOKIE_NAME = 'advisor_client_context';
const CONTEXT_MAX_AGE = 60 * 60 * 4; // 4 hours

interface ClientContext {
  clientId: string;
  clientEmail: string;
  clientName: string | null;
  permission: PermissionLevel;
  enteredAt: string;
}

/**
 * Enter client view mode
 */
export async function enterClientContext(
  advisorId: string,
  clientId: string,
  requestInfo?: { ipAddress?: string; userAgent?: string }
): Promise<{ success: true; context: ClientContext } | { success: false; error: string }> {
  // Verify access
  const access = await hasClientAccess(advisorId, clientId);
  if (!access.hasAccess) {
    return { success: false, error: 'You do not have access to this client' };
  }

  // Get client info
  const supabase = await createClient();
  const { data: client } = await supabase
    .from('user_profiles')
    .select('id, email, full_name')
    .eq('id', clientId)
    .single();

  if (!client) {
    return { success: false, error: 'Client not found' };
  }

  const context: ClientContext = {
    clientId: client.id,
    clientEmail: client.email,
    clientName: client.full_name,
    permission: access.permission!,
    enteredAt: new Date().toISOString(),
  };

  // Set context cookie
  const cookieStore = await cookies();
  cookieStore.set(CONTEXT_COOKIE_NAME, JSON.stringify(context), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CONTEXT_MAX_AGE,
    path: '/',
  });

  // Log the action
  logAdvisorAction({
    advisorId,
    clientId,
    action: AuditActions.ENTERED_CLIENT_VIEW,
    category: 'access',
    details: { permission: access.permission },
    ...requestInfo,
  });

  return { success: true, context };
}

/**
 * Exit client view mode
 */
export async function exitClientContext(
  advisorId: string,
  requestInfo?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  const context = await getClientContext();

  // Clear the cookie
  const cookieStore = await cookies();
  cookieStore.delete(CONTEXT_COOKIE_NAME);

  // Log if we were in a context
  if (context) {
    logAdvisorAction({
      advisorId,
      clientId: context.clientId,
      action: AuditActions.EXITED_CLIENT_VIEW,
      category: 'access',
      details: {
        duration_seconds: Math.floor(
          (Date.now() - new Date(context.enteredAt).getTime()) / 1000
        ),
      },
      ...requestInfo,
    });
  }
}

/**
 * Get current client context (if any)
 */
export async function getClientContext(): Promise<ClientContext | null> {
  try {
    const cookieStore = await cookies();
    const contextCookie = cookieStore.get(CONTEXT_COOKIE_NAME);

    if (!contextCookie?.value) {
      return null;
    }

    const context = JSON.parse(contextCookie.value) as ClientContext;

    // Verify it hasn't expired (additional check beyond cookie expiry)
    const enteredAt = new Date(context.enteredAt);
    const maxAge = CONTEXT_MAX_AGE * 1000;
    if (Date.now() - enteredAt.getTime() > maxAge) {
      // Expired, clear it
      const cookieStore = await cookies();
      cookieStore.delete(CONTEXT_COOKIE_NAME);
      return null;
    }

    return context;
  } catch {
    return null;
  }
}

/**
 * Get the effective user ID for data queries
 * Returns client ID if in context, otherwise the actual user ID
 */
export async function getEffectiveUserId(actualUserId: string): Promise<string> {
  const context = await getClientContext();
  return context?.clientId || actualUserId;
}

/**
 * Check if currently viewing as a client
 */
export async function isViewingAsClient(): Promise<boolean> {
  const context = await getClientContext();
  return context !== null;
}

/**
 * Check if advisor can edit in current context
 */
export async function canEditInContext(): Promise<boolean> {
  const context = await getClientContext();
  return context?.permission === 'manage';
}
