CREATE TABLE `catalog_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(160) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalog_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_categories_name_unique` UNIQUE(`name`),
	CONSTRAINT `catalog_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `catalog_interpreters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`description` text,
	`photoUrl` varchar(2048),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalog_interpreters_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_interpreters_name_unique` UNIQUE(`name`),
	CONSTRAINT `catalog_interpreters_slug_unique` UNIQUE(`slug`)
);
