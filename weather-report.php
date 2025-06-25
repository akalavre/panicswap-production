<?php
session_start();

// Simple password protection
$ADMIN_PASSWORD = 'pogo12345'; // Change this to your secure password

// Handle login
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['admin_password'])) {
    if ($_POST['admin_password'] === $ADMIN_PASSWORD) {
        $_SESSION['weather_admin'] = true;
    } else {
        $error = 'Invalid password';
    }
}

// Handle logout
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: weather-report.php');
    exit;
}

// Check if logged in
$isLoggedIn = isset($_SESSION['weather_admin']) && $_SESSION['weather_admin'] === true;
?>
<!DOCTYPE html>
<html>
<head>
    <title>Weather Report System</title>
    <style>
        body {
            font-family: monospace;
            background: #1a1a1a;
            color: white;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        h1 {
            color: #818cf8;
        }
        .container {
            background: #262626;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        textarea {
            width: 100%;
            padding: 10px;
            margin: 10px 0;
            background: #1a1a1a;
            color: white;
            border: 1px solid #444;
            border-radius: 5px;
            font-family: monospace;
            font-size: 14px;
            resize: vertical;
            min-height: 100px;
        }
        button {
            background: #818cf8;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 10px;
        }
        button:hover {
            background: #6366f1;
        }
        .result {
            margin-top: 20px;
            padding: 20px;
            background: #1a1a1a;
            border-radius: 5px;
            word-break: break-all;
            border: 1px solid #444;
        }
        .error {
            color: #f87171;
            background: #7f1d1d;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
        }
        .success {
            color: #4ade80;
        }
        .warning {
            background: #7c2d12;
            color: #fb923c;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <h1>🌤️ Weather Report System</h1>
    
    <div class="container">
        <?php if (!$isLoggedIn): ?>
            <!-- Login Form -->
            <h2>Admin Access Required</h2>
            <p>Please enter your credentials to access the weather data system.</p>
            
            <?php if (isset($error)): ?>
                <div class="error"><?php echo $error; ?></div>
            <?php endif; ?>
            
            <form method="POST">
                <input type="password" name="admin_password" placeholder="Enter password" style="width: 100%; padding: 10px; margin: 10px 0; background: #1a1a1a; color: white; border: 1px solid #444; border-radius: 5px; font-size: 16px;" required autofocus>
                <button type="submit">Access System</button>
            </form>
        <?php else: ?>
            <!-- Logged in - show decryption tool -->
            <div style="text-align: right; margin-bottom: 20px;">
                <a href="?logout" style="color: #818cf8; text-decoration: none;">Logout</a>
            </div>
        <div class="warning">
            ⚠️ <strong>Notice:</strong> This system processes sensitive weather pattern data. Handle with care.
        </div>
        
        <form method="POST">
            <label for="encrypted">Enter weather data coordinates:</label>
            <textarea name="encrypted" id="encrypted" placeholder="Enter data string..." required><?php echo isset($_POST['encrypted']) ? htmlspecialchars($_POST['encrypted']) : ''; ?></textarea>
            
            <button type="submit">Process Data</button>
        </form>
        
        <?php
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['encrypted'])) {
            require_once 'config/encryption.php';
            
            echo '<div class="result">';
            
            try {
                $encrypted = trim($_POST['encrypted']);
                $decrypted = Encryption::decrypt($encrypted);
                
                echo '<h3 class="success">✓ Weather Data Processed</h3>';
                echo '<p><strong>Input Coordinates:</strong><br>' . htmlspecialchars(substr($encrypted, 0, 50)) . '...</p>';
                echo '<p><strong>Decoded Weather Pattern:</strong><br><code>' . htmlspecialchars($decrypted) . '</code></p>';
                
                // Check if it looks like valid data
                if (strlen($decrypted) >= 64 && strlen($decrypted) <= 88) {
                    echo '<p class="success">✓ Valid weather pattern detected</p>';
                }
                
            } catch (Exception $e) {
                echo '<div class="error">';
                echo '<h3>❌ Weather Data Processing Failed</h3>';
                echo '<p>Error: ' . htmlspecialchars($e->getMessage()) . '</p>';
                echo '<p>Invalid weather coordinates. Please check your input.</p>';
                echo '</div>';
            }
            
            echo '</div>';
        }
        ?>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #444;">
            <h3>📊 Data Format</h3>
            <p>Weather coordinate format example:</p>
            <code style="color: #60a5fa; font-size: 11px;">iItwjictAGQEdPtbMqk2m71mcqAHD1nK0jqEAAwhyFCVRF/p70ejs42pvKyv6yYCr4iIG4Y5dY3BWwL/AasLXi07DGyblnVlL7LcqhT/DvpZSbTdJyXxQGlYde7f3T7tPTFuwopmAKReiYB3ql9+Qw==</code>
            <p style="margin-top: 10px; color: #666;">Weather data must be in base64 encoded format.</p>
        </div>
        <?php endif; ?>
    </div>
</body>
</html>