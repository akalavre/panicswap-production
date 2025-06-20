<?php
// Token Image Proxy
// Handles various image sources including IPFS

header('Access-Control-Allow-Origin: *');

$imageUrl = $_GET['url'] ?? '';

if (empty($imageUrl)) {
    // Redirect to placeholder
    header('Location: /assets/images/token-placeholder.svg');
    exit;
}

// Handle IPFS URLs
if (strpos($imageUrl, 'ipfs://') === 0) {
    $ipfsHash = str_replace('ipfs://', '', $imageUrl);
    $imageUrl = 'https://ipfs.io/ipfs/' . $ipfsHash;
} elseif (strpos($imageUrl, 'https://ipfs.io') === false && strpos($imageUrl, '.ipfs.') !== false) {
    // Handle IPFS gateway URLs
    $imageUrl = str_replace('.ipfs.nftstorage.link', '.ipfs.dweb.link', $imageUrl);
}

// Validate URL
if (!filter_var($imageUrl, FILTER_VALIDATE_URL)) {
    header('Location: /assets/images/token-placeholder.svg');
    exit;
}

// Try to fetch the image
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $imageUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

$imageData = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

if ($httpCode === 200 && $imageData) {
    // Cache for 1 hour
    header('Cache-Control: public, max-age=3600');
    header('Content-Type: ' . $contentType);
    echo $imageData;
} else {
    // Redirect to placeholder on error
    header('Location: /assets/images/token-placeholder.svg');
}
?>