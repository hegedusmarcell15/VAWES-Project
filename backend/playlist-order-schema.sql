-- Add persistent ordering for playlist tracks without changing existing relationships.
USE `vawe`;

ALTER TABLE `playlist_songs`
  ADD COLUMN `position` int(11) NOT NULL DEFAULT 0;
