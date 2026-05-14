import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { relativeTime } from '../lib/labels';

const COMMENT_SELECT = `
  id, body, created_at, updated_at,
  author:profiles!author_id(id, display_name, initials)
`;

export function CommentThread({ parentType, parentId }) {
  const { profile } = useAuth();
  const [comments, setComments] = useState([]);
  const [newBody, setNewBody]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [editBody, setEditBody]     = useState('');

  useEffect(() => {
    if (!parentId) return;
    fetchComments();

    const channel = supabase
      .channel(`comments-${parentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `parent_id=eq.${parentId}`,
        },
        () => fetchComments()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [parentId]);

  async function fetchComments() {
    const { data } = await supabase
      .from('comments')
      .select(COMMENT_SELECT)
      .eq('parent_type', parentType)
      .eq('parent_id', parentId)
      .order('created_at', { ascending: true });
    setComments(data ?? []);
  }

  async function postComment(e) {
    e.preventDefault();
    if (!newBody.trim()) return;
    setSaving(true);
    await supabase.from('comments').insert({
      parent_type: parentType,
      parent_id:   parentId,
      body:        newBody.trim(),
      author_id:   profile.id,
    });
    setNewBody('');
    setSaving(false);
  }

  async function saveEdit(commentId) {
    if (!editBody.trim()) return;
    await supabase
      .from('comments')
      .update({ body: editBody.trim() })
      .eq('id', commentId);
    setEditingId(null);
    setEditBody('');
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-dark-grey mb-3">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Comment list */}
      <div className="space-y-3 mb-4">
        {comments.length === 0 && (
          <p className="text-sm text-light-grey">No comments yet.</p>
        )}
        {comments.map((c) => {
          const isOwn = c.author?.id === profile?.id;
          const isEditing = editingId === c.id;
          return (
            <div key={c.id} className="flex gap-3">
              {/* Avatar */}
              <div
                className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold text-white mt-0.5"
                style={{ backgroundColor: '#73000A' }}
              >
                {c.author?.initials ?? '?'}
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold text-dark-grey">
                    {c.author?.display_name ?? 'Unknown'}
                  </span>
                  <span className="text-xs text-light-grey">{relativeTime(c.created_at)}</span>
                  {isOwn && !isEditing && (
                    <button
                      onClick={() => { setEditingId(c.id); setEditBody(c.body); }}
                      className="text-xs text-mid-grey hover:text-garnet ml-auto"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={2}
                      className="w-full border border-light-grey rounded px-2 py-1.5 text-sm text-dark-grey focus:outline-none focus:border-garnet resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(c.id)}
                        className="text-xs px-3 py-1 rounded text-white font-medium"
                        style={{ backgroundColor: '#73000A' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setEditBody(''); }}
                        className="text-xs px-3 py-1 rounded border border-light-grey text-mid-grey hover:border-mid-grey"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-dark-grey leading-relaxed whitespace-pre-wrap">
                    {c.body}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New comment form */}
      <form onSubmit={postComment} className="flex gap-3">
        <div
          className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold text-white mt-0.5"
          style={{ backgroundColor: '#73000A' }}
        >
          {profile?.initials ?? '?'}
        </div>
        <div className="flex-1">
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="w-full border border-light-grey rounded px-3 py-2 text-sm text-dark-grey focus:outline-none focus:border-garnet resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment(e);
            }}
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-light-grey">Cmd+Enter to post</span>
            <button
              type="submit"
              disabled={saving || !newBody.trim()}
              className="text-xs px-3 py-1.5 rounded text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: '#73000A' }}
            >
              {saving ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
