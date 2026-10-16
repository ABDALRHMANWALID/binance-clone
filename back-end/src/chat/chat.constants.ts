// WebSocket events (namespace: /chat)
export const CHAT_EVENTS = {
  // client -> server
  JOIN: 'conversation:join',
  LEAVE: 'conversation:leave',
  SEND: 'message:send',
  READ: 'conversation:read',
  // server -> client
  JOINED: 'conversation:joined',
  NEW: 'message:new',
  FAILED: 'message:failed',
  UNREAD_UPDATED: 'conversation:unread_updated',
  // extra events used by the order flow
  CONVERSATION_CREATED: 'conversation:created',
  ORDER_UPDATED: 'order:updated',
} as const;

export const conversationRoom = (conversationId: string) =>
  `conversation:${conversationId}`;
export const userRoom = (userId: string) => `user:${userId}`;

// a conversation accepts new messages only while its order is in one of these statuses
export const OPEN_ORDER_STATUSES = ['pending_payment', 'paid'];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;
