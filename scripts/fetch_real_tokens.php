<?php
require_once __DIR__ . '/../config/supabase.php';

$supabase = Supabase\getSupabaseServiceClient();
$response = $supabase->from('wallet_tokens')->select('token_mint, wallet_address, balance')->limit(10)->execute();

if ($response && isset($response->data)) {
    echo json_encode($response->data, JSON_PRETTY_PRINT);
} else {
    echo json_encode(['error' => 'Failed to fetch data', 'response' => $response], JSON_PRETTY_PRINT);
}
?>
