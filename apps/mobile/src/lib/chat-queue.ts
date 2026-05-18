import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isOnline } from "./network";

export type PendingChatMessage = {
  id: string; // local id
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  tries: number;
};

const KEY = "chat:pending_queue:v1";

export async function loadQueue(): Promise<PendingChatMessage[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as PendingChatMessage[]) : [];
  } catch {
    return [];
  }
}

export async function saveQueue(items: PendingChatMessage[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items.slice(0, 200)));
}

export async function enqueue(item: PendingChatMessage) {
  const q = await loadQueue();
  q.push(item);
  await saveQueue(q);
}

export async function remove(id: string) {
  const q = await loadQueue();
  await saveQueue(q.filter((x) => x.id !== id));
}

export async function flushQueue(supabase: SupabaseClient) {
  const online = await isOnline();
  if (!online) return { sent: 0, failed: 0, remaining: (await loadQueue()).length };

  const q = await loadQueue();
  let sent = 0;
  let failed = 0;
  const keep: PendingChatMessage[] = [];

  for (const item of q) {
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: item.conversationId,
        sender_id: item.senderId,
        metin: item.text
      });
      if (error) throw error;
      sent++;
    } catch {
      const tries = (item.tries ?? 0) + 1;
      if (tries < 5) keep.push({ ...item, tries });
      else failed++;
    }
  }

  await saveQueue(keep);
  return { sent, failed, remaining: keep.length };
}

