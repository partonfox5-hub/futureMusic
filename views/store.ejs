const Store = {
    // Generate or retrieve a persistent session ID
    getSessionId: () => {
        let sid = localStorage.getItem('captain_session_id');
        if (!sid) {
            sid = crypto.randomUUID();
            localStorage.setItem('captain_session_id', sid);
        }
        return sid;
    },

    // Add item to database cart
    add: async (sku) => {
        const sessionId = Store.getSessionId();
        const btn = document.querySelector(`button[data-id="${sku}"]`) || document.querySelector(`button[data-sku="${sku}"]`);
        
        // Optimistic UI update (optional, adds feeling of speed)
        if(btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ADDING...';
            btn.disabled = true;

            try {
                const response = await fetch('/api/cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, sku, quantity: 1 })
                });

                if (!response.ok) throw new Error('Network response was not ok');

                btn.innerHTML = '<i class="fas fa-check"></i> ADDED';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }, 2000);

                // Update badge
                Store.refreshCartCount();

            } catch (error) {
                console.error('Error adding to cart:', error);
                btn.innerHTML = 'ERROR';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }, 2000);
            }
        }
    },

    // Remove item from database cart
    remove: async (sku) => {
        const sessionId = Store.getSessionId();
        try {
            await fetch('/api/cart', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, sku })
            });
            // Re-render the cart page
            if (window.renderCartPage) window.renderCartPage();
            Store.refreshCartCount();
        } catch (error) {
            console.error('Error removing item:', error);
        }
    },

    // Fetch cart data from server
    getCart: async () => {
        const sessionId = Store.getSessionId();
        try {
            const res = await fetch(`/api/cart/${sessionId}`);
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
        const sessionId = Store.getSessionId();
        const btn = document.getElementById('checkout-btn');
        if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSING...';

        try {
            const response = await fetch('/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });
            
            const session = await response.json();
            
            if (session.error) {
                alert(session.error);
                if(btn) btn.innerHTML = 'INITIATE TRANSFER via STRIPE';
                return;
            }

            const stripe = Stripe('your_publishable_key'); // Ideally injected via env var in template
            stripe.redirectToCheckout({ sessionId: session.id });
        } catch (err) {
            console.error("Checkout Error:", err);
            alert("Connection interrupted.");
        }
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
        
        html += `
            <div class="glass-card p-4 rounded flex items-center justify-between border border-gray-700">
                <div class="flex items-center gap-4">
                    <img src="${item.image_url || '/images/default-album-art.jpg'}" class="w-16 h-16 object-cover rounded bg-gray-900">
                    <div>
                        <h3 class="text-white font-bold">${item.name}</h3>
                        <p class="text-sm text-[#D4AF37]">$${price.toFixed(2)}</p>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <button onclick="Store.remove('${item.sku}')" class="text-gray-500 hover:text-red-500 transition-colors">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    if(totalEl) totalEl.innerText = `$${total.toFixed(2)}`;
    
    // Bind Checkout
    const checkoutBtn = document.getElementById('checkout-btn');
    if(checkoutBtn) {
        checkoutBtn.onclick = Store.checkout;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Store.refreshCartCount();

    // Global listener for Add to Cart buttons
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('.add-to-cart-btn');
        if (btn) {
            e.preventDefault();
            // We use dataset.id or dataset.sku. 
            // NOTE: For songs, id is the video_id, which maps to the SKU in the DB products table.
            const sku = btn.dataset.id || btn.dataset.sku; 
            if (sku) Store.add(sku);
        }
    });
});