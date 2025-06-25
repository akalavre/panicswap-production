<?php

/**
 * Simple encryption helper for sensitive data
 * WARNING: This is a basic implementation. For production, use more robust encryption
 */
class Encryption {
    private static $method = 'AES-256-CBC';
    
    /**
     * Get encryption key from environment or generate one
     */
    private static function getKey() {
        $key = getenv('ENCRYPTION_KEY');
        if (!$key) {
            // In production, this should be stored securely
            $key = 'PanicSwap_Default_Key_2025_CHANGE_THIS_IN_PRODUCTION';
        }
        return substr(hash('sha256', $key, true), 0, 32);
    }
    
    /**
     * Encrypt data
     */
    public static function encrypt($data) {
        if (empty($data)) {
            return null;
        }
        
        $key = self::getKey();
        $iv = openssl_random_pseudo_bytes(16);
        
        $encrypted = openssl_encrypt($data, self::$method, $key, OPENSSL_RAW_DATA, $iv);
        if ($encrypted === false) {
            throw new Exception('Encryption failed');
        }
        
        // Return base64 encoded string with IV prepended
        return base64_encode($iv . $encrypted);
    }
    
    /**
     * Decrypt data
     */
    public static function decrypt($encryptedData) {
        if (empty($encryptedData)) {
            return null;
        }
        
        $key = self::getKey();
        $data = base64_decode($encryptedData);
        
        if ($data === false || strlen($data) < 16) {
            throw new Exception('Invalid encrypted data');
        }
        
        // Extract IV from beginning
        $iv = substr($data, 0, 16);
        $encrypted = substr($data, 16);
        
        $decrypted = openssl_decrypt($encrypted, self::$method, $key, OPENSSL_RAW_DATA, $iv);
        if ($decrypted === false) {
            throw new Exception('Decryption failed');
        }
        
        return $decrypted;
    }
}