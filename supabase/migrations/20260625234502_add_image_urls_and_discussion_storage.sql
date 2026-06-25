
-- Add image_urls column to project_comments
alter table project_comments
  add column if not exists image_urls text[] not null default '{}';

-- Create storage bucket for discussion images
insert into storage.buckets (id, name, public)
values ('discussion-images', 'discussion-images', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload
create policy "Authenticated users can upload discussion images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'discussion-images');

-- Allow everyone to view images
create policy "Anyone can view discussion images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'discussion-images');

-- Allow users to delete their own images
create policy "Users can delete their own discussion images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'discussion-images' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
