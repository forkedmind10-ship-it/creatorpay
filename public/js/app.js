// CreatorPay Frontend JavaScript
class CreatorPayApp {
    constructor() {
        // Auto-detect API base URL
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        this.apiBase = isLocalhost ? 'http://localhost:3001/api/v1' : `${window.location.origin}/api/v1`;
        this.init();
    }

    async init() {
        await this.loadStats();
        await this.loadContent();
        this.setupEventListeners();
    }

    // Navigation
    showSection(sectionName) {
        // Hide all sections
        const sections = ['hero', 'browse', 'creators', 'agents', 'login'];
        sections.forEach(section => {
            const element = document.getElementById(section);
            if (element) {
                if (section === sectionName) {
                    element.classList.remove('hidden');
                } else {
                    element.classList.add('hidden');
                }
            }
        });

        // Show hero by default if no specific section
        if (!sectionName || sectionName === 'home') {
            document.getElementById('hero').classList.remove('hidden');
        }
    }

    // Load platform statistics
    async loadStats() {
        try {
            const response = await fetch(`${this.apiBase}/stats`);
            if (response.ok) {
                const stats = await response.json();
                this.animateCounter('stat-creators', stats.creators || 0);
                this.animateCounter('stat-payments', `$${(stats.totalPaid || 0).toLocaleString()}`);
                this.animateCounter('stat-agents', stats.agents || 0);
                this.animateCounter('stat-content', stats.content || 0);
            } else {
                // Fallback demo data
                this.animateCounter('stat-creators', 127);
                this.animateCounter('stat-payments', '$12,847');
                this.animateCounter('stat-agents', 43);
                this.animateCounter('stat-content', 1284);
            }
        } catch (error) {
            console.log('Using demo stats');
            // Demo data
            setTimeout(() => {
                this.animateCounter('stat-creators', 127);
                this.animateCounter('stat-payments', '$12,847');
                this.animateCounter('stat-agents', 43);
                this.animateCounter('stat-content', 1284);
            }, 500);
        }
    }

    animateCounter(elementId, finalValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (typeof finalValue === 'string' && finalValue.startsWith('$')) {
            element.textContent = finalValue;
            return;
        }

        let current = 0;
        const increment = Math.ceil(finalValue / 50);
        const timer = setInterval(() => {
            current += increment;
            if (current >= finalValue) {
                current = finalValue;
                clearInterval(timer);
            }
            element.textContent = current;
        }, 30);
    }

    // Load and display content
    async loadContent() {
        const contentGrid = document.getElementById('contentGrid');
        if (!contentGrid) return;

        try {
            const response = await fetch(`${this.apiBase}/content?limit=12`);
            let content = [];
            
            if (response.ok) {
                const data = await response.json();
                content = data.content || [];
            } else {
                // Demo content
                content = this.getDemoContent();
            }

            contentGrid.innerHTML = content.map(item => this.createContentCard(item)).join('');
        } catch (error) {
            console.log('Using demo content');
            contentGrid.innerHTML = this.getDemoContent().map(item => this.createContentCard(item)).join('');
        }
    }

    getDemoContent() {
        return [
            {
                id: 1,
                title: "The Future of AI Agent Economics",
                excerpt: "A deep dive into how AI agents will reshape the creator economy through automated micropayments...",
                price: 0.05,
                creator: { username: "vitalik", displayName: "Vitalik B." },
                contentType: "analysis",
                tags: ["ai", "economics", "agents"],
                views: 847
            },
            {
                id: 2,
                title: "Building with x402 Protocol",
                excerpt: "Technical tutorial on implementing HTTP-native crypto payments for your applications...",
                price: 0.03,
                creator: { username: "developer", displayName: "Dev Master" },
                contentType: "tutorial",
                tags: ["x402", "crypto", "payments"],
                views: 623
            },
            {
                id: 3,
                title: "Base L2 Performance Analysis",
                excerpt: "Comprehensive benchmarking of Base L2 for micropayment applications and throughput...",
                price: 0.08,
                creator: { username: "researcher", displayName: "Chain Analyst" },
                contentType: "research",
                tags: ["base", "l2", "performance"],
                views: 291
            },
            {
                id: 4,
                title: "MCP Integration Best Practices",
                excerpt: "How to properly integrate Model Context Protocol servers with Claude and OpenClaw...",
                price: 0.04,
                creator: { username: "aibuilder", displayName: "AI Builder" },
                contentType: "tutorial",
                tags: ["mcp", "claude", "integration"],
                views: 456
            },
            {
                id: 5,
                title: "Creator Economy 2026 Report",
                excerpt: "Annual state of the creator economy with focus on AI consumption patterns...",
                price: 0.12,
                creator: { username: "economist", displayName: "Market Research" },
                contentType: "research",
                tags: ["creators", "economy", "report"],
                views: 1203
            },
            {
                id: 6,
                title: "Smart Contract Security for Payments",
                excerpt: "Security considerations when building automated payment systems with smart contracts...",
                price: 0.06,
                creator: { username: "security", displayName: "Sec Researcher" },
                contentType: "analysis",
                tags: ["security", "payments", "contracts"],
                views: 334
            }
        ];
    }

