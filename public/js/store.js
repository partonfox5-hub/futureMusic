window.Store = {
    // Generate or retrieve a persistent session ID
    getSessionId: () => {
        // CHANGED: Use 'sessionId' to match product.ejs and merch.ejs
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
        // Note: For product page, we might pass the button element directly, but here we query
        const btn = document.querySelector(`button[data-id="${sku}"]`) || document.querySelector(`button[data-sku="${sku}"]`);
        
        // 1. Setup UI Variables
        let originalText = '';
        
        // 2. Trigger Loading State (Only if button is found)
        if(btn) {
            originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ADDING...';
            btn.disabled = true;
        }

        try {
            // 3. Perform API Call (Runs regardless of button existence)
            // MOVED OUTSIDE the if(btn) block
            const response = await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, sku, quantity: 1, size: size })
            });

            if (!response.ok) throw new Error('Network response was not ok');

            // 4. Trigger UI Success (Only if button is found)
            if(btn) {
                btn.innerHTML = '<i class="fas fa-check"></i> ADDED';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }, 2000);
            }

            // 5. Update Badge (Runs regardless of button existence)
            await Store.refreshCartCount();

        } catch (error) {
            console.error('Error adding to cart:', error);
            
            // 6. Trigger UI Error (Only if button is found)
            if(btn) {
                btn.innerHTML = 'ERROR';
                setTimeout(() => {
                    btn.innerHTML = originalText;
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
            
            // Added 'await' to ensure the list rebuilds before we update the badge
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
            // ADDED: Timestamp to prevent browser caching of the badge number
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
        if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSING...';
        // Redirect to checkout form
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
        
        html += `
            <div class="glass-card p-4 rounded flex items-center justify-between border border-gray-700">
                <div class="flex items-center gap-4">
                    <img src="${item.image_url || '/images/default-album-art.jpg'}" class="w-16 h-16 object-cover rounded bg-gray-900">
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
                    <!-- Replaced the button line below to handle quotes safely -->
                    <!-- BUTTON FIXED: Uses data attributes to prevent syntax errors -->
                    <button 
                        type="button"
                        data-action="remove-item"
                        data-sku="${String(item.sku).replace(/"/g, '&quot;')}" 
                        data-size="${String(item.size || '').replace(/"/g, '&quot;')}" 
                        class="text-gray-500 hover:text-red-500 transition-colors">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // --- NEW CODE: Bind Remove Buttons Safely ---
    // This replaces the inline onclick to prevent "Invalid Token" errors
    container.querySelectorAll('button[data-action="remove-item"]').forEach(btn => {
        btn.onclick = () => {
            Store.remove(btn.dataset.sku, btn.dataset.size);
        };
    });
    // --------------------------------------------

    if(totalEl) totalEl.innerText = `$${total.toFixed(2)}`;
    
    // Bind Checkout
    const checkoutBtn = document.getElementById('checkout-btn');
    if(checkoutBtn) {
        checkoutBtn.onclick = Store.checkout;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Store.refreshCartCount();

    // Global listener for Add to Cart buttons (Quick Add)
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('.add-to-cart-btn');
        // Only trigger if no custom listener attached (Product page has its own)
        if (btn && !btn.id.includes('addToCartMain')) {
            e.preventDefault();
            const sku = btn.dataset.id || btn.dataset.sku; 
            if (sku) Store.add(sku); // Default add (no size)
        }
    });
});