'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Person {
  id: number;
  name: string;
  topic_count: number;
  discussed_count: number;
}

interface LeaderboardItem {
  title: string;
  description: string | null;
  presenter: string;
  vote_count: number;
  isSuggestion: boolean;
}

interface PastTopic {
  id: number;
  title: string;
  description: string | null;
  person_name: string;
}

export default function Home() {
  const [people, setPeople] = useState<Person[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [pastTopics, setPastTopics] = useState<PastTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupDone, setSetupDone] = useState(false);

  useEffect(() => {
    async function init() {
      // First try to fetch people
      try {
        const res = await fetch('/api/people');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setPeople(data);
            setSetupDone(true);
            await fetchLeaderboard();
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // Database might not be set up yet
      }

      // If no people, run setup
      try {
        await fetch('/api/setup');
        const res = await fetch('/api/people');
        const data = await res.json();
        setPeople(data);
        setSetupDone(true);
        await fetchLeaderboard();
      } catch (e) {
        console.error('Setup failed:', e);
      }
      setLoading(false);
    }

    async function fetchLeaderboard() {
      try {
        const [topicsRes, suggestionsRes, discussedRes] = await Promise.all([
          fetch('/api/topics'),
          fetch('/api/suggestions'),
          fetch('/api/topics/discussed')
        ]);
        const topics = await topicsRes.json();
        const suggestions = await suggestionsRes.json();
        const discussed = await discussedRes.json();

        setPastTopics(discussed);

        const allItems: LeaderboardItem[] = [
          ...topics.map((t: any) => ({
            title: t.title,
            description: t.description,
            presenter: t.person_name,
            vote_count: t.vote_count,
            isSuggestion: false
          })),
          ...suggestions.map((s: any) => ({
            title: s.title,
            description: s.description,
            presenter: s.claimed_by_name || 'Suggestion Box',
            vote_count: s.vote_count,
            isSuggestion: true
          }))
        ];

        allItems.sort((a, b) => b.vote_count - a.vote_count);
        setLeaderboard(allItems.slice(0, 3));
      } catch (e) {
        console.error('Failed to fetch leaderboard:', e);
      }
    }

    init();
  }, []);

  function getBadgeClass(active: number, discussed: number): string {
    const total = active + discussed;
    if (total === 0) return 'badge red';
    if (total < 3) return 'badge orange';
    return 'badge green';
  }

  function getBadgeText(active: number, discussed: number): string {
    const total = active + discussed;
    if (total >= 3) return `✓ ${total}`;
    return `${total}/3`;
  }

  if (loading) {
    return (
      <div className="container">
        <h1>Knowledge Sharing Planner</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!setupDone || people.length === 0) {
    return (
      <div className="container">
        <h1>Knowledge Sharing Planner</h1>
        <p>Database not configured. Make sure POSTGRES_URL is set in your environment.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Knowledge Sharing Planner</h1>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        Select your name to add topics you&apos;d like to present and vote on others&apos; topics.
      </p>

      {leaderboard.length > 0 && (
        <div className="leaderboard">
          <h2>Top 3 Most Wanted</h2>
          <ol className="leaderboard-list">
            {leaderboard.map((item, index) => (
              <li key={index} className="leaderboard-item">
                <span className="leaderboard-rank">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                <div className="leaderboard-content">
                  <span className="leaderboard-title">{item.title}</span>
                  {item.description && (
                    <span className="leaderboard-description">{item.description}</span>
                  )}
                  <span className="leaderboard-presenter">
                    {item.isSuggestion && item.presenter === 'Suggestion Box'
                      ? '📦 Suggestion Box'
                      : `by ${item.presenter}`}
                  </span>
                </div>
                <span className="leaderboard-votes">{item.vote_count} votes</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <h2>Select Yourself</h2>
      <div className="person-grid">
        {people.map((person) => (
          <Link
            key={person.id}
            href={`/${person.name.toLowerCase()}`}
            className="person-card"
          >
            <div className="name">{person.name}</div>
            <span className={getBadgeClass(person.topic_count, person.discussed_count)}>
              {getBadgeText(person.topic_count, person.discussed_count)}
            </span>
          </Link>
        ))}
      </div>

      {pastTopics.length > 0 && (
        <>
          <h2>Past Topics</h2>
          <p style={{ color: '#666', marginBottom: '15px' }}>
            Topics that have already been presented
          </p>
          <ul className="past-topics-list">
            {pastTopics.map((topic) => (
              <li key={topic.id} className="past-topic-item">
                <span className="past-topic-check">✓</span>
                <div className="past-topic-content">
                  <span className="past-topic-title">{topic.title}</span>
                  <span className="past-topic-presenter">by {topic.person_name}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
