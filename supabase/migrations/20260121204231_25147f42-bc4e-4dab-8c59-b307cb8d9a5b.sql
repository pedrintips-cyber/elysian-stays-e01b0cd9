-- Storage bucket for public property photos
insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do update set public = excluded.public;

-- Public can read images
create policy "Property photos are publicly readable"
on storage.objects
for select
using (bucket_id = 'property-photos');

-- Authenticated users can upload to their own folder (userId/...)
create policy "Authenticated can upload property photos to own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'property-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Authenticated can update own property photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'property-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Authenticated can delete own property photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'property-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);