<?php
/**
 * Migration Script — Blacklist (Dia das Mães 2026)
 * 
 * Cria a tabela `blacklist` no MySQL.
 * Rodar UMA VEZ no servidor: php migrate_blacklist.php
 */

$db_host = "186.209.113.134";
$db_user = "agenda";
$db_pass = "~6zR9eXz4cT*phhn";
$db_name = "agenda";

$mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);
if ($mysqli->connect_error) {
    die("DB connection failed: " . $mysqli->connect_error . "\n");
}
$mysqli->set_charset('utf8mb4');

echo "=== Migration Blacklist ===\n\n";

$sql = "
CREATE TABLE IF NOT EXISTS blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NULL,
    whatsapp VARCHAR(20) NOT NULL,
    has_closed_order TINYINT(1) NOT NULL DEFAULT 0,
    observation TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_whatsapp (whatsapp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
";

if ($mysqli->query($sql)) {
    echo "  [OK] Table 'blacklist' created (or already exists).\n";
} else {
    echo "  [ERROR] " . $mysqli->error . "\n";
}

echo "\n=== Migration complete! ===\n";
$mysqli->close();
