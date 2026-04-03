ALTER TABLE public.api_keys 
  ALTER COLUMN scopes SET DEFAULT '{files:read,files:write,files:delete,folders:create,shares:read,shares:write,tags:read,tags:write,user:read,workspaces:read}'::text[];