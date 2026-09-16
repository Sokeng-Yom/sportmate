   # Database Conventions
   - snake_case table/column names
   - UUID primary keys, column name `id`
   - `created_at` (and `updated_at` where mutable) on every table
   - Identity lives in `auth.users` (Supabase-managed); `profiles.id` references it
   - Foreign keys named `<referenced_table_singular>_id`