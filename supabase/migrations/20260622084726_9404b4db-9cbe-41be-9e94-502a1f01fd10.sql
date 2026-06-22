
-- Files are stored under "{org_id}/..." so the first path segment is the org id.
CREATE POLICY "org members can read org-assets"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'org-assets'
  AND public.is_org_member((storage.foldername(name))[1]::uuid, auth.uid())
);

CREATE POLICY "owner/partner can insert org-assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'org-assets'
  AND public.has_org_role((storage.foldername(name))[1]::uuid, auth.uid(), ARRAY['owner','partner']::org_role[])
);

CREATE POLICY "owner/partner can update org-assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'org-assets'
  AND public.has_org_role((storage.foldername(name))[1]::uuid, auth.uid(), ARRAY['owner','partner']::org_role[])
);

CREATE POLICY "owner/partner can delete org-assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'org-assets'
  AND public.has_org_role((storage.foldername(name))[1]::uuid, auth.uid(), ARRAY['owner','partner']::org_role[])
);

-- Allow pending org creators (no org yet) to upload to a "pending/{user_id}/..." folder.
CREATE POLICY "user can manage own pending uploads"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] = 'pending'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] = 'pending'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
