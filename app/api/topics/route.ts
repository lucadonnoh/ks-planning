import { NextRequest, NextResponse } from 'next/server';
import { getTopics, createTopic, deleteTopic } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const topics = await getTopics(userId ? parseInt(userId) : undefined);
    return NextResponse.json(topics, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error) {
    console.error('Error fetching topics:', error);
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { personId, title, description } = await request.json();

    if (!personId || !title) {
      return NextResponse.json({ error: 'personId and title are required' }, { status: 400 });
    }

    const topic = await createTopic(personId, title, description || null);
    return NextResponse.json(topic);
  } catch (error) {
    console.error('Error creating topic:', error);
    return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { topicId, personId } = await request.json();

    if (!topicId || !personId) {
      return NextResponse.json({ error: 'topicId and personId are required' }, { status: 400 });
    }

    const deleted = await deleteTopic(topicId, personId);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    console.error('Error deleting topic:', error);
    return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 });
  }
}
