'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Person {
  id: number;
  name: string;
  topic_count: number;
  last_login?: string | null;
}

interface Topic {
  id: number;
  person_id: number;
  person_name: string;
  title: string;
  description: string | null;
  vote_count: number;
  voted_by_current_user: boolean;
  discussed: boolean;
}

const ADMIN_USERS = ['luca', 'adi'];

interface Suggestion {
  id: number;
  suggested_by: number;
  suggested_by_name: string;
  title: string;
  description: string | null;
  vote_count: number;
  voted_by_current_user: boolean;
  claimed_by: number | null;
  claimed_by_name: string | null;
}

export default function Dashboard() {
  const params = useParams();
  const personName = (params.person as string);

  const [currentUser, setCurrentUser] = useState<Person | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [myDiscussedTopics, setMyDiscussedTopics] = useState<Topic[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [newSuggestionTitle, setNewSuggestionTitle] = useState('');
  const [newSuggestionDesc, setNewSuggestionDesc] = useState('');
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [newTopicsSinceLogin, setNewTopicsSinceLogin] = useState<Topic[]>([]);

  useEffect(() => {
    async function load() {
      try {
        // Get all people to find current user
        const peopleRes = await fetch('/api/people');
        const people: Person[] = await peopleRes.json();
        const user = people.find(p => p.name.toLowerCase() === personName.toLowerCase());

        if (!user) {
          setLoading(false);
          return;
        }

        setCurrentUser(user);

        // Fetch topics and suggestions
        const [topicsRes, suggestionsRes, discussedRes] = await Promise.all([
          fetch(`/api/topics?userId=${user.id}`),
          fetch(`/api/suggestions?userId=${user.id}`),
          fetch('/api/topics/discussed')
        ]);

        setTopics(await topicsRes.json());
        setSuggestions(await suggestionsRes.json());
        const allDiscussed = await discussedRes.json();
        setMyDiscussedTopics(allDiscussed.filter((t: Topic) => t.person_id === user.id));

        // Check for new topics since last login and update last login
        const loginRes = await fetch(`/api/people/${user.id}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastLogin: user.last_login })
        });
        const loginData = await loginRes.json();
        if (loginData.newTopics && loginData.newTopics.length > 0) {
          setNewTopicsSinceLogin(loginData.newTopics);
        }
      } catch (e) {
        console.error('Error loading data:', e);
      }
      setLoading(false);
    }

    load();
  }, [personName]);

  async function refreshData() {
    if (!currentUser) return;

    const [topicsRes, suggestionsRes, peopleRes, discussedRes] = await Promise.all([
      fetch(`/api/topics?userId=${currentUser.id}`),
      fetch(`/api/suggestions?userId=${currentUser.id}`),
      fetch('/api/people'),
      fetch('/api/topics/discussed')
    ]);

    setTopics(await topicsRes.json());
    setSuggestions(await suggestionsRes.json());
    const allDiscussed = await discussedRes.json();
    setMyDiscussedTopics(allDiscussed.filter((t: Topic) => t.person_id === currentUser.id));

    const people: Person[] = await peopleRes.json();
    const user = people.find(p => p.id === currentUser.id);
    if (user) setCurrentUser(user);
  }

  async function addTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !newTopicTitle.trim()) return;

    await fetch('/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personId: currentUser.id,
        title: newTopicTitle.trim(),
        description: newTopicDesc.trim() || null
      })
    });

    setNewTopicTitle('');
    setNewTopicDesc('');
    refreshData();
  }

  async function deleteTopic(topicId: number) {
    if (!currentUser) return;

    await fetch('/api/topics', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId, personId: currentUser.id })
    });

    refreshData();
  }

  function startEditTopic(topic: Topic) {
    setEditingTopicId(topic.id);
    setEditTitle(topic.title);
    setEditDesc(topic.description || '');
  }

  function cancelEdit() {
    setEditingTopicId(null);
    setEditTitle('');
    setEditDesc('');
  }

  async function saveEditTopic(topicId: number) {
    if (!currentUser || !editTitle.trim()) return;

    await fetch('/api/topics', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topicId,
        personId: currentUser.id,
        title: editTitle.trim(),
        description: editDesc.trim() || null
      })
    });

    cancelEdit();
    refreshData();
  }

  async function voteOnTopic(topicId: number) {
    if (!currentUser) return;

    await fetch(`/api/topics/${topicId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterId: currentUser.id })
    });

    refreshData();
  }

  async function addSuggestion(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !newSuggestionTitle.trim()) return;

    await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suggestedBy: currentUser.id,
        title: newSuggestionTitle.trim(),
        description: newSuggestionDesc.trim() || null
      })
    });

    setNewSuggestionTitle('');
    setNewSuggestionDesc('');
    refreshData();
  }

  async function voteOnSuggestion(suggestionId: number) {
    if (!currentUser) return;

    await fetch(`/api/suggestions/${suggestionId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterId: currentUser.id })
    });

    refreshData();
  }

  async function claimSuggestion(suggestionId: number) {
    if (!currentUser) return;

    await fetch(`/api/suggestions/${suggestionId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimerId: currentUser.id })
    });

    refreshData();
  }

  async function markAsDiscussed(topicId: number, discussed: boolean) {
    await fetch(`/api/topics/${topicId}/discussed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discussed })
    });

    refreshData();
  }

  const isAdmin = currentUser && ADMIN_USERS.includes(personName.toLowerCase());

  if (loading) {
    return (
      <div className="container">
        <p>Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container">
        <Link href="/" className="back-link">← Back</Link>
        <h1>User not found</h1>
        <p>Could not find user &quot;{personName}&quot;</p>
      </div>
    );
  }

  const myTopics = topics.filter(t => t.person_id === currentUser.id);
  const otherTopics = topics.filter(t => t.person_id !== currentUser.id);

  // Group other topics by person
  const topicsByPerson: Record<string, Topic[]> = {};
  otherTopics.forEach(topic => {
    if (!topicsByPerson[topic.person_name]) {
      topicsByPerson[topic.person_name] = [];
    }
    topicsByPerson[topic.person_name].push(topic);
  });

  const topicCount = myTopics.length;
  const progressPercent = Math.min((topicCount / 3) * 100, 100);
  const progressClass = topicCount === 0 ? 'red' : topicCount < 3 ? 'orange' : 'green';

  return (
    <div className="container">
      <Link href="/" className="back-link">← Back to everyone</Link>

      <div className="current-user">
        Logged in as <strong>{currentUser.name}</strong>
      </div>

      {/* NEW TOPICS SINCE LAST LOGIN */}
      {newTopicsSinceLogin.length > 0 && (
        <div className="new-topics-banner">
          <div className="new-topics-header">
            <strong>New topics since your last visit ({newTopicsSinceLogin.length})</strong>
            <button onClick={() => setNewTopicsSinceLogin([])}>Dismiss</button>
          </div>
          <ul className="new-topics-list">
            {newTopicsSinceLogin.map(topic => (
              <li key={topic.id}>
                <span className="new-topic-title">{topic.title}</span>
                <span className="new-topic-author">by {topic.person_name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* MY TOPICS SECTION */}
      <h2>My Topics</h2>
      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>{topicCount}/3 topics</span>
          {topicCount < 3 && (
            <span style={{ color: '#e65100' }}>Add {3 - topicCount} more!</span>
          )}
          {topicCount >= 3 && (
            <span style={{ color: '#2e7d32' }}>Minimum reached!</span>
          )}
        </div>
        <div className="progress-container">
          <div
            className={`progress-bar ${progressClass}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <form onSubmit={addTopic}>
        <input
          type="text"
          placeholder="Topic title (e.g., 'Introduction to GraphQL')"
          value={newTopicTitle}
          onChange={(e) => setNewTopicTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Description (optional)"
          value={newTopicDesc}
          onChange={(e) => setNewTopicDesc(e.target.value)}
          rows={2}
        />
        <button type="submit">Add Topic</button>
      </form>

      {myTopics.length === 0 && myDiscussedTopics.length === 0 ? (
        <p className="empty">You haven&apos;t added any topics yet.</p>
      ) : myTopics.length === 0 ? null : (
        <ul className="topic-list">
          {myTopics.map(topic => (
            <li key={topic.id} className="topic-item">
              {editingTopicId === topic.id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Topic title"
                  />
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Description (optional)"
                    rows={2}
                  />
                  <div className="actions">
                    <button onClick={() => saveEditTopic(topic.id)}>Save</button>
                    <button className="secondary" onClick={cancelEdit}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="content">
                    <div className="title">{topic.title}</div>
                    {topic.description && (
                      <div className="description">{topic.description}</div>
                    )}
                    <div className="meta">{topic.vote_count} interested</div>
                  </div>
                  <div className="actions">
                    {isAdmin && (
                      <button
                        className="discussed"
                        onClick={() => markAsDiscussed(topic.id, true)}
                      >
                        ✓ Done
                      </button>
                    )}
                    <button className="edit" onClick={() => startEditTopic(topic)}>
                      Edit
                    </button>
                    <button className="delete" onClick={() => deleteTopic(topic.id)}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {myDiscussedTopics.length > 0 && (
        <>
          <h3 style={{ marginTop: '20px', color: '#666', fontSize: '1rem' }}>Already Presented</h3>
          <ul className="topic-list">
            {myDiscussedTopics.map(topic => (
              <li key={topic.id} className="topic-item past">
                <div className="content">
                  <div className="title" style={{ textDecoration: 'line-through', color: '#888' }}>
                    ✓ {topic.title}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* OTHERS' TOPICS SECTION */}
      <h2>Others&apos; Topics</h2>
      <p style={{ color: '#666', marginBottom: '15px' }}>
        Vote on topics you&apos;re interested in hearing about
      </p>

      {Object.keys(topicsByPerson).length === 0 ? (
        <p className="empty">No one else has added topics yet.</p>
      ) : (
        Object.entries(topicsByPerson).map(([personName, personTopics]) => (
          <div key={personName} className="person-section">
            <h3>{personName}</h3>
            <ul className="topic-list">
              {personTopics.map(topic => (
                <li key={topic.id} className="topic-item">
                  <div className="content">
                    <div className="title">{topic.title}</div>
                    {topic.description && (
                      <div className="description">{topic.description}</div>
                    )}
                  </div>
                  <div className="actions">
                    <span className="vote-count">{topic.vote_count}</span>
                    <button
                      className={`vote ${topic.voted_by_current_user ? 'voted' : ''}`}
                      onClick={() => voteOnTopic(topic.id)}
                    >
                      {topic.voted_by_current_user ? 'Voted' : 'Vote'}
                    </button>
                    {isAdmin && (
                      <button
                        className="discussed"
                        onClick={() => markAsDiscussed(topic.id, true)}
                      >
                        ✓ Done
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      {/* SUGGESTION BOX SECTION */}
      <h2>Suggestion Box</h2>
      <p style={{ color: '#666', marginBottom: '15px' }}>
        Suggest topics you&apos;d like someone (anyone) to present
      </p>

      <form onSubmit={addSuggestion}>
        <input
          type="text"
          placeholder="Suggested topic (e.g., 'How to use Docker')"
          value={newSuggestionTitle}
          onChange={(e) => setNewSuggestionTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Why you're interested (optional)"
          value={newSuggestionDesc}
          onChange={(e) => setNewSuggestionDesc(e.target.value)}
          rows={2}
        />
        <button type="submit">Add Suggestion</button>
      </form>

      {suggestions.length === 0 ? (
        <p className="empty">No suggestions yet. Be the first!</p>
      ) : (
        <ul className="suggestion-list">
          {suggestions.map(suggestion => (
            <li key={suggestion.id} className="suggestion-item">
              <div className="content">
                <div className="title">
                  {suggestion.title}
                  {suggestion.claimed_by_name && (
                    <span className="claimed-badge">Claimed by {suggestion.claimed_by_name}</span>
                  )}
                </div>
                {suggestion.description && (
                  <div className="description">{suggestion.description}</div>
                )}
                <div className="meta">Suggested by {suggestion.suggested_by_name}</div>
              </div>
              <div className="actions">
                <span className="vote-count">{suggestion.vote_count}</span>
                <button
                  className={`vote ${suggestion.voted_by_current_user ? 'voted' : ''}`}
                  onClick={() => voteOnSuggestion(suggestion.id)}
                >
                  {suggestion.voted_by_current_user ? 'Voted' : 'Vote'}
                </button>
                <button
                  className={`claim ${suggestion.claimed_by === currentUser?.id ? 'claimed' : ''}`}
                  onClick={() => claimSuggestion(suggestion.id)}
                >
                  {suggestion.claimed_by === currentUser?.id ? 'Unclaim' : 'Claim'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
