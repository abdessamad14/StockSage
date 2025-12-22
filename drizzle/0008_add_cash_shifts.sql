-- Add cash_shifts table for daily cash register management
CREATE TABLE IF NOT EXISTS `cash_shifts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`user_name` text NOT NULL,
	`starting_cash` real NOT NULL,
	`expected_total` real,
	`actual_total` real,
	`difference` real,
	`total_cash_sales` real DEFAULT 0,
	`total_card_sales` real DEFAULT 0,
	`total_credit_sales` real DEFAULT 0,
	`total_sales` real DEFAULT 0,
	`transactions_count` integer DEFAULT 0,
	`opened_at` text NOT NULL,
	`closed_at` text,
	`status` text DEFAULT 'open' NOT NULL,
	`notes` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);

-- Create index for faster queries by status and date
CREATE INDEX IF NOT EXISTS `cash_shifts_status_idx` ON `cash_shifts` (`status`);
CREATE INDEX IF NOT EXISTS `cash_shifts_opened_at_idx` ON `cash_shifts` (`opened_at`);
CREATE INDEX IF NOT EXISTS `cash_shifts_tenant_id_idx` ON `cash_shifts` (`tenant_id`);

