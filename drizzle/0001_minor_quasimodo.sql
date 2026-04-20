CREATE TABLE `scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`playerName` varchar(64) NOT NULL,
	`score` int NOT NULL,
	`difficulty` enum('easy','normal','hard') NOT NULL,
	`result` enum('victory','defeat','draw') NOT NULL,
	`turns` int NOT NULL,
	`damageDealt` int NOT NULL,
	`shipsDestroyed` int NOT NULL,
	`shipsLost` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scores_id` PRIMARY KEY(`id`)
);
