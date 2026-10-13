CREATE TABLE `homepage_sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(160) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isVisible` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `homepage_sections_id` PRIMARY KEY(`id`),
	CONSTRAINT `homepage_sections_name_unique` UNIQUE(`name`),
	CONSTRAINT `homepage_sections_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` int NOT NULL,
	`siteName` varchar(120) NOT NULL,
	`pageTitle` varchar(180) NOT NULL,
	`logoUrl` varchar(2048),
	`faviconUrl` varchar(2048),
	`footerYear` varchar(8) NOT NULL,
	`footerAbout` text,
	`phone` varchar(80),
	`email` varchar(320),
	`youtubeUrl` varchar(2048),
	`instagramUrl` varchar(2048),
	`facebookUrl` varchar(2048),
	`copyrightText` varchar(180),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `catalog_titles` ADD `featuredOrder` int;--> statement-breakpoint
ALTER TABLE `catalog_titles` ADD `homeSections` json;