import { NextRequest, NextResponse } from 'next/server';
import { toggleTopicVote } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { voterId } = await request.json();
    const topicId = parseInt(params.id);

    if (!voterId) {
      return NextResponse.json({ error: 'voterId is required' }, { status: 400 });
    }

    const voted = await toggleTopicVote(topicId, voterId);
    return NextResponse.json({ voted });
  } catch (error) {
    console.error('Error toggling vote:', error);
    return NextResponse.json({ error: 'Failed to toggle vote' }, { status: 500 });
  }
}
