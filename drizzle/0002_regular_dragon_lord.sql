CREATE TYPE "public"."case_resolution_type" AS ENUM('payment_complete', 'penalty_waived', 'suspended');--> statement-breakpoint
ALTER TYPE "public"."case_status" ADD VALUE 'suspended';--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "resolution_type" "case_resolution_type";--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "penalty_reduction" numeric DEFAULT '0';--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "suspension_reason" text;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "suspended_until" timestamp;