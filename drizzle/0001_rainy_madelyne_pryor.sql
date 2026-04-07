CREATE TABLE "enforcement_head_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"enforcement_head_id" integer NOT NULL,
	"state" "state" NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "enforcement_head_states_state_unique" UNIQUE("state")
);
--> statement-breakpoint
ALTER TABLE "enforcement_head_states" ADD CONSTRAINT "enforcement_head_states_enforcement_head_id_users_id_fk" FOREIGN KEY ("enforcement_head_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;