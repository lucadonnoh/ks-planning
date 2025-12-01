import { NextRequest, NextResponse } from 'next/server';
import { markTopicDiscussed } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { discussed } = await request.json();
    const topicId = parseInt(params.id);

    const success = await markTopicDiscussed(topicId, discussed);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error marking topic as discussed:', error);
    return NextResponse.json({ error: 'Failed to update topic' }, { status: 500 });
  }
}
