-- Additive catalog metadata required by the API and seed command.
-- Apply once after importing vawes.sql. No existing records are removed or rewritten.
USE `vawe`;

ALTER TABLE `artists`
  ADD COLUMN `slug` varchar(160) DEFAULT NULL,
  ADD COLUMN `cover_url` varchar(500) DEFAULT NULL;

ALTER TABLE `albums`
  ADD COLUMN `slug` varchar(255) DEFAULT NULL;

ALTER TABLE `songs`
  ADD COLUMN `slug` varchar(255) DEFAULT NULL;

ALTER TABLE `playlists`
  ADD COLUMN `slug` varchar(160) DEFAULT NULL,
  ADD COLUMN `color` varchar(32) NOT NULL DEFAULT 'violet',
  ADD COLUMN `type` varchar(32) NOT NULL DEFAULT 'vawes',
  ADD COLUMN `recent` int(11) NOT NULL DEFAULT 0,
  ADD COLUMN `tracks` int(11) NOT NULL DEFAULT 0,
  ADD COLUMN `minutes` int(11) NOT NULL DEFAULT 0,
  ADD COLUMN `cover_url` varchar(500) DEFAULT NULL;

CREATE UNIQUE INDEX `uq_artists_slug` ON `artists` (`slug`);
CREATE UNIQUE INDEX `uq_albums_slug` ON `albums` (`slug`);
CREATE UNIQUE INDEX `uq_songs_slug` ON `songs` (`slug`);
CREATE UNIQUE INDEX `uq_playlists_slug` ON `playlists` (`slug`);