    createContentCard(item) {
        const tagColors = {
            'ai': 'bg-blue-100 text-blue-800',
            'crypto': 'bg-purple-100 text-purple-800',
            'payments': 'bg-green-100 text-green-800',
            'tutorial': 'bg-orange-100 text-orange-800',
            'research': 'bg-red-100 text-red-800',
            'default': 'bg-gray-100 text-gray-800'
        };

        return `
            <div class="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
                <div class="flex justify-between items-start mb-3">
                    <span class="text-sm text-gray-500">${item.contentType}</span>
                    <span class="text-lg font-bold text-green-600">$${item.price}</span>
                </div>
                
                <h3 class="font-bold text-lg mb-2 line-clamp-2">${item.title}</h3>
                <p class="text-gray-600 mb-4 line-clamp-3">${item.excerpt}</p>
                
                <div class="flex flex-wrap gap-2 mb-4">
                    ${item.tags.map(tag => `
                        <span class="px-2 py-1 text-xs rounded-full ${tagColors[tag] || tagColors.default}">
                            ${tag}
                        </span>
                    `).join('')}
                </div>
                
                <div class="flex justify-between items-center">
                    <div class="flex items-center text-sm text-gray-500">
                        <i class="fas fa-user mr-1"></i>
                        ${item.creator.displayName || item.creator.username}
                    </div>
                    <div class="flex items-center text-sm text-gray-500">
                        <i class="fas fa-eye mr-1"></i>
                        ${item.views}
                    </div>
                </div>
                
                <div class="mt-4 flex space-x-2">
                    <button onclick="app.previewContent(${item.id})" 
                            class="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 text-sm">
                        Preview
                    </button>
                    <button onclick="app.purchaseContent(${item.id})" 
                            class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm">
                        Purchase
                    </button>
                </div>
            </div>
        `;
    }

    // Content actions
    async previewContent(contentId) {
        alert(`Preview for content ${contentId} - This would show a free excerpt of the content.`);
    }

    async purchaseContent(contentId) {
        alert(`Purchase flow for content ${contentId} - This would initiate the x402 payment process.`);
    }

    // Search functionality
    setupSearch() {
        const searchInput = document.getElementById('contentSearch');
        if (!searchInput) return;

        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.searchContent(e.target.value);
            }, 300);
        });
    }

    async searchContent(query) {
        if (!query.trim()) {
            await this.loadContent();
            return;
        }

        const contentGrid = document.getElementById('contentGrid');
        if (!contentGrid) return;

        try {
            const response = await fetch(`${this.apiBase}/content?search=${encodeURIComponent(query)}`);
            let content = [];
            
            if (response.ok) {
                const data = await response.json();
                content = data.content || [];
            } else {
                // Demo search
                content = this.getDemoContent().filter(item => 
                    item.title.toLowerCase().includes(query.toLowerCase()) ||
                    item.excerpt.toLowerCase().includes(query.toLowerCase()) ||
                    item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
                );
            }

            contentGrid.innerHTML = content.length > 0 
                ? content.map(item => this.createContentCard(item)).join('')
                : '<div class="col-span-full text-center py-8 text-gray-500">No content found matching your search.</div>';
        } catch (error) {
            console.log('Search error, using demo filter');
            const demoContent = this.getDemoContent().filter(item => 
                item.title.toLowerCase().includes(query.toLowerCase()) ||
                item.excerpt.toLowerCase().includes(query.toLowerCase()) ||
                item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
            );
            contentGrid.innerHTML = demoContent.map(item => this.createContentCard(item)).join('');
        }
    }

    // Creator signup
    async handleCreatorSignup(formData) {
        try {
            const response = await fetch(`${this.apiBase}/creators`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.get('username'),
                    email: formData.get('email'),
                    walletAddress: formData.get('walletAddress'),
                    contentTypes: [formData.get('contentTypes')],
                    bio: formData.get('bio'),
                    platforms: ['creatorpay']
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Welcome ${result.creator.username}! Your creator account has been created. You can now start uploading content.`);
                document.getElementById('creatorSignup').reset();
            } else {
                const error = await response.json();
                alert(`Error: ${error.message || 'Failed to create account'}`);
            }
        } catch (error) {
            console.error('Signup error:', error);
            alert('Demo mode: Creator signup would normally create your account and redirect to the dashboard.');
        }
    }

    // Download MCP SDK
    downloadMCPSDK() {
        // In a real implementation, this would download the SDK
        alert('MCP SDK download would start here. The SDK includes documentation and example code for integrating CreatorPay with your AI agents.');
    }

    // Event listeners
    setupEventListeners() {
        // Creator signup form
        const creatorForm = document.getElementById('creatorSignup');
        if (creatorForm) {
            creatorForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(creatorForm);
                this.handleCreatorSignup(formData);
            });
        }

        // Search setup
        this.setupSearch();

        // Make navigation functions global
        window.showSection = this.showSection.bind(this);
        window.downloadMCPSDK = this.downloadMCPSDK.bind(this);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CreatorPayApp();
});

// CSS utilities for line clamping (since Tailwind CDN might not include all utilities)
const style = document.createElement('style');
style.textContent = `
    .line-clamp-2 {
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
    }
    .line-clamp-3 {
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
    }
`;
document.head.appendChild(style);