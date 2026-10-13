CREATE TABLE `catalog_episodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seriesId` int NOT NULL,
	`seasonNumber` int NOT NULL,
	`episodeNumber` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`synopsis` text,
	`durationMinutes` int,
	`playbackUrl` varchar(2048),
	`downloadUrl` varchar(2048),
	`rightsConfirmed` boolean NOT NULL DEFAULT false,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalog_episodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_episodes_position_unique` UNIQUE(`seriesId`,`seasonNumber`,`episodeNumber`)
);
--> statement-breakpoint
CREATE TABLE `catalog_titles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(180) NOT NULL,
	`title` varchar(240) NOT NULL,
	`kind` enum('movie','series') NOT NULL,
	`synopsis` text,
	`releaseYear` int,
	`durationMinutes` int,
	`rating` varchar(24),
	`posterUrl` varchar(2048),
	`backdropUrl` varchar(2048),
	`categories` json NOT NULL,
	`interpreters` json NOT NULL,
	`trailerUrl` varchar(2048),
	`playbackUrl` varchar(2048),
	`downloadUrl` varchar(2048),
	`rightsConfirmed` boolean NOT NULL DEFAULT false,
	`featured` boolean NOT NULL DEFAULT false,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalog_titles_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalog_titles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `catalog_episodes` ADD CONSTRAINT `catalog_episodes_seriesId_catalog_titles_id_fk` FOREIGN KEY (`seriesId`) REFERENCES `catalog_titles`(`id`) ON DELETE cascade ON UPDATE no action;