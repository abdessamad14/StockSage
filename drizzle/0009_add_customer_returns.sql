-- Add defective_stock field to products table
ALTER TABLE `products` ADD COLUMN `defective_stock` integer DEFAULT 0 NOT NULL;

-- Create customer_returns table
CREATE TABLE IF NOT EXISTS `customer_returns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`return_number` text NOT NULL UNIQUE,
	`customer_id` integer,
	`customer_name` text,
	`original_sale_id` integer,
	`total_amount` real NOT NULL,
	`refund_method` text NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`notes` text,
	`created_by` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`),
	FOREIGN KEY (`original_sale_id`) REFERENCES `sales`(`id`),
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);

-- Create customer_return_items table
CREATE TABLE IF NOT EXISTS `customer_return_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`return_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`product_name` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` real NOT NULL,
	`total_price` real NOT NULL,
	`condition` text NOT NULL,
	`reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`return_id`) REFERENCES `customer_returns`(`id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS `customer_returns_tenant_id_idx` ON `customer_returns` (`tenant_id`);
CREATE INDEX IF NOT EXISTS `customer_returns_return_number_idx` ON `customer_returns` (`return_number`);
CREATE INDEX IF NOT EXISTS `customer_returns_customer_id_idx` ON `customer_returns` (`customer_id`);
CREATE INDEX IF NOT EXISTS `customer_returns_created_at_idx` ON `customer_returns` (`created_at`);
CREATE INDEX IF NOT EXISTS `customer_return_items_return_id_idx` ON `customer_return_items` (`return_id`);
CREATE INDEX IF NOT EXISTS `customer_return_items_product_id_idx` ON `customer_return_items` (`product_id`);

