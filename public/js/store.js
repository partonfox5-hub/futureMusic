window.Store = {
    // Generate or retrieve a persistent session ID
    getSessionId: () => {
        let sid = localStorage.getItem('sessionId');
        if (!sid) {
            sid = crypto.randomUUID();
            localStorage.setItem('sessionId', sid);
        }
        return sid;
    },

    // Add item to database cart
    add: async (sku, size = null) => {
        const sessionId = Store.getSessionId();
        
        // Find button to update UI
        const btn = document.querySelector(`button[data-id="${sku}"]`) || document.querySelector(`button[data-sku="${sku}"]`);
        
        // 1. Setup UI Variables
        let originalText = '';
        let originalAria = '';
        
        // 2. Trigger Loading State
        if(btn) {
            originalText = btn.innerHTML;
            originalAria = btn.getAttribute('aria-label') || 'Add to cart';
            btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> ADDING...';
            btn.setAttribute('aria-label', 'Adding item to manifest, please wait');
            btn.disabled = true;
        }

        const badge = document.getElementById('cart-count');
        if (badge) {
            let currentCount = parseInt(badge.innerText) || 0;
            badge.innerText = currentCount + 1;
            badge.classList.remove('hidden');
        }

        try {
            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, sku, quantity: 1, size: size })
            });

            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            if (data.newCount !== undefined && badge) {
                badge.innerText = data.newCount;
                badge.classList.remove('hidden');
            }

            // 4. Trigger UI Success
            if(btn) {
                btn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i> ADDED';
                btn.setAttribute('aria-label', 'Item successfully added to manifest');
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.setAttribute('aria-label', originalAria);
                    btn.disabled = false;
                }, 2000);
            }

        } catch (error) {
            console.error('Error adding to cart:', error);
            Store.refreshCartCount(); 
            
            // 6. Trigger UI Error
            if(btn) {
                btn.innerHTML = 'ERROR';
                btn.setAttribute('aria-label', 'Failed to add item. Please try again.');
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.setAttribute('aria-label', originalAria);
                    btn.disabled = false;
                }, 2000);
            }
        }
    },

    // Remove item from database cart
    remove: async (sku, size) => {
        const sessionId = Store.getSessionId();
        try {
            await fetch('/api/cart', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, sku, size: size || '' })
            });
            
            if (window.renderCartPage) await window.renderCartPage();
            Store.refreshCartCount();
        } catch (error) {
            console.error('Error removing item:', error);
        }
    },

    // Fetch cart data from server
    getCart: async () => {
        const sessionId = Store.getSessionId();
        try {
            const res = await fetch(`/api/cart/${sessionId}?t=${Date.now()}`);
            const data = await res.json();
            return data.items || [];
        } catch (e) {
            console.error("Failed to load cart", e);
            return [];
        }
    },

    refreshCartCount: async () => {
        const items = await Store.getCart();
        const count = items.reduce((acc, item) => acc + item.quantity, 0);
        const badge = document.getElementById('cart-count');
        if(badge) {
            badge.innerText = count;
            badge.classList.toggle('hidden', count === 0);
        }
    },

    checkout: async () => {
        const btn = document.getElementById('checkout-btn');
        if(btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> PROCESSING...';
            btn.setAttribute('aria-label', 'Initiating secure checkout, please wait');
            btn.disabled = true;
        }
        window.location.href = '/checkout-form';
    }
};

// Global Render Function for the Cart Page
window.renderCartPage = async () => {
    const container = document.getElementById('cart-container');
    const totalEl = document.getElementById('cart-total');
    const summary = document.getElementById('cart-summary');
    
    if (!container) return;

    container.innerHTML = '<p class="text-center text-gray-500">Loading manifest...</p>';
    
    const items = await Store.getCart();

    if (items.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-12">Your manifest is empty.</p>';
        if(summary) summary.classList.add('hidden');
        return;
    }

    if(summary) summary.classList.remove('hidden');
    
    let html = '';
    let total = 0;

    items.forEach(item => {
        const price = Number(item.price);
        total += price * item.quantity;
        const sizeBadge = item.size ? `<span class="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-600 ml-2">${item.size}</span>` : '';
        const ariaLabel = `Remove ${item.name}${item.size ? ' (Size: ' + item.size + ')' : ''} from manifest`;
        
        html += `
            <div class="glass-card p-4 rounded flex items-center justify-between border border-gray-700">
                <div class="flex items-center gap-4">
                    <img src="${item.image_url || '/images/default-album-art.jpg'}" alt="${item.name}" class="w-16 h-16 object-cover rounded bg-gray-900">
                    <div>
                        <h3 class="text-white font-bold flex items-center">
                            ${item.name} 
                            ${sizeBadge}
                        </h3>
                        <p class="text-sm text-[#D4AF37]">$${price.toFixed(2)}</p>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <span class="text-gray-500 text-sm">Qty: ${item.quantity}</span>
                    <button 
                        type="button"
                        data-action="remove-item"
                        data-sku="${String(item.sku).replace(/"/g, '&quot;')}" 
                        data-size="${String(item.size || '').replace(/"/g, '&quot;')}" 
                        aria-label="${ariaLabel}"
                        class="text-gray-500 hover:text-red-500 focus:outline-none focus:text-red-500 focus:ring-2 focus:ring-red-500/20 rounded p-1 transition-all">
                        <i class="fas fa-trash" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    container.querySelectorAll('button[data-action="remove-item"]').forEach(btn => {
        btn.onclick = () => {
            Store.remove(btn.dataset.sku, btn.dataset.size);
        };
    });

    if(totalEl) totalEl.innerText = `$${total.toFixed(2)}`;
    
    const checkoutBtn = document.getElementById('checkout-btn');
    if(checkoutBtn) {
        checkoutBtn.onclick = Store.checkout;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Store.refreshCartCount();

    const mainBtn = document.getElementById('addToCartMain');
    if (mainBtn) {
        mainBtn.onclick = null; 
        mainBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const sizeSelect = document.getElementById('size') || document.querySelector('select');
            const size = sizeSelect ? sizeSelect.value : null;
            const sku = mainBtn.dataset.id || mainBtn.dataset.sku;
            if (sku) {
                Store.add(sku, size);
            }
        });
    }

    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('.add-to-cart-btn');
        if (btn && !btn.id.includes('addToCartMain')) {
            e.preventDefault();
            const sku = btn.dataset.id || btn.dataset.sku; 
            if (sku) Store.add(sku);
        }
    });
});