CREATE TABLE "payment_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bank_name" text,
	"branch_name" text,
	"account_type" text,
	"account_number" text,
	"account_holder" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
