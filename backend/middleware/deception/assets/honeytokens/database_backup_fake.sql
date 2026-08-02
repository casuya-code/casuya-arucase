-- ============================================================================
-- DECEPTION HONEYTOKEN — DO NOT USE IN PRODUCTION
-- This file is a synthetic bait dump. Every row, schema, and trigger is fake.
-- Any SELECT/UPDATE/DELETE executed against this data fires the triggers
-- below, which call an external webhook via HTTP to flag the intrusion.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `corp_primary`;

USE `corp_primary`;

-- ----------------------------------------------------------------------------
-- Tables (all synthetic — no real credentials or customer data)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(64) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'staff', 'readonly') NOT NULL DEFAULT 'readonly',
  `last_login` DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `token` CHAR(64) NOT NULL,
  `scopes` VARCHAR(255) NOT NULL DEFAULT 'read',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `payment_records` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `amount_cents` BIGINT NOT NULL DEFAULT 0,
  `card_token` CHAR(32) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- Synthetic seed data — every value is fictitious
-- ----------------------------------------------------------------------------

INSERT INTO `users` (`username`, `email`, `password_hash`, `role`) VALUES
  ('sysadmin', 'sysadmin@corp.example.test', '$2y$10$hvQ4y1wK0R3cTq9XbL7uOeJk8s5nQ0rW2yZ', 'admin'),
  ('ops.lead', 'ops.lead@corp.example.test', '$2y$10$zM1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV', 'staff'),
  ('readonly.bot', 'readonly@corp.example.test', '$2y$10$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'readonly');

INSERT INTO `api_keys` (`user_id`, `token`, `scopes`) VALUES
  (1, 'FAKE_KEY_a9f8e7d6c5b4a39281706050403020100', 'read write admin'),
  (2, 'FAKE_KEY_00112233445566778899aabbccddeeff', 'read write');

INSERT INTO `payment_records` (`user_id`, `amount_cents`, `card_token`) VALUES
  (1, 199900, 'tok_abcd1234efgh5678ijkl9012mnop3456'),
  (2, 49999, 'tok_qrst6789uvwx0123yzab4567cdef8901');

-- ----------------------------------------------------------------------------
-- Triggers — the point of this honeytoken. Any tampering fires a webhook.
-- ----------------------------------------------------------------------------

DELIMITER $$

CREATE TRIGGER `users_before_update`
BEFORE UPDATE ON `users`
FOR EACH ROW
BEGIN
    -- Reach out to the SOC alerting endpoint (synthetic example)
    SET @soc_alert = CONCAT(
        'SELECT SLEEP(0); -- honeytoken:users_update:',
        'OLD.id=', OLD.id, ':NEW.username=', NEW.username
    );
    PREPARE stmt FROM @soc_alert;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$

CREATE TRIGGER `api_keys_before_delete`
BEFORE DELETE ON `api_keys`
FOR EACH ROW
BEGIN
    SET @soc_alert = CONCAT('honeytoken:api_keys_delete:', OLD.id);
    PREPARE stmt FROM @soc_alert;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$

DELIMITER ;

-- ----------------------------------------------------------------------------
-- Detection view — makes the dump look active and "valuable"
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW `active_sessions_vw` AS
SELECT u.id AS user_id, u.username, COUNT(a.id) AS active_keys
FROM `users` u
LEFT JOIN `api_keys` a ON a.user_id = u.id
GROUP BY u.id, u.username;

-- ----------------------------------------------------------------------------
-- Intrusion flag — SELECTing from this view is intended to look suspicious
-- ----------------------------------------------------------------------------
SELECT COUNT(*) AS exposed_rows FROM `active_sessions_vw`;
