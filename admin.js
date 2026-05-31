document.addEventListener('DOMContentLoaded', () => {

    const db = firebase.firestore();
    const auth = firebase.auth();

    // DOM Elements
    const loginContainer = document.getElementById('login-container');
    const adminDashboard = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('login-form');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // ─── AUTHENTICATION ──────────────────────────────────────────

    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in.
            loginContainer.style.display = 'none';
            adminDashboard.style.display = 'block';
            loadCollections();
            loadOrders();
        } else {
            // No user is signed in.
            loginContainer.style.display = 'flex';
            adminDashboard.style.display = 'none';
        }
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginEmail.value;
        const password = loginPassword.value;
        const btn = loginForm.querySelector('button');

        btn.textContent = 'Logging in...';
        btn.disabled = true;
        loginError.style.display = 'none';

        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                btn.textContent = 'Login';
                btn.disabled = false;
                loginForm.reset();
            })
            .catch((error) => {
                btn.textContent = 'Login';
                btn.disabled = false;
                loginError.textContent = error.message;
                loginError.style.display = 'block';
            });
    });

    logoutBtn.addEventListener('click', () => {
        auth.signOut();
    });

    // ─── TAB NAVIGATION ──────────────────────────────────────────

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const target = document.getElementById(`tab-${btn.dataset.tab}`);
            if (target) {
                target.classList.add('active');
            }
            document.getElementById('view-products').style.display = 'none';
        });
    });

    // Helper to extract fields case-insensitively
    function extractData(rawData) {
        // Build a lowercase key map without skipping any keys
        const data = {};
        for (let key in rawData) {
            const cleanKey = key.toLowerCase().replace(/[\s_]+/g, '');
            // Last-write wins for duplicate normalized keys, prefer the exact match
            if (!(cleanKey in data) || key === cleanKey) {
                data[cleanKey] = rawData[key];
            }
        }
        return {
            name: data.name || data.title || 'Unnamed',
            desc: data.description || data.desc || data.detail || '',
            img: data.img || data.imageurl || data.imgurl || data.image || data.pic || '',
            sizesImg: data.sizesimageurl || data.sizeimage || data.sizesimage || data.sizepic || '',
            sizes: data.sizes || data.size || '',
            refcode: data.refcode || data.referencecode || data.code || data.refercode || '',
            price: data.price || data.cost || '',
            order: (rawData.order !== undefined && rawData.order !== null) ? rawData.order : 0
        };
    }

    // ─── COLLECTIONS CRUD ────────────────────────────────────────

    const collectionsList = document.getElementById('admin-collections-list');
    const addCollectionBtn = document.getElementById('add-collection-btn');
    const colModal = document.getElementById('collection-modal');
    const colForm = document.getElementById('collection-form');
    const colClose = document.getElementById('close-collection-modal');

    // Load Collections
    function loadCollections() {
        collectionsList.innerHTML = '<p>Loading collections...</p>';
        db.collection("collections").orderBy("order").onSnapshot((snapshot) => {
            collectionsList.innerHTML = '';
            if (snapshot.empty) {
                collectionsList.innerHTML = '<p>No collections found.</p>';
                return;
            }
            snapshot.forEach((doc) => {
                const raw = doc.data();
                const data = extractData(raw);
                const card = document.createElement('div');
                card.className = 'admin-card';
                card.draggable = true;
                card.dataset.id = doc.id;
                card.innerHTML = `
                    <div class="admin-card-img" style="background-image: url('${data.img}')">
                        ${(!data.img) ? 'No Image' : ''}
                    </div>
                    <div class="admin-card-content">
                        <h4>${data.name}</h4>
                        <p class="admin-card-desc">${data.desc}</p>
                        <p style="font-size: 0.8rem; color: #999;">Order: ${data.order}</p>
                        <div class="admin-actions">
                            <button class="admin-btn admin-btn-view" onclick="openProducts('${doc.id}', '${data.name.replace(/'/g, "\\'")}')">Products</button>
                            <button class="admin-btn admin-btn-edit" onclick="editCollection('${doc.id}')"><i class="fas fa-edit"></i> Edit</button>
                            <button class="admin-btn admin-btn-delete" onclick="deleteCollection('${doc.id}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
                collectionsList.appendChild(card);
            });
        }, (error) => {
            // If orderBy fails (missing index or field), fall back to unordered query
            console.warn("orderBy failed, falling back to unordered:", error.message);
            db.collection("collections").onSnapshot((snapshot) => {
                collectionsList.innerHTML = '';
                if (snapshot.empty) { collectionsList.innerHTML = '<p>No collections found.</p>'; return; }
                const docs = [];
                snapshot.forEach(doc => docs.push(doc));
                docs.sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
                docs.forEach((doc) => {
                    const raw = doc.data();
                    const data = extractData(raw);
                    const card = document.createElement('div');
                    card.className = 'admin-card';
                card.draggable = true;
                card.dataset.id = doc.id;
                    card.innerHTML = `
                        <div class="admin-card-img" style="background-image: url('${data.img}')">
                            ${(!data.img) ? 'No Image' : ''}
                        </div>
                        <div class="admin-card-content">
                            <h4>${data.name}</h4>
                            <p class="admin-card-desc">${data.desc}</p>
                            <p style="font-size: 0.8rem; color: #999;">Order: ${data.order}</p>
                            <div class="admin-actions">
                                <button class="admin-btn admin-btn-view" onclick="openProducts('${doc.id}', '${data.name.replace(/'/g, "\\'")}')">Products</button>
                                <button class="admin-btn admin-btn-edit" onclick="editCollection('${doc.id}')"><i class="fas fa-edit"></i> Edit</button>
                                <button class="admin-btn admin-btn-delete" onclick="deleteCollection('${doc.id}')"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `;
                    collectionsList.appendChild(card);
                });
            });
        });
    }

    addCollectionBtn.addEventListener('click', () => {
        colForm.reset();
        document.getElementById('collection-id').value = '';
        colModal.classList.add('show');
    });

    colClose.addEventListener('click', () => colModal.classList.remove('show'));

    colForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('collection-id').value;
        const data = {
            name: document.getElementById('col-name').value,
            description: document.getElementById('col-desc').value,
            img: document.getElementById('col-img').value,
            order: parseInt(document.getElementById('col-order').value) || 0
        };

        const btn = colForm.querySelector('button');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        if (id) {
            // Update
            db.collection("collections").doc(id).set(data, { merge: true }).then(() => {
                colModal.classList.remove('show');
            }).catch((err) => { console.error("Save error:", err); alert("Error saving: " + err.message); })
              .finally(() => { btn.textContent = 'Save Collection'; btn.disabled = false; });
        } else {
            // Add
            db.collection("collections").add(data).then(() => {
                colModal.classList.remove('show');
            }).catch((err) => { console.error("Save error:", err); alert("Error saving: " + err.message); })
              .finally(() => { btn.textContent = 'Save Collection'; btn.disabled = false; });
        }
    });

    window.editCollection = function(id) {
        db.collection("collections").doc(id).get().then((doc) => {
            if (doc.exists) {
                const data = extractData(doc.data());
                document.getElementById('collection-id').value = doc.id;
                document.getElementById('col-name').value = data.name;
                document.getElementById('col-desc').value = data.desc;
                document.getElementById('col-img').value = data.img;
                document.getElementById('col-order').value = data.order;
                colModal.classList.add('show');
            }
        });
    };

    window.deleteCollection = function(id) {
        if (confirm("Are you sure you want to delete this collection? All products inside must be deleted manually first if you want to keep Firebase clean.")) {
            db.collection("collections").doc(id).delete();
        }
    };


    // ─── PRODUCTS CRUD ────────────────────────────────────────

    const viewProductsTab = document.getElementById('view-products');
    const tabCollections = document.getElementById('tab-collections');
    const productsList = document.getElementById('admin-products-list');
    const addProductBtn = document.getElementById('add-product-btn');
    const prodModal = document.getElementById('product-modal');
    const prodForm = document.getElementById('product-form');
    const prodClose = document.getElementById('close-product-modal');
    
    let currentCollectionId = null;

    document.getElementById('back-to-collections-btn').addEventListener('click', () => {
        viewProductsTab.style.display = 'none';
        tabCollections.classList.add('active');
        currentCollectionId = null;
    });

    window.openProducts = function(colId, colName) {
        currentCollectionId = colId;
        tabCollections.classList.remove('active');
        viewProductsTab.style.display = 'block';
        document.getElementById('current-collection-name').textContent = colName + ' Products';
        loadProducts(colId);
    };

    let unsubscribeProducts = null;
    function loadProducts(colId) {
        productsList.innerHTML = '<p>Loading products...</p>';
        if (unsubscribeProducts) unsubscribeProducts();

        unsubscribeProducts = db.collection("collections").doc(colId).collection("products").orderBy("order").onSnapshot((snapshot) => {
            productsList.innerHTML = '';
            if (snapshot.empty) {
                productsList.innerHTML = '<p>No products found in this collection.</p>';
                return;
            }
            snapshot.forEach((doc) => {
                const raw = doc.data();
                const data = extractData(raw);
                const card = document.createElement('div');
                card.className = 'admin-card';
                card.draggable = true;
                card.dataset.id = doc.id;
                card.innerHTML = `
                    <div class="admin-card-img" style="background-image: url('${data.img}')">
                        ${(!data.img) ? 'No Image' : ''}
                    </div>
                    <div class="admin-card-content">
                        <h4>${data.name}</h4>
                        ${data.price ? `<p style="color:var(--primary-color); font-weight:bold; margin-bottom: 5px;">${data.price}</p>` : ''}
                        <p class="admin-card-desc">${data.desc}</p>
                        <p style="font-size: 0.8rem; color: #999;">Order: ${data.order}</p>
                        <div class="admin-actions">
                            <button class="admin-btn admin-btn-edit" onclick="editProduct('${colId}', '${doc.id}')"><i class="fas fa-edit"></i> Edit</button>
                            <button class="admin-btn admin-btn-delete" onclick="deleteProduct('${colId}', '${doc.id}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
                productsList.appendChild(card);
            });
        }, (error) => {
            // Fallback: client-side sort if orderBy index is missing
            console.warn("Products orderBy failed, falling back:", error.message);
            db.collection("collections").doc(colId).collection("products").onSnapshot((snapshot) => {
                productsList.innerHTML = '';
                if (snapshot.empty) { productsList.innerHTML = '<p>No products found in this collection.</p>'; return; }
                const docs = [];
                snapshot.forEach(doc => docs.push(doc));
                docs.sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
                docs.forEach((doc) => {
                    const raw = doc.data();
                    const data = extractData(raw);
                    const card = document.createElement('div');
                    card.className = 'admin-card';
                card.draggable = true;
                card.dataset.id = doc.id;
                    card.innerHTML = `
                        <div class="admin-card-img" style="background-image: url('${data.img}')">
                            ${(!data.img) ? 'No Image' : ''}
                        </div>
                        <div class="admin-card-content">
                            <h4>${data.name}</h4>
                            ${data.price ? `<p style="color:var(--primary-color); font-weight:bold; margin-bottom: 5px;">${data.price}</p>` : ''}
                            <p class="admin-card-desc">${data.desc}</p>
                            <p style="font-size: 0.8rem; color: #999;">Order: ${data.order}</p>
                            <div class="admin-actions">
                                <button class="admin-btn admin-btn-edit" onclick="editProduct('${colId}', '${doc.id}')"><i class="fas fa-edit"></i> Edit</button>
                                <button class="admin-btn admin-btn-delete" onclick="deleteProduct('${colId}', '${doc.id}')"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `;
                    productsList.appendChild(card);
                });
            });
        });
    }

    addProductBtn.addEventListener('click', () => {
        prodForm.reset();
        document.getElementById('product-id').value = '';
        prodModal.classList.add('show');
    });

    prodClose.addEventListener('click', () => prodModal.classList.remove('show'));

    prodForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentCollectionId) return;

        const id = document.getElementById('product-id').value;
        const data = {
            name: document.getElementById('prod-name').value,
            price: document.getElementById('prod-price').value,
            description: document.getElementById('prod-desc').value,
            img: document.getElementById('prod-img').value,
            sizes: document.getElementById('prod-sizes').value,
            refcode: document.getElementById('prod-refcode').value,
            order: parseInt(document.getElementById('prod-order').value) || 0
        };

        const btn = prodForm.querySelector('button');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        if (id) {
            db.collection("collections").doc(currentCollectionId).collection("products").doc(id).set(data, { merge: true }).then(() => {
                prodModal.classList.remove('show');
            }).catch((err) => { console.error("Save error:", err); alert("Error saving: " + err.message); })
              .finally(() => { btn.textContent = 'Save Product'; btn.disabled = false; });
        } else {
            db.collection("collections").doc(currentCollectionId).collection("products").add(data).then(() => {
                prodModal.classList.remove('show');
            }).catch((err) => { console.error("Save error:", err); alert("Error saving: " + err.message); })
              .finally(() => { btn.textContent = 'Save Product'; btn.disabled = false; });
        }
    });

    window.editProduct = function(colId, prodId) {
        db.collection("collections").doc(colId).collection("products").doc(prodId).get().then((doc) => {
            if (doc.exists) {
                const data = extractData(doc.data());
                document.getElementById('product-id').value = doc.id;
                document.getElementById('prod-name').value = data.name;
                document.getElementById('prod-price').value = data.price;
                document.getElementById('prod-desc').value = data.desc;
                document.getElementById('prod-img').value = data.img;
                document.getElementById('prod-sizes').value = data.sizes;
                document.getElementById('prod-refcode').value = data.refcode;
                document.getElementById('prod-order').value = data.order;
                prodModal.classList.add('show');
            }
        });
    };

    window.deleteProduct = function(colId, prodId) {
        if (confirm("Are you sure you want to delete this product?")) {
            db.collection("collections").doc(colId).collection("products").doc(prodId).delete();
        }
    };


    // ─── ORDERS CRUD ────────────────────────────────────────

    const ordersList = document.getElementById('admin-orders-list');

    function loadOrders() {
        ordersList.innerHTML = '<tr><td colspan="7">Loading orders...</td></tr>';
        
        db.collection("orders").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
            ordersList.innerHTML = '';
            if (snapshot.empty) {
                ordersList.innerHTML = '<tr><td colspan="7">No orders or inquiries found.</td></tr>';
                return;
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : 'N/A';
                
                let detailsStr = '';
                if (data.type === 'Sample Request') {
                    detailsStr = `Collection: ${data.collection}<br>Tile: ${data.tile}<br>Qty: ${data.quantity}<br>Address: ${data.address}, ${data.city}`;
                } else if (data.type === 'General Inquiry') {
                    detailsStr = data.message ? (data.message.length > 50 ? data.message.substring(0, 50) + '...' : data.message) : '';
                }

                const status = data.status || 'new';
                const statusClass = `status-${status.toLowerCase()}`;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${date}</td>
                    <td><strong>${data.name || 'Unknown'}</strong></td>
                    <td>${data.email || 'N/A'}<br>${data.phone || ''}</td>
                    <td>${data.type || 'Inquiry'}</td>
                    <td style="font-size:0.85rem;">${detailsStr}</td>
                    <td><span class="status-badge ${statusClass}">${status.toUpperCase()}</span></td>
                    <td>
                        <select onchange="updateOrderStatus('${doc.id}', this.value)" style="padding: 5px; border-radius: 4px;">
                            <option value="new" ${status === 'new' ? 'selected' : ''}>New</option>
                            <option value="contacted" ${status === 'contacted' ? 'selected' : ''}>Contacted</option>
                            <option value="closed" ${status === 'closed' ? 'selected' : ''}>Closed</option>
                        </select>
                        <button class="admin-btn admin-btn-delete" style="display:inline-block; margin-left: 10px; width: auto;" onclick="deleteOrder('${doc.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                ordersList.appendChild(tr);
            });
        }, (error) => {
            ordersList.innerHTML = `<tr><td colspan="7" style="color:red;">Error loading orders: ${error.message}</td></tr>`;
        });
    }

    window.updateOrderStatus = function(orderId, newStatus) {
        db.collection("orders").doc(orderId).update({ status: newStatus }).then(() => {
            console.log("Order status updated");
        });
    };

    window.deleteOrder = function(orderId) {
        if (confirm("Are you sure you want to delete this order record?")) {
            db.collection("orders").doc(orderId).delete();
        }
    };

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === colModal) colModal.classList.remove('show');
        if (e.target === prodModal) prodModal.classList.remove('show');
    });

    Sortable.create(document.getElementById('admin-collections-list'), {
        animation: 150,
        swapThreshold: 0.65,
        ghostClass: 'dragging',
        onEnd: function (evt) {
            const batch = db.batch();
            const cards = evt.to.querySelectorAll('.admin-card');
            cards.forEach((card, index) => {
                const id = card.dataset.id;
                if (!id) return;
                batch.update(db.collection('collections').doc(id), { order: index });
            });
            batch.commit().then(() => console.log('Collections reordered')).catch(e => console.error(e));
        }
    });

    Sortable.create(document.getElementById('admin-products-list'), {
        animation: 150,
        swapThreshold: 0.65,
        ghostClass: 'dragging',
        onEnd: function (evt) {
            if (!currentCollectionId) return;
            const batch = db.batch();
            const cards = evt.to.querySelectorAll('.admin-card');
            cards.forEach((card, index) => {
                const id = card.dataset.id;
                if (!id) return;
                batch.update(db.collection('collections').doc(currentCollectionId).collection('products').doc(id), { order: index });
            });
            batch.commit().then(() => console.log('Products reordered')).catch(e => console.error(e));
        }
    });

});
    // --- DRAG AND DROP REORDERING --------------------------------
    window.setupDragAndDrop = function(containerId, onReorderCallback) {
        const container = document.getElementById(containerId);
        let draggedItem = null;

        container.addEventListener('dragstart', (e) => {
            if (!e.target.classList.contains('admin-card')) return;
            draggedItem = e.target;
            setTimeout(() => e.target.classList.add('dragging'), 0);
        });

        container.addEventListener('dragend', (e) => {
            if (!e.target.classList.contains('admin-card')) return;
            e.target.classList.remove('dragging');
            draggedItem = null;
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(container, e.clientY);
            if (afterElement == null) {
                container.appendChild(draggedItem);
            } else {
                container.insertBefore(draggedItem, afterElement);
            }
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            onReorderCallback(container);
        });
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.admin-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

