// Creator Dashboard JavaScript
class CreatorDashboard {
    constructor() {
        // Auto-detect API base URL
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        this.apiBase = isLocalhost ? 'http://localhost:3001/api/v1' : `${window.location.origin}/api/v1`;
        this.creatorId = this.getCreatorId();
        this.earningsChart = null;
        this.init();
    }

    async init() {
        await this.loadCreatorData();
        await this.loadDashboardStats();
        await this.loadContent();
        await this.loadRecentPayments();
        this.setupEventListeners();
        this.initChart();
    }

    getCreatorId() {
        // In a real app, this would come from authentication/session
        return localStorage.getItem('creatorId') || 'demo-creator';
    }

    // Load creator profile data
    async loadCreatorData() {
        try {
            const response = await fetch(`${this.apiBase}/creators/${this.creatorId}`);
            if (response.ok) {
                const creator = await response.json();
                document.getElementById('creatorName').textContent = creator.displayName || creator.username;
            } else {
                // Demo data
                document.getElementById('creatorName').textContent = 'Demo Creator';
            }
        } catch (error) {
            console.log('Using demo creator data');
            document.getElementById('creatorName').textContent = 'Demo Creator';
        }
    }

    // Load dashboard statistics
    async loadDashboardStats() {
        try {
            const response = await fetch(`${this.apiBase}/creators/${this.creatorId}/analytics`);
            if (response.ok) {
                const stats = await response.json();
                this.updateStats(stats);
            } else {
                // Demo stats
                this.updateStats(this.getDemoStats());
            }
        } catch (error) {
            console.log('Using demo stats');
            this.updateStats(this.getDemoStats());
        }
    }

    getDemoStats() {
        return {
            totalEarnings: 847.32,
            totalViews: 12584,
            totalPurchases: 256,
            totalContent: 18,
            walletBalance: 122.45
        };
    }

    updateStats(stats) {
        document.getElementById('totalEarnings').textContent = `$${stats.totalEarnings.toFixed(2)}`;
        document.getElementById('totalViews').textContent = stats.totalViews.toLocaleString();
        document.getElementById('totalPurchases').textContent = stats.totalPurchases.toLocaleString();
        document.getElementById('totalContent').textContent = stats.totalContent;
        document.getElementById('walletBalance').textContent = `$${(stats.walletBalance || 0).toFixed(2)}`;
    }

