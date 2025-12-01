import { NextResponse } from 'next/server';
import { getPeople } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const people = await getPeople();
    return NextResponse.json(people, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error) {
    console.error('Error fetching people:', error);
    return NextResponse.json({ error: 'Failed to fetch people' }, { status: 500 });
  }
}
