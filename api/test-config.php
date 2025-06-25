<?php
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/../config/supabase.php';
    echo json_encode(['success' => true, 'config_loaded' => true]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>