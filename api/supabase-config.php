<?php
// Load environment configuration if not already loaded
if (!defined('ENV_LOADED')) {
    require_once dirname(__DIR__) . '/env-config.php';
}

// Supabase configuration is already defined in env-config.php

class SupabaseClient {
    private $url;
    private $headers;
    
    public function __construct($serviceKey = false) {
        $this->url = SUPABASE_URL;
        $key = $serviceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;
        
        $this->headers = [
            'apikey: ' . $key,
            'Authorization: Bearer ' . $key,
            'Content-Type: application/json'
        ];
    }
    
    public function query($table, $params = []) {
        $url = $this->url . '/rest/v1/' . $table;
        
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $this->headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode >= 200 && $httpCode < 300) {
            return json_decode($response, true);
        }
        
        return null;
    }
    
    public function insert($table, $data) {
        $url = $this->url . '/rest/v1/' . $table;
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $this->headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            error_log("CURL error in insert: " . $error);
            return false;
        }
        
        if ($httpCode >= 200 && $httpCode < 300) {
            return json_decode($response, true);
        }
        
        error_log("Supabase insert failed for table '$table': HTTP $httpCode - $response");
        
        // Try to parse error response
        $errorData = json_decode($response, true);
        if ($errorData && isset($errorData['message'])) {
            error_log("Supabase error message: " . $errorData['message']);
        }
        
        return false;
    }
    
    public function update($table, $id, $data) {
        $url = $this->url . '/rest/v1/' . $table . '?id=eq.' . $id;
        
        // Build headers array properly
        $headers = $this->headers;
        $headers[] = 'Prefer: return=representation';
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            error_log('CURL error in update: ' . $error);
            return null;
        }
        
        if ($httpCode >= 200 && $httpCode < 300) {
            $result = json_decode($response, true);
            return is_array($result) && count($result) > 0 ? $result[0] : $result;
        } else {
            error_log('HTTP error in update: ' . $httpCode . ' - Response: ' . $response);
        }
        
        return null;
    }
    
    public function delete($table, $id) {
        $url = $this->url . '/rest/v1/' . $table . '?id=eq.' . $id;
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        curl_setopt($ch, CURLOPT_HTTPHEADER, $this->headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        return $httpCode >= 200 && $httpCode < 300;
    }
    
    // Get user by wallet address
    public function getUserByWallet($walletAddress) {
        // For now, return a mock user since we don't have a users table
        // This prevents errors and allows the app to function
        return [
            'id' => $walletAddress,
            'wallet_address' => $walletAddress,
            'created_at' => date('Y-m-d H:i:s')
        ];
    }
    
    // Get protected tokens for a user
    public function getProtectedTokens($userId) {
        // Use wallet_tokens table and wallet_address instead
        return $this->query('wallet_tokens', [
            'wallet_address' => 'eq.' . $userId,
            'is_protected' => 'eq.true'
        ]);
    }
    
    // Get alerts for a wallet
    public function getWalletAlerts($walletAddress, $limit = 10) {
        return $this->query('wallet_notifications', [
            'wallet_address' => 'eq.' . $walletAddress,
            'order' => 'created_at.desc',
            'limit' => $limit
        ]);
    }
    
    // Get system alerts
    public function getSystemAlerts($limit = 5) {
        return $this->query('system_alerts', [
            'is_active' => 'eq.true',
            'order' => 'created_at.desc',
            'limit' => $limit
        ]);
    }
}
?>