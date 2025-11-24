-- Add Product Stock table
CREATE TABLE `product_stock` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`product_id` integer NOT NULL,
	`location_id` text DEFAULT 'main' NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`min_stock_level` integer DEFAULT 0,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
);

-- Update Stock Transactions table to use proper datetime function
DROP TABLE IF EXISTS `stock_transactions`;
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
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`created_by` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`),
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);

-- Ensure default stock location exists
INSERT OR IGNORE INTO `stock_locations` (`tenant_id`, `name`, `description`, `is_primary`) 
VALUES ('offline', 'Main Warehouse', 'Primary warehouse location', 1);
