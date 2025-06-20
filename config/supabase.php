<?php
// Supabase configuration
define('SUPABASE_URL', 'https://cfficjjdhgqwqprfhlrj.supabase.co');
define('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NjI0OTcsImV4cCI6MjA2NDUzODQ5N30.IB-rLhiadGguYCTAZoiI60451xLLZ9M23OpfvsBt0mA');

// Simple Supabase client class (without external dependencies)
namespace Supabase;

class CreateClient {
    private $url;
    private $apiKey;
    
    public function __construct($url, $apiKey) {
        $this->url = rtrim($url, '/');
        $this->apiKey = $apiKey;
    }
    
    public function from($table) {
        return new QueryBuilder($this->url, $this->apiKey, $table);
    }
}

class QueryBuilder {
    private $url;
    private $apiKey;
    private $table;
    private $query = [];
    private $method = 'GET';
    private $body = null;
    
    public function __construct($url, $apiKey, $table) {
        $this->url = $url;
        $this->apiKey = $apiKey;
        $this->table = $table;
    }
    
    public function select($columns = '*') {
        if ($columns !== '*') {
            $this->query['select'] = $columns;
        }
        return $this;
    }
    
    public function insert($data) {
        $this->method = 'POST';
        $this->body = $data;
        return $this;
    }
    
    public function update($data) {
        $this->method = 'PATCH';
        $this->body = $data;
        return $this;
    }
    
    public function eq($column, $value) {
        $this->query[$column] = 'eq.' . $value;
        return $this;
    }
    
    public function single() {
        // This is handled in execute
        return $this;
    }
    
    public function execute() {
        $endpoint = $this->url . '/rest/v1/' . $this->table;
        
        if (!empty($this->query)) {
            $endpoint .= '?' . http_build_query($this->query);
        }
        
        $headers = [
            'apikey: ' . $this->apiKey,
            'Authorization: Bearer ' . $this->apiKey,
            'Content-Type: application/json',
            'Prefer: return=representation'
        ];
        
        $options = [
            'http' => [
                'header' => implode("\r\n", $headers),
                'method' => $this->method,
                'content' => $this->body ? json_encode($this->body) : null,
                'ignore_errors' => true
            ]
        ];
        
        $context = stream_context_create($options);
        $response = file_get_contents($endpoint, false, $context);
        
        if ($response === false) {
            throw new \Exception('Failed to connect to Supabase');
        }
        
        $data = json_decode($response);
        
        // For single() queries, return first item or null
        if (is_array($data) && count($data) === 1) {
            return (object)['data' => $data[0]];
        }
        
        return (object)['data' => $data];
    }
}