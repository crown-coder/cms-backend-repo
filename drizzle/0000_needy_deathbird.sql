CREATE TYPE "public"."case_status" AS ENUM('pending', 'in_progress', 'escalated', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."compliance_status" AS ENUM('compliant', 'non_compliant');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('super_admin', 'enforcement_head', 'state_controller', 'officer');--> statement-breakpoint
CREATE TYPE "public"."state" AS ENUM('Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"case_id" integer,
	"action" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"rc_number" text,
	"address" text,
	"inspection_date" timestamp NOT NULL,
	"created_by" integer NOT NULL,
	"state" "state" NOT NULL,
	"status" "case_status" DEFAULT 'pending',
	"total_penalty" numeric DEFAULT '0',
	"total_paid" numeric DEFAULT '0',
	"resolved_by" integer,
	"resolved_at" timestamp,
	"resolution_remark" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "compliance_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"section_id" integer NOT NULL,
	"compliance_status" "compliance_status" NOT NULL,
	"period_non_compliance" text,
	"officers_penalised" integer,
	"penalty_computation" text,
	"total_payable" numeric DEFAULT '0',
	"amount_paid" numeric DEFAULT '0',
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "compliance_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"case_id" integer NOT NULL,
	"amount" numeric NOT NULL,
	"payment_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"role" "role" NOT NULL,
	"state" "state",
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_section_id_compliance_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."compliance_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;