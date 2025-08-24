-- Add Stock Locations table
CREATE TABLE `stock_locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_primary` integer DEFAULT false,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);

-- Add Supplier Payments table
CREATE TABLE `supplier_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`supplier_id` integer NOT NULL,
	`order_id` integer,
	`amount` real NOT NULL,
	`payment_method` text DEFAULT 'cash' NOT NULL,
	`payment_date` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`reference` text,
	`notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`),
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`)
);

-- Add Stock Transactions table
CREATE TABLE `stock_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`product_id` integer NOT NULL,
	`warehouse_id` text DEFAULT 'main' NOT NULL,
	`type` text NOT NULL,
	`quantity` integer NOT NULL,
	`previous_quantity` integer NOT NULL,
	`new_quantity` integer NOT NULL,
	`reason` text,
	`reference` text,
	`related_id` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`created_by` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`),
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);

-- Add Inventory Counts table
CREATE TABLE `inventory_counts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`location_id` text DEFAULT 'main' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`start_date` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`end_date` text,
	`notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`created_by` integer,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);

-- Add Inventory Count Items table
CREATE TABLE `inventory_count_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`count_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`expected_quantity` integer NOT NULL,
	`actual_quantity` integer,
	`variance` integer,
	`notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`count_id`) REFERENCES `inventory_counts`(`id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
);

-- Insert default stock location
INSERT INTO `stock_locations` (`tenant_id`, `name`, `description`, `is_primary`) 
VALUES ('offline', 'Main Warehouse', 'Primary warehouse location', 1);
