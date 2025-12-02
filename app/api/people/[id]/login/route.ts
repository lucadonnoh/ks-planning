import { NextRequest, NextResponse } from 'next/server';
import { updateLastLogin, getTopicsSince, getPersonByName } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const personId = parseInt(params.id);
    const { lastLogin } = await request.json();

    // Get new topics since last login
    const newTopics = await getTopicsSince(lastLogin, personId);

    // Update last login to now
    const newLastLogin = await updateLastLogin(personId);

    return NextResponse.json({
      newTopics,
      lastLogin: newLastLogin
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error) {
    console.error('Error updating login:', error);
    return NextResponse.json({ error: 'Failed to update login' }, { status: 500 });
  }
}
