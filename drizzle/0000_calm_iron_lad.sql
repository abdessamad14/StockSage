CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`address` text,
	`credit_limit` real DEFAULT 0,
	`credit_balance` real DEFAULT 0,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `inventory_adjustment_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`adjustment_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`quantity_before` integer NOT NULL,
	`quantity_after` integer NOT NULL,
	`difference` integer NOT NULL,
	FOREIGN KEY (`adjustment_id`) REFERENCES `inventory_adjustments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inventory_adjustments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`date` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`type` text NOT NULL,
	`reason` text NOT NULL,
	`notes` text,
	`created_by` integer,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`order_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` real NOT NULL,
	`total_price` real NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`order_number` text NOT NULL,
	`date` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`supplier_id` integer,
	`total_amount` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`created_by` integer,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`color` text DEFAULT '#A7C7E7',
	`parent_id` integer,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`barcode` text,
	`description` text,
	`category` text,
	`cost_price` real NOT NULL,
	`selling_price` real NOT NULL,
	`quantity` integer DEFAULT 0 NOT NULL,
	`min_stock_level` integer DEFAULT 10,
	`unit` text DEFAULT 'pièce',
	`image` text,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`sale_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` real NOT NULL,
	`total_price` real NOT NULL,
	`discount` real DEFAULT 0,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`invoice_number` text NOT NULL,
	`date` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`customer_id` integer,
	`total_amount` real NOT NULL,
	`discount_amount` real DEFAULT 0,
	`tax_amount` real DEFAULT 0,
	`paid_amount` real NOT NULL,
	`change_amount` real DEFAULT 0,
	`payment_method` text DEFAULT 'cash' NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`notes` text,
	`created_by` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`business_name` text NOT NULL,
	`address` text,
	`phone` text,
	`email` text,
	`tax_rate` real DEFAULT 0,
	`currency` text DEFAULT 'MAD',
	`logo` text,
	`receipt_header` text,
	`receipt_footer` text,
	`language` text DEFAULT 'fr',
	`printer_type` text DEFAULT 'none',
	`printer_address` text,
	`theme` text DEFAULT 'light',
	`sync_interval` integer DEFAULT 15
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_tenant_id_unique` ON `settings` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`contact_person` text,
	`phone` text,
	`email` text,
	`address` text,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `sync_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` integer,
	`device_id` text NOT NULL,
	`timestamp` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`type` text NOT NULL,
	`entity_type` text NOT NULL,
	`record_count` integer NOT NULL,
	`status` text NOT NULL,
	`error_message` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`pin` text,
	`name` text NOT NULL,
	`business_name` text NOT NULL,
	`email` text,
	`phone` text,
	`role` text DEFAULT 'admin' NOT NULL,
	`tenant_id` text NOT NULL,
	`profile_image` text,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);