CREATE TABLE "legal_info" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_name" text NOT NULL,
	"representative" text NOT NULL,
	"address" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"price_info" text NOT NULL,
	"shipping_fee" text NOT NULL,
	"additional_cost" text NOT NULL,
	"payment_method" text NOT NULL,
	"payment_deadline" text NOT NULL,
	"delivery_time" text NOT NULL,
	"return_policy" text NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
