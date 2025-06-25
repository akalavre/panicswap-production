<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Us - PanicSwap</title>
    <meta name="description" content="Get in touch with the PanicSwap team - We're here to help">
    
    <!-- Favicons -->
    <link rel="icon" type="image/x-icon" href="assets/images/favicon.ico">
    <link rel="icon" type="image/svg+xml" href="assets/images/favicon.svg">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    
    <!-- Tailwind Configuration -->
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: {
                            50: '#fff1f0',
                            100: '#ffe0db',
                            200: '#ffc5bd',
                            300: '#ff9d8c',
                            400: '#ff6854',
                            500: '#FF4B36',
                            600: '#ed2408',
                            700: '#c71c05',
                            800: '#a41b0a',
                            900: '#871c0f',
                            950: '#490a03',
                        }
                    }
                }
            }
        }
    </script>
    
    <!-- Custom CSS -->
    <link href="assets/css/custom.css" rel="stylesheet">
</head>
<body class="gradient-bg">
    <div class="relative min-h-screen">
        <!-- Gradient Mesh Background -->
        <div class="gradient-mesh"></div>
        
        <!-- Animated Orbs -->
        <div class="orb orb-primary w-96 h-96 top-10 -left-48"></div>
        
        <?php include 'components/header.php'; ?>
        
        <main class="relative z-10">
            <!-- Hero Section -->
            <section class="pt-32 pb-20">
                <div class="container mx-auto px-4">
                    <div class="max-w-4xl mx-auto text-center">
                        <h1 class="text-5xl md:text-6xl font-bold mb-6">
                            <span class="text-gradient">Get in Touch</span>
                        </h1>
                        <p class="text-xl text-gray-300 mb-8">
                            Have questions? We're here to help 24/7
                        </p>
                    </div>
                </div>
            </section>

            <!-- Contact Content -->
            <section class="py-20">
                <div class="container mx-auto px-4">
                    <div class="max-w-6xl mx-auto">
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                            <!-- Contact Cards -->
                            <div class="glass-card p-8 text-center hover:scale-105 transition-transform">
                                <div class="inline-flex items-center justify-center p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl mb-4">
                                    <i data-lucide="message-circle" class="w-8 h-8 text-white"></i>
                                </div>
                                <h3 class="text-xl font-semibold mb-2">Live Chat</h3>
                                <p class="text-gray-400 mb-4">Get instant help from our support team</p>
                                <button class="btn-primary w-full" onclick="openChat()">
                                    Start Chat
                                </button>
                            </div>

                            <div class="glass-card p-8 text-center hover:scale-105 transition-transform">
                                <div class="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mb-4">
                                    <i data-lucide="mail" class="w-8 h-8 text-white"></i>
                                </div>
                                <h3 class="text-xl font-semibold mb-2">Email Support</h3>
                                <p class="text-gray-400 mb-4">We'll respond within 24 hours</p>
                                <a href="mailto:support@panicswap.com" class="btn-primary w-full inline-block">
                                    Send Email
                                </a>
                            </div>

                            <div class="glass-card p-8 text-center hover:scale-105 transition-transform">
                                <div class="inline-flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl mb-4">
                                    <i data-lucide="book-open" class="w-8 h-8 text-white"></i>
                                </div>
                                <h3 class="text-xl font-semibold mb-2">Help Center</h3>
                                <p class="text-gray-400 mb-4">Browse FAQs and guides</p>
                                <a href="#" class="btn-primary w-full inline-block">
                                    View Docs
                                </a>
                            </div>
                        </div>

                        <!-- Contact Form -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div>
                                <h2 class="text-3xl font-bold mb-6 text-gradient">Send us a Message</h2>
                                <form id="contactForm" class="space-y-6">
                                    <div>
                                        <label for="name" class="block text-sm font-medium text-gray-300 mb-2">
                                            Your Name
                                        </label>
                                        <input 
                                            type="text" 
                                            id="name" 
                                            name="name" 
                                            required
                                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
                                            placeholder="John Doe"
                                        >
                                    </div>

                                    <div>
                                        <label for="email" class="block text-sm font-medium text-gray-300 mb-2">
                                            Email Address
                                        </label>
                                        <input 
                                            type="email" 
                                            id="email" 
                                            name="email" 
                                            required
                                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
                                            placeholder="john@example.com"
                                        >
                                    </div>

                                    <div>
                                        <label for="subject" class="block text-sm font-medium text-gray-300 mb-2">
                                            Subject
                                        </label>
                                        <select 
                                            id="subject" 
                                            name="subject"
                                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
                                        >
                                            <option value="general">General Inquiry</option>
                                            <option value="support">Technical Support</option>
                                            <option value="billing">Billing Question</option>
                                            <option value="security">Security Issue</option>
                                            <option value="partnership">Partnership</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label for="message" class="block text-sm font-medium text-gray-300 mb-2">
                                            Message
                                        </label>
                                        <textarea 
                                            id="message" 
                                            name="message" 
                                            rows="5"
                                            required
                                            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-primary-500 focus:outline-none transition-colors resize-none"
                                            placeholder="Tell us how we can help..."
                                        ></textarea>
                                    </div>

                                    <button type="submit" class="btn-primary w-full">
                                        Send Message
                                        <i data-lucide="send" class="w-4 h-4 ml-2 inline"></i>
                                    </button>
                                </form>
                            </div>

                            <div>
                                <h2 class="text-3xl font-bold mb-6 text-gradient">Quick Info</h2>
                                
                                <!-- Contact Info -->
                                <div class="space-y-6 mb-8">
                                    <div class="flex items-start">
                                        <i data-lucide="mail" class="w-5 h-5 text-primary-400 mt-1 mr-4"></i>
                                        <div>
                                            <h3 class="font-semibold mb-1">Email Us</h3>
                                            <p class="text-gray-400">support@panicswap.com</p>
                                            <p class="text-gray-400">security@panicswap.com</p>
                                        </div>
                                    </div>

                                    <div class="flex items-start">
                                        <i data-lucide="clock" class="w-5 h-5 text-primary-400 mt-1 mr-4"></i>
                                        <div>
                                            <h3 class="font-semibold mb-1">Response Time</h3>
                                            <p class="text-gray-400">Live Chat: Instant</p>
                                            <p class="text-gray-400">Email: Within 24 hours</p>
                                        </div>
                                    </div>

                                    <div class="flex items-start">
                                        <i data-lucide="globe" class="w-5 h-5 text-primary-400 mt-1 mr-4"></i>
                                        <div>
                                            <h3 class="font-semibold mb-1">Available 24/7</h3>
                                            <p class="text-gray-400">Our team operates globally to provide</p>
                                            <p class="text-gray-400">round-the-clock support</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Social Links -->
                                <div class="glass-card p-6">
                                    <h3 class="font-semibold mb-4">Join Our Community</h3>
                                    <div class="flex space-x-4">
                                        <a href="#" class="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                            <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
                                            </svg>
                                        </a>
                                        <a href="#" class="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                            <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                                            </svg>
                                        </a>
                                        <a href="#" class="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                            <svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                                            </svg>
                                        </a>
                                    </div>
                                </div>

                                <!-- Emergency Contact -->
                                <div class="mt-8 p-6 bg-gradient-to-r from-orange-500/20 to-red-600/20 rounded-lg">
                                    <h3 class="font-semibold mb-2 flex items-center">
                                        <i data-lucide="alert-circle" class="w-5 h-5 mr-2"></i>
                                        Emergency Support
                                    </h3>
                                    <p class="text-gray-300 text-sm">
                                        For urgent security issues or critical bugs, email us at 
                                        <a href="mailto:security@panicswap.com" class="text-primary-400 hover:text-primary-300">
                                            security@panicswap.com
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
        
        <?php include 'components/footer.php'; ?>
    </div>
    
    <!-- JavaScript -->
    <script src="assets/js/main.js"></script>
    
    <script>
        // Form submission handler
        document.getElementById('contactForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show success message (in production, this would send to backend)
            const button = e.target.querySelector('button[type="submit"]');
            const originalText = button.innerHTML;
            
            button.innerHTML = '<i data-lucide="check" class="w-4 h-4 mr-2 inline"></i> Message Sent!';
            button.classList.add('bg-green-600', 'hover:bg-green-700');
            
            // Reset form
            e.target.reset();
            
            // Reset button after 3 seconds
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('bg-green-600', 'hover:bg-green-700');
                lucide.createIcons();
            }, 3000);
        });

        // Mock chat function
        function openChat() {
            alert('Live chat feature coming soon! For now, please email us at support@panicswap.com');
        }
    </script>
    
    <!-- Initialize Lucide Icons -->
    <script>
        lucide.createIcons();
    </script>
</body>
</html>