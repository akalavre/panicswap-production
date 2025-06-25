<?php
namespace Supabase;

// Supabase configuration - use constants from env-config.php if available
if (!defined('SUPABASE_URL')) {
    define('SUPABASE_URL', 'https://cfficjjdhgqwqprfhlrj.supabase.co');
}
if (!defined('SUPABASE_ANON_KEY')) {
    define('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NjI0OTcsImV4cCI6MjA2NDUzODQ5N30.IB-rLhiadGguYCTAZoiI60451xLLZ9M23OpfvsBt0mA');
}
if (!defined('SUPABASE_SERVICE_KEY')) {
    define('SUPABASE_SERVICE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZmljampkaGdxd3FwcmZobHJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODk2MjQ5NywiZXhwIjoyMDY0NTM4NDk3fQ.GfeQTK4qjQJWLUYoiVJNuy3p2bx3nB3rX39oZ6hBgFE');
}

// Simple Supabase client class (without external dependencies)

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
    private $isSingle = false;
    
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
        // Ensure data is wrapped in array for batch insert
        $this->body = is_array($data) && !isset($data[0]) ? [$data] : $data;
        return $this;
    }
    
    public function update($data) {
        $this->method = 'PATCH';
        $this->body = $data;
        return $this;
    }
    
    public function delete() {
        $this->method = 'DELETE';
        return $this;
    }
    
    public function eq($column, $value) {
        $this->query[$column] = 'eq.' . $value;
        return $this;
    }
    
    public function single() {
        $this->isSingle = true;
        return $this;
    }
    
    public function order($column, $options = []) {
        $ascending = $options['ascending'] ?? true;
        $this->query['order'] = $column . '.' . ($ascending ? 'asc' : 'desc');
        return $this;
    }
    
    public function limit($count) {
        $this->query['limit'] = $count;
        return $this;
    }
    
    public function upsert($data, $options = []) {
        $this->method = 'POST';
        // Ensure data is wrapped in array for batch upsert
        $this->body = is_array($data) && !isset($data[0]) ? [$data] : $data;
        
        // Add upsert headers
        if (isset($options['onConflict'])) {
            $this->query['on_conflict'] = $options['onConflict'];
        }
        
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
            'Content-Type: application/json'
        ];
        
        // Add Prefer header for insert/update to return the data
        if ($this->method === 'POST' || $this->method === 'PATCH') {
            // Check if this is an upsert operation
            if (isset($this->query['on_conflict'])) {
                $headers[] = 'Prefer: resolution=merge-duplicates,return=representation';
            } else {
                $headers[] = 'Prefer: return=representation';
            }
        }
        
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
        
        // Get HTTP response code
        $http_response_header = $http_response_header ?? [];
        $status_line = $http_response_header[0] ?? '';
        $status_code = 200;
        if (preg_match('/HTTP\/\d\.\d\s+(\d+)/', $status_line, $matches)) {
            $status_code = (int)$matches[1];
        }
        
        if ($response === false) {
            throw new \Exception('Failed to connect to Supabase API at ' . $endpoint);
        }
        
        // Gracefully handle "no rows" responses for single() queries.
        // PostgREST returns 406 (or sometimes 404) with code "PGRST116" when no record matches.
        // Instead of treating this as an error, we convert it to an empty result so callers can
        // decide how to proceed without triggering a 500.
        if ($this->isSingle && ($status_code === 406 || $status_code === 404)) {
            return (object)['data' => null];
        }
        
        if ($status_code >= 400) {
            $error_data = json_decode($response, true);
            $error_message = $error_data['message'] ?? $error_data['error'] ?? 'HTTP ' . $status_code;
            throw new \Exception('Supabase API error: ' . $error_message . ' (Status: ' . $status_code . ')');
        }
        
        $data = json_decode($response);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \Exception('Invalid JSON response from Supabase: ' . json_last_error_msg());
        }
        
        // For single() queries, return first item or null if not found
        if ($this->isSingle) {
            if (is_array($data) && count($data) === 0) {
                return (object)['data' => null];
            }
            if (is_array($data) && count($data) > 0) {
                return (object)['data' => $data[0]];
            }
        }
        
        return (object)['data' => $data];
    }
}

// Helper function to get Supabase client
function getSupabaseClient() {
    return new CreateClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Helper function to get Supabase service client (bypasses RLS)
function getSupabaseServiceClient() {
    return new CreateClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}