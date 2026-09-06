-- Ownership for events that were created before anyone signed in.
--
-- Without this, POST /api/events/<id>/uploads handed presigned PUT URLs to any
-- caller for any event id, and the keys are deterministic (uploads/<id>/00.jpg),
-- so a stranger could overwrite a family's photos — and slip content past the
-- moderation gate, which only runs when the honest client calls /assets.
alter table events add column if not exists access_token text;

update events set access_token = encode(gen_random_bytes(24), 'hex') where access_token is null;
alter table events alter column access_token set not null;
