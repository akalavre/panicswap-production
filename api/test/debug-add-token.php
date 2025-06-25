<?php
// Ultra-basic debug version to isolate the issue
header('Content-Type: application/json');

try {
    echo json_encode(['step' => 1, 'message' => 'Starting debug']);
    
    // Test basic functionality
    $input = json_decode(file_get_contents('php://input'), true);
    echo json_encode(['step' => 2, 'input' => $input]);
    
    // Test config loading
    require_once __DIR__ . '/../../config/supabase.php';
    echo json_encode(['step' => 3, 'config' => 'loaded']);
    
    // Test namespace
    $supabase = new \Supabase\CreateClient('test', 'test');
    echo json_encode(['step' => 4, 'supabase' => 'created']);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
} catch (Error $e) {
    echo json_encode(['fatal_error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
}
?>