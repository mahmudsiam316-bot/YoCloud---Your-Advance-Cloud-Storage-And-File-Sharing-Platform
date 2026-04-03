
CREATE POLICY "Shared folder children readable by authenticated"
ON public.files
FOR SELECT
TO authenticated
USING (is_shared_child(parent_id));
