
-- Create chats table
CREATE TABLE public.chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_1 UUID NOT NULL,
  user_2 UUID NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  product_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_1, user_2)
);

-- Create messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  text TEXT NOT NULL,
  product_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL,
  is_seen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS for chats: participants only
CREATE POLICY "Users can view own chats" ON public.chats
  FOR SELECT TO authenticated
  USING (user_1 = auth.uid() OR user_2 = auth.uid());

CREATE POLICY "Users can insert chats" ON public.chats
  FOR INSERT TO authenticated
  WITH CHECK (user_1 = auth.uid() OR user_2 = auth.uid());

CREATE POLICY "Users can update own chats" ON public.chats
  FOR UPDATE TO authenticated
  USING (user_1 = auth.uid() OR user_2 = auth.uid());

-- RLS for messages: chat participants only
CREATE POLICY "Chat participants can view messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_messages.chat_id
    AND (c.user_1 = auth.uid() OR c.user_2 = auth.uid())
  ));

CREATE POLICY "Chat participants can insert messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_messages.chat_id
      AND (c.user_1 = auth.uid() OR c.user_2 = auth.uid())
    )
  );

CREATE POLICY "Chat participants can update messages" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = chat_messages.chat_id
    AND (c.user_1 = auth.uid() OR c.user_2 = auth.uid())
  ));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;

-- Index for fast lookups
CREATE INDEX idx_chat_messages_chat_id ON public.chat_messages(chat_id, created_at);
CREATE INDEX idx_chats_users ON public.chats(user_1, user_2);
