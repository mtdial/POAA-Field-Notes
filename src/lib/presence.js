import { supabase } from './supabase';

// Shared channel for the global header presence cluster.
const GLOBAL_CHANNEL = 'poaa-presence';
let globalChannel = null;

/**
 * Join the global presence channel (used by PresenceCluster in the header).
 * Returns an unsubscribe function.
 *
 * @param {object} userState  { id, display_name, initials }
 * @param {function} onChange  called with the full list of online users
 */
export function joinPresence(userState, onChange) {
  globalChannel = supabase.channel(GLOBAL_CHANNEL, {
    config: { presence: { key: userState.id } },
  });

  globalChannel
    .on('presence', { event: 'sync' }, () => {
      const state = globalChannel.presenceState();
      const users = Object.values(state).map((arr) => arr[0]);
      onChange(users);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await globalChannel.track(userState);
      }
    });

  return () => {
    if (globalChannel) {
      supabase.removeChannel(globalChannel);
      globalChannel = null;
    }
  };
}

/**
 * Join a scoped presence channel (e.g. per-entry viewer tracking).
 * Multiple scoped channels can coexist -- each gets its own Supabase channel.
 * Returns an unsubscribe function.
 *
 * @param {string}   channelName  Unique name, e.g. "entry-abc-123"
 * @param {object}   userState    { id, display_name, initials }
 * @param {function} onChange     called with the list of users on this channel
 */
export function joinNamedPresence(channelName, userState, onChange) {
  const ch = supabase.channel(channelName, {
    config: { presence: { key: userState.id } },
  });

  ch
    .on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const users = Object.values(state).map((arr) => arr[0]);
      onChange(users);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track(userState);
      }
    });

  return () => supabase.removeChannel(ch);
}
