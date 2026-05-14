import { useEffect, useState } from 'react';
import { joinPresence } from '../lib/presence';
import { useAuth } from '../hooks/useAuth';

export function PresenceCluster() {
  const { profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!profile) return;
    const leave = joinPresence(
      { id: profile.id, display_name: profile.display_name, initials: profile.initials },
      setOnlineUsers
    );
    return leave;
  }, [profile]);

  if (!onlineUsers.length) return null;

  return (
    <div className="flex items-center gap-1" title="Online now">
      {onlineUsers.map((u) => (
        <span
          key={u.id}
          title={u.display_name}
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white select-none"
          style={{ backgroundColor: '#73000A' }}
        >
          {u.initials}
        </span>
      ))}
    </div>
  );
}
