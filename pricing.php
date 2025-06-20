<?php
// Redirect to homepage pricing section
$canceled = isset($_GET['canceled']) && $_GET['canceled'] === 'true';

if ($canceled) {
    // Show a temporary message before redirecting
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redirecting...</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            body { background: #0a0a0a; }
        </style>
    </head>
    <body class="bg-black flex items-center justify-center min-h-screen">
        <div class="text-center">
            <p class="text-gray-400 mb-4">Payment cancelled. Redirecting to pricing...</p>
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
        </div>
        <script>
            setTimeout(() => {
                window.location.href = '/#pricing';
            }, 2000);
        </script>
    </body>
    </html>
    <?php
} else {
    // Direct redirect
    header('Location: /#pricing');
    exit();
}