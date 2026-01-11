// Advisor Client API - Single client operations
// GET - Get client details
// PATCH - Update client (notes, permission)
// DELETE - Remove client

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getClientLink,
  revokeAccess,
  updatePermission,
  updateClientNotes,
} from '@/lib/advisor/clients';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await getClientLink(user.id, id);

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  return NextResponse.json({ data: client });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { permission_level, notes } = body;

    const requestInfo = {
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    };

    // Update permission if provided
    if (permission_level !== undefined) {
      if (!['view', 'manage'].includes(permission_level)) {
        return NextResponse.json(
          { error: 'Permission level must be "view" or "manage"' },
          { status: 400 }
        );
      }

      const result = await updatePermission(user.id, id, permission_level, requestInfo);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    // Update notes if provided
    if (notes !== undefined) {
      if (typeof notes !== 'string') {
        return NextResponse.json(
          { error: 'Notes must be a string' },
          { status: 400 }
        );
      }

      const result = await updateClientNotes(user.id, id, notes, requestInfo);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    // Fetch updated client
    const client = await getClientLink(user.id, id);
    return NextResponse.json({ data: client });
  } catch (error) {
    console.error('Failed to update client:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await revokeAccess(id, 'advisor', user.id, {
    ipAddress: request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    data: { message: 'Client removed successfully' },
  });
}
