<?php
declare(strict_types=1);

/**
 * Blacklist API — Gerenciamento de números bloqueados (Dia das Mães 2026)
 * -----------------------------------------------------------------------
 * Endpoints:
 *   GET    ?fetch=all              → Lista todos os registros
 *   GET    ?fetch=stats            → Retorna contadores
 *   POST                           → Adicionar registro (body JSON)
 *   PUT    ?id=X                   → Atualizar registro
 *   DELETE ?id=X                   → Remover registro
 */

// CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// --- Database ---
$db_host = "186.209.113.134";
$db_user = "agenda";
$db_pass = "~6zR9eXz4cT*phhn";
$db_name = "agenda";

$mysqli = @new mysqli($db_host, $db_user, $db_pass, $db_name);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'DB connection failed']);
    exit;
}
$mysqli->set_charset('utf8mb4');

// --- Helpers ---
function jsonResponse(mixed $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function readBody(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw)
        return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function requireFields(array $data, array $fields): void
{
    $missing = [];
    foreach ($fields as $f) {
        if (!isset($data[$f]) || $data[$f] === '') {
            $missing[] = $f;
        }
    }
    if ($missing) {
        jsonResponse(['success' => false, 'error' => 'Missing fields: ' . implode(', ', $missing)], 400);
    }
}

// Normaliza WhatsApp (apenas dígitos)
function normalizeWhatsapp(string $raw): string
{
    return preg_replace('/\D/', '', $raw);
}

// --- Routing ---
$method = $_SERVER['REQUEST_METHOD'];
$fetch = $_GET['fetch'] ?? null;
$id = isset($_GET['id']) ? (int) $_GET['id'] : null;

switch ($method) {
    case 'GET':
        if ($fetch === 'stats') {
            handleStats($mysqli);
        } else {
            handleList($mysqli);
        }
        break;
    case 'POST':
        handleCreate($mysqli);
        break;
    case 'PUT':
        handleUpdate($mysqli, $id);
        break;
    case 'DELETE':
        handleDelete($mysqli, $id);
        break;
    default:
        jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

/* =============================================================================
 * LIST — GET ?fetch=all
 * ============================================================================= */
function handleList(mysqli $db): void
{
    $search = $_GET['search'] ?? null;

    $sql = "SELECT * FROM blacklist";
    $params = [];
    $types = '';

    if ($search) {
        $sql .= " WHERE name LIKE ? OR whatsapp LIKE ?";
        $like = "%{$search}%";
        $params[] = $like;
        $params[] = $like;
        $types = 'ss';
    }

    $sql .= " ORDER BY created_at DESC";

    if ($types) {
        $stmt = $db->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $res = $stmt->get_result();
    } else {
        $res = $db->query($sql);
    }

    $rows = [];
    while ($r = $res->fetch_assoc()) {
        $r['id'] = (int) $r['id'];
        $r['has_closed_order'] = (bool) $r['has_closed_order'];
        $rows[] = $r;
    }

    jsonResponse(['success' => true, 'data' => $rows]);
}

/* =============================================================================
 * STATS — GET ?fetch=stats
 * ============================================================================= */
function handleStats(mysqli $db): void
{
    $res = $db->query("SELECT 
        COUNT(*) as total,
        SUM(has_closed_order = 1) as with_order,
        SUM(has_closed_order = 0) as without_order
        FROM blacklist");
    $row = $res->fetch_assoc();

    jsonResponse([
        'success' => true,
        'data' => [
            'total' => (int) $row['total'],
            'with_order' => (int) ($row['with_order'] ?? 0),
            'without_order' => (int) ($row['without_order'] ?? 0),
        ]
    ]);
}

/* =============================================================================
 * CREATE — POST
 * ============================================================================= */
function handleCreate(mysqli $db): void
{
    $data = readBody();
    requireFields($data, ['whatsapp']);

    $whatsapp = normalizeWhatsapp($data['whatsapp']);
    if (strlen($whatsapp) < 10) {
        jsonResponse(['success' => false, 'error' => 'WhatsApp inválido (mínimo 10 dígitos)'], 400);
    }

    $name = trim($data['name'] ?? '');
    $hasClosedOrder = (int) ($data['has_closed_order'] ?? 0);
    $observation = trim($data['observation'] ?? '');

    // Check duplicate
    $check = $db->prepare("SELECT id FROM blacklist WHERE whatsapp = ?");
    $check->bind_param('s', $whatsapp);
    $check->execute();
    if ($check->get_result()->num_rows > 0) {
        jsonResponse(['success' => false, 'error' => 'Este WhatsApp já está na blacklist'], 409);
    }
    $check->close();

    $stmt = $db->prepare("INSERT INTO blacklist (name, whatsapp, has_closed_order, observation) VALUES (?, ?, ?, ?)");
    $stmt->bind_param('ssis', $name, $whatsapp, $hasClosedOrder, $observation);

    if ($stmt->execute()) {
        // Return the created record
        $newId = $stmt->insert_id;
        $stmt->close();

        $res = $db->prepare("SELECT * FROM blacklist WHERE id = ?");
        $res->bind_param('i', $newId);
        $res->execute();
        $row = $res->get_result()->fetch_assoc();
        $row['id'] = (int) $row['id'];
        $row['has_closed_order'] = (bool) $row['has_closed_order'];

        jsonResponse(['success' => true, 'data' => $row], 201);
    } else {
        jsonResponse(['success' => false, 'error' => $stmt->error], 500);
    }
}

/* =============================================================================
 * UPDATE — PUT ?id=X
 * ============================================================================= */
function handleUpdate(mysqli $db, ?int $id): void
{
    if (!$id)
        jsonResponse(['success' => false, 'error' => 'Missing id'], 400);

    $data = readBody();
    $sets = [];
    $params = [];
    $types = '';

    foreach (['name' => 's', 'observation' => 's'] as $field => $type) {
        if (array_key_exists($field, $data)) {
            $sets[] = "$field = ?";
            $params[] = trim($data[$field]);
            $types .= $type;
        }
    }

    if (array_key_exists('has_closed_order', $data)) {
        $sets[] = "has_closed_order = ?";
        $params[] = (int) $data['has_closed_order'];
        $types .= 'i';
    }

    if (array_key_exists('whatsapp', $data)) {
        $sets[] = "whatsapp = ?";
        $params[] = normalizeWhatsapp($data['whatsapp']);
        $types .= 's';
    }

    if (empty($sets))
        jsonResponse(['success' => false, 'error' => 'No fields to update'], 400);

    $params[] = $id;
    $types .= 'i';
    $stmt = $db->prepare("UPDATE blacklist SET " . implode(', ', $sets) . " WHERE id = ?");
    $stmt->bind_param($types, ...$params);

    if ($stmt->execute()) {
        // Return updated record
        $stmt->close();
        $res = $db->prepare("SELECT * FROM blacklist WHERE id = ?");
        $res->bind_param('i', $id);
        $res->execute();
        $row = $res->get_result()->fetch_assoc();
        if ($row) {
            $row['id'] = (int) $row['id'];
            $row['has_closed_order'] = (bool) $row['has_closed_order'];
        }
        jsonResponse(['success' => true, 'data' => $row]);
    } else {
        jsonResponse(['success' => false, 'error' => $stmt->error], 500);
    }
}

/* =============================================================================
 * DELETE — DELETE ?id=X
 * ============================================================================= */
function handleDelete(mysqli $db, ?int $id): void
{
    if (!$id)
        jsonResponse(['success' => false, 'error' => 'Missing id'], 400);

    $stmt = $db->prepare("DELETE FROM blacklist WHERE id = ?");
    $stmt->bind_param('i', $id);

    if ($stmt->execute()) {
        jsonResponse(['success' => true, 'affected' => $stmt->affected_rows]);
    } else {
        jsonResponse(['success' => false, 'error' => $stmt->error], 500);
    }
}