    // Tab management
    showTab(tabName) {
        // Update tab buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.remove('active', 'border-blue-600', 'text-blue-600');
            button.classList.add('border-transparent', 'text-gray-500');
        });

        const activeButton = document.getElementById(`${tabName}Tab`);
        activeButton.classList.add('active', 'border-blue-600', 'text-blue-600');
        activeButton.classList.remove('border-transparent', 'text-gray-500');

        // Show/hide tab content
        const tabContents = ['contentTabContent', 'uploadTabContent', 'analyticsTabContent'];
        tabContents.forEach(contentId => {
            const element = document.getElementById(contentId);
            if (contentId === `${tabName}TabContent`) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        });

        // Load specific tab data
        if (tabName === 'analytics') {
            setTimeout(() => this.updateChart(), 100);
        }
    }

    // Load creator's content
    async loadContent() {
        const contentList = document.getElementById('contentList');
        if (!contentList) return;

        try {
            const response = await fetch(`${this.apiBase}/creators/${this.creatorId}/content`);
            let content = [];
            
            if (response.ok) {
                const data = await response.json();
                content = data.content || [];
            } else {
                // Demo content
                content = this.getDemoContent();
            }

            contentList.innerHTML = content.map(item => this.createContentItem(item)).join('');
        } catch (error) {
            console.log('Using demo content');
            contentList.innerHTML = this.getDemoContent().map(item => this.createContentItem(item)).join('');
        }
    }

    getDemoContent() {
        return [
            {
                id: 1,
                title: "The Future of AI Agent Economics",
                contentType: "analysis",
                price: 0.05,
                views: 847,
                purchases: 23,
                earnings: 1.15,
                createdAt: "2026-02-08",
                status: "published"
            },
            {
                id: 2,
                title: "Building with x402 Protocol",
                contentType: "tutorial",
                price: 0.03,
                views: 623,
                purchases: 19,
                earnings: 0.57,
                createdAt: "2026-02-06",
                status: "published"
            },
            {
                id: 3,
                title: "Base L2 Performance Analysis",
                contentType: "research",
                price: 0.08,
                views: 291,
                purchases: 12,
                earnings: 0.96,
                createdAt: "2026-02-04",
                status: "published"
            },
            {
                id: 4,
                title: "Draft: Token Economics for AI",
                contentType: "analysis",
                price: 0.06,
                views: 0,
                purchases: 0,
                earnings: 0,
                createdAt: "2026-02-10",
                status: "draft"
            }
        ];
    }

    createContentItem(item) {
        const statusColor = item.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
        const typeColors = {
            'analysis': 'text-blue-600',
            'tutorial': 'text-orange-600',
            'research': 'text-purple-600',
            'article': 'text-green-600'
        };

        return `
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                            <h4 class="font-semibold text-lg">${item.title}</h4>
                            <span class="px-2 py-1 text-xs rounded-full ${statusColor}">${item.status}</span>
                        </div>
                        <div class="flex items-center text-sm text-gray-500 space-x-4">
                            <span class="capitalize ${typeColors[item.contentType] || 'text-gray-600'}">${item.contentType}</span>
                            <span>$${item.price}</span>
                            <span>${new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="dashboard.editContent(${item.id})" class="text-blue-600 hover:text-blue-700 text-sm">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button onclick="dashboard.deleteContent(${item.id})" class="text-red-600 hover:text-red-700 text-sm">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-4 gap-4 text-sm">
                    <div class="text-center">
                        <div class="font-semibold text-gray-900">${item.views}</div>
                        <div class="text-gray-500">Views</div>
                    </div>
                    <div class="text-center">
                        <div class="font-semibold text-blue-600">${item.purchases}</div>
                        <div class="text-gray-500">Purchases</div>
                    </div>
                    <div class="text-center">
                        <div class="font-semibold text-green-600">$${item.earnings.toFixed(2)}</div>
                        <div class="text-gray-500">Earned</div>
                    </div>
                    <div class="text-center">
                        <div class="font-semibold text-purple-600">${item.purchases > 0 ? ((item.purchases / item.views) * 100).toFixed(1) : '0'}%</div>
                        <div class="text-gray-500">Conversion</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Content actions
    async editContent(contentId) {
        alert(`Edit content ${contentId} - This would open the content editor.`);
    }

    async deleteContent(contentId) {
        if (confirm('Are you sure you want to delete this content?')) {
            try {
                const response = await fetch(`${this.apiBase}/content/${contentId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    alert('Content deleted successfully');
                    await this.loadContent(); // Reload content list
                } else {
                    alert('Error deleting content');
                }
            } catch (error) {
                alert('Demo mode: Content would be deleted in a real implementation');
            }
        }
    }

    // Upload new content
    async handleContentUpload(formData) {
        try {
            const contentData = {
                creatorId: this.creatorId,
                title: formData.get('title'),
                content: formData.get('content'),
                excerpt: formData.get('excerpt'),
                contentType: formData.get('contentType'),
                price: parseFloat(formData.get('price')),
                tags: formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag)
            };

            const response = await fetch(`${this.apiBase}/content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(contentData)
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Content "${result.content.title}" published successfully!`);
                document.getElementById('uploadForm').reset();
                await this.loadContent();
                this.showTab('content');
            } else {
                const error = await response.json();
                alert(`Error: ${error.message || 'Failed to publish content'}`);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Demo mode: Content would be published and you would be redirected to the content management tab.');
            document.getElementById('uploadForm').reset();
            this.showTab('content');
        }
    }

    // Load recent payments
    async loadRecentPayments() {
        const paymentsContainer = document.getElementById('recentPayments');
        if (!paymentsContainer) return;

        try {
            const response = await fetch(`${this.apiBase}/creators/${this.creatorId}/payments?limit=5`);
            let payments = [];
            
            if (response.ok) {
                const data = await response.json();
                payments = data.payments || [];
            } else {
                // Demo payments
                payments = this.getDemoPayments();
            }

            paymentsContainer.innerHTML = payments.map(payment => this.createPaymentItem(payment)).join('');
        } catch (error) {
            console.log('Using demo payments');
            paymentsContainer.innerHTML = this.getDemoPayments().map(payment => this.createPaymentItem(payment)).join('');
        }
    }

    getDemoPayments() {
        return [
            {
                id: 1,
                amount: 0.05,
                contentTitle: "AI Agent Economics",
                agentType: "Claude-3.5",
                timestamp: "2026-02-11T08:30:00Z",
                txHash: "0x1234...5678"
            },
            {
                id: 2,
                amount: 0.03,
                contentTitle: "x402 Protocol Tutorial",
                agentType: "OpenClaw",
                timestamp: "2026-02-11T07:15:00Z",
                txHash: "0x8765...4321"
            },
            {
                id: 3,
                amount: 0.08,
                contentTitle: "Base L2 Analysis",
                agentType: "Custom Agent",
                timestamp: "2026-02-11T06:45:00Z",
                txHash: "0x9999...1111"
            }
        ];
    }

    createPaymentItem(payment) {
        const timeAgo = this.timeAgo(new Date(payment.timestamp));
        return `
            <div class="flex items-center justify-between py-2">
                <div class="flex-1">
                    <div class="font-medium text-sm">${payment.contentTitle}</div>
                    <div class="text-xs text-gray-500">${payment.agentType} • ${timeAgo}</div>
                </div>
                <div class="text-right">
                    <div class="font-semibold text-green-600 text-sm">+$${payment.amount.toFixed(2)}</div>
                    <div class="text-xs text-gray-400">${payment.txHash.substring(0, 8)}...</div>
                </div>
            </div>
        `;
    }

    timeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    }

    // Initialize earnings chart
    initChart() {
        const ctx = document.getElementById('earningsChart');
        if (!ctx) return;

        this.earningsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Earnings ($)',
                    data: [0, 0, 0, 0, 0, 0],
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        this.updateChart();
    }

    updateChart() {
        if (!this.earningsChart) return;

        // Demo data - in real app, fetch from analytics API
        const demoData = [45, 78, 125, 189, 267, 347];
        this.earningsChart.data.datasets[0].data = demoData;
        this.earningsChart.update();
    }

    // User menu toggle
    toggleUserMenu() {
        const menu = document.getElementById('userMenu');
        menu.classList.toggle('hidden');
    }

    // Event listeners
    setupEventListeners() {
        // Upload form
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(uploadForm);
                this.handleContentUpload(formData);
            });
        }

        // Click outside to close user menu
        document.addEventListener('click', (e) => {
            const userMenu = document.getElementById('userMenu');
            const userMenuButton = e.target.closest('[onclick="toggleUserMenu()"]');
            
            if (!userMenuButton && !userMenu.contains(e.target)) {
                userMenu.classList.add('hidden');
            }
        });

        // Make functions global for onclick handlers
        window.showTab = this.showTab.bind(this);
        window.toggleUserMenu = this.toggleUserMenu.bind(this);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new CreatorDashboard();
});

// CSS for active tab styling
const style = document.createElement('style');
style.textContent = `
    .tab-button.active {
        border-bottom-color: #3B82F6 !important;
        color: #3B82F6 !important;
    }
`;
document.head.appendChild(style);