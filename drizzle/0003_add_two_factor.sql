ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_secret" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_temp_secret" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_temp_issued_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_last_used_step" integer;

CREATE TABLE IF NOT EXISTS "user_recovery_codes" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "code_hash" text NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now()
);
