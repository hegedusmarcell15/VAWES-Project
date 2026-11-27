-- Additive migration for databases created before the administrator audit log.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS `admin_audit_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `actor_email` varchar(255) NOT NULL,
  `action` varchar(100) NOT NULL,
  `target` varchar(200) NOT NULL,
  `detail` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
