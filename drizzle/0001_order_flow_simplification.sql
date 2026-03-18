-- 1. Create fulfillment_method enum
CREATE TYPE "public"."fulfillment_method" AS ENUM('pickup', 'delivery');

-- 2. Update order_status enum values
-- Drop old values and recreate with new values
ALTER TYPE "public"."order_status" RENAME TO "order_status_old";
CREATE TYPE "public"."order_status" AS ENUM('pending', 'awaiting_payment', 'payment_confirmed', 'preparing', 'ready', 'shipped', 'completed', 'cancelled');

-- Migrate existing status values
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."order_status" USING (
  CASE "status"::text
    WHEN 'pending' THEN 'pending'
    WHEN 'confirmed' THEN 'pending'
    WHEN 'preparing' THEN 'preparing'
    WHEN 'shipped' THEN 'shipped'
    WHEN 'delivered' THEN 'completed'
    WHEN 'cancelled' THEN 'cancelled'
  END
)::"public"."order_status";

DROP TYPE "public"."order_status_old";

-- 3. Add fulfillment_method and pickup_time_slot to orders
ALTER TABLE "orders" ADD COLUMN "fulfillment_method" "public"."fulfillment_method";
ALTER TABLE "orders" ADD COLUMN "pickup_time_slot" text;

-- Migrate existing orders as delivery
UPDATE "orders" SET "fulfillment_method" = 'delivery' WHERE "fulfillment_method" IS NULL;

-- Make fulfillment_method NOT NULL
ALTER TABLE "orders" ALTER COLUMN "fulfillment_method" SET NOT NULL;

-- 4. Make address_id nullable
ALTER TABLE "orders" ALTER COLUMN "address_id" DROP NOT NULL;

-- 5. Remove payment_method column from orders
ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_method";

-- 6. Remove phone column from addresses
ALTER TABLE "addresses" DROP COLUMN IF EXISTS "phone";

-- 7. Drop payment_method enum
DROP TYPE IF EXISTS "public"."payment_method";
