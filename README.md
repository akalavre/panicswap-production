# PanicSwap PHP Frontend

This is a PHP/HTML/CSS/JavaScript version of the PanicSwap frontend, migrated from Next.js.

## Setup Instructions

### Prerequisites
- PHP 7.4 or higher
- A web server (Apache, Nginx, or PHP's built-in server)
- Modern web browser with JavaScript enabled

### Installation

1. **Clone or download the project files**

2. **Start a local PHP server**:
   ```bash
   php -S localhost:8000
   ```

3. **Open in browser**:
   Navigate to `http://localhost:8000`

That's it! No build process or Node.js required. The project uses Tailwind CSS via CDN.

## Project Structure

```
PanicSwap-php/
├── index.php                # Main entry point
├── components/              # PHP component files
│   ├── header.php
│   ├── hero.php
│   ├── footer.php
│   └── ...
├── assets/
│   ├── css/
│   │   └── custom.css      # Custom styles
│   ├── js/
│   │   └── main.js         # Main JavaScript file
│   └── images/
└── README.md
```

## Features

- **Responsive Design**: Built with Tailwind CSS (via CDN) for mobile-first responsive design
- **Dual Protection Modes**: Choose between Full Protection or Watch-Only Mode
- **Wallet Integration**: Connect with Phantom and other Solana wallets, or monitor addresses manually
- **Real-time Updates**: Dynamic content updates without page refresh
- **Component-based**: Modular PHP components for easy maintenance
- **No Build Process**: Uses CDN for all dependencies

## Protection Modes

PanicSwap offers two distinct protection modes to suit different user needs:

### 🛡️ Full Protection Mode
- **Automatic Emergency Swaps**: Instantly executes swaps when rug pulls are detected
- **Private Key Required**: Requires wallet connection for transaction signing
- **Premium Feature**: Available with Pro, Enterprise, or Degen-Mode subscriptions
- **Complete Protection**: Monitoring + Alerts + Automatic Actions

### 👁️ Watch-Only Mode  
- **Monitoring & Alerts**: Real-time threat detection and notifications
- **No Private Key Needed**: Monitor any wallet address without connecting
- **Manual Address Entry**: Simply enter a Solana wallet address to start monitoring
- **Free Tier Available**: Basic monitoring included in free plans
- **Manual Action Required**: Users receive alerts but must execute trades manually

> **Important**: Watch-Only Mode provides comprehensive monitoring and alerting but does not execute automatic swaps. Users will receive immediate notifications of potential threats and must take manual action to protect their assets.

## Development

### Adding New Pages

1. Create a new PHP file in the root directory (e.g., `dashboard.php`)
2. Include the necessary components:
   ```php
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <!-- Copy head content from index.php -->
   </head>
   <body>
       <?php include 'components/header.php'; ?>
       <!-- Your page content -->
       <?php include 'components/footer.php'; ?>
       <script src="assets/js/main.js"></script>
   </body>
   </html>
   ```

### Modifying Styles

1. Edit `assets/css/custom.css` for custom styles
2. Use Tailwind classes directly in HTML/PHP files
3. The Tailwind configuration is in the `<script>` tag in index.php

### JavaScript Functionality

All client-side JavaScript is in `assets/js/main.js`. The main features include:
- Wallet connection/disconnection
- Mobile menu toggle
- Mouse tracking effects
- Real-time data updates
- Modal management

## Deployment

1. Upload all files to your web server
2. Ensure PHP is configured correctly
3. Set appropriate file permissions
4. Configure your web server to serve `index.php` as the default

## API Integration

To connect to the backend API:
1. Update the `apiCall` function in `main.js` with your API endpoint
2. Implement server-side API calls in PHP if needed

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Dependencies

All dependencies are loaded via CDN:
- Tailwind CSS 3.x
- Google Fonts (Inter)
- No package.json or node_modules required!

## License

See LICENSE file in the root directory.