-- Allow users to delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- Allow users to update their own messages
CREATE POLICY "Users can update own messages"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());