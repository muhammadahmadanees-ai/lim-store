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

    let allCollectionsList = [];

    function populateParentSelect(currentId, selectedParentId) {
        const parentSelect = document.getElementById('col-parent');
        if (!parentSelect) return;
        parentSelect.innerHTML = '<option value="">None (Root Category)</option>';
        
        allCollectionsList
            .filter(c => c.type === 'category' && c.id !== currentId)
            .forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                if (c.id === selectedParentId) {
                    opt.selected = true;
                }
                parentSelect.appendChild(opt);
            });
    }

    // Load Collections
    function loadCollections() {
        collectionsList.innerHTML = '<p>Loading collections...</p>';
        db.collection("collections").orderBy("order").onSnapshot((snapshot) => {
            allCollectionsList = [];
            snapshot.forEach((doc) => {
                const raw = doc.data();
                const fields = extractData(raw);
                allCollectionsList.push({
                    id: doc.id,
                    name: fields.name,
                    type: raw.type || 'collection',
                    parentId: raw.parentId || '',
                    order: fields.order
                });
            });

            collectionsList.innerHTML = '';
            if (snapshot.empty) {
                collectionsList.innerHTML = '<p>No collections found.</p>';
                const elTot = document.getElementById('dash-tot-collections');
                if (elTot) elTot.textContent = '0';
                return;
            }
            
            const elTot = document.getElementById('dash-tot-collections');
            if (elTot) elTot.textContent = allCollectionsList.length;
            countTotalProducts();

            snapshot.forEach((doc) => {
                const raw = doc.data();
                const data = extractData(raw);
                const type = raw.type || 'collection';
                const parentId = raw.parentId || '';
                const parentName = parentId ? (allCollectionsList.find(p => p.id === parentId)?.name || 'Unknown') : '';

                const parentBadge = parentId ? `<span style="background: #f3f4f6; color: #4b5563; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; display: inline-block;">Parent: ${parentName}</span>` : '';
                const typeBadge = `<span style="background: ${type === 'category' ? '#e0f2fe' : '#f0fdf4'}; color: ${type === 'category' ? '#0369a1' : '#15803d'}; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; font-weight: bold; display: inline-block;">${type}</span>`;

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
                        <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 8px;">
                            ${typeBadge}
                            ${parentBadge}
                        </div>
                        <p class="admin-card-desc">${data.desc}</p>
                        <p style="font-size: 0.8rem; color: #999;">Order: ${data.order}</p>
                        <div class="admin-actions">
                            ${type !== 'category' ? `<button class="admin-btn admin-btn-view" onclick="openProducts('${doc.id}', '${data.name.replace(/'/g, "\\'")}')">Products</button>` : ''}
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
                allCollectionsList = [];
                snapshot.forEach((doc) => {
                    const raw = doc.data();
                    const fields = extractData(raw);
                    allCollectionsList.push({
                        id: doc.id,
                        name: fields.name,
                        type: raw.type || 'collection',
                        parentId: raw.parentId || '',
                        order: fields.order
                    });
                });

                collectionsList.innerHTML = '';
                if (snapshot.empty) { 
                    collectionsList.innerHTML = '<p>No collections found.</p>'; 
                    const elTot = document.getElementById('dash-tot-collections');
                    if (elTot) elTot.textContent = '0';
                    return; 
                }
                
                const elTot = document.getElementById('dash-tot-collections');
                if (elTot) elTot.textContent = allCollectionsList.length;
                countTotalProducts();

                const docs = [];
                snapshot.forEach(doc => docs.push(doc));
                docs.sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
                docs.forEach((doc) => {
                    const raw = doc.data();
                    const data = extractData(raw);
                    const type = raw.type || 'collection';
                    const parentId = raw.parentId || '';
                    const parentName = parentId ? (allCollectionsList.find(p => p.id === parentId)?.name || 'Unknown') : '';

                    const parentBadge = parentId ? `<span style="background: #f3f4f6; color: #4b5563; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; display: inline-block;">Parent: ${parentName}</span>` : '';
                    const typeBadge = `<span style="background: ${type === 'category' ? '#e0f2fe' : '#f0fdf4'}; color: ${type === 'category' ? '#0369a1' : '#15803d'}; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; font-weight: bold; display: inline-block;">${type}</span>`;

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
                            <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 8px;">
                                ${typeBadge}
                                ${parentBadge}
                            </div>
                            <p class="admin-card-desc">${data.desc}</p>
                            <p style="font-size: 0.8rem; color: #999;">Order: ${data.order}</p>
                            <div class="admin-actions">
                                ${type !== 'category' ? `<button class="admin-btn admin-btn-view" onclick="openProducts('${doc.id}', '${data.name.replace(/'/g, "\\'")}')">Products</button>` : ''}
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
        populateParentSelect('', '');
        document.getElementById('col-type').value = 'collection';
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
            order: parseInt(document.getElementById('col-order').value) || 0,
            parentId: document.getElementById('col-parent').value || '',
            type: document.getElementById('col-type').value || 'collection'
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
                const raw = doc.data();
                const data = extractData(raw);
                const parentId = raw.parentId || '';
                const type = raw.type || 'collection';

                document.getElementById('collection-id').value = doc.id;
                document.getElementById('col-name').value = data.name;
                document.getElementById('col-desc').value = data.desc;
                document.getElementById('col-img').value = data.img;
                document.getElementById('col-order').value = data.order;
                
                document.getElementById('col-type').value = type;
                populateParentSelect(doc.id, parentId);

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
    let allOrdersList = [];

    function loadOrders() {
        ordersList.innerHTML = '<tr><td colspan="7">Loading orders...</td></tr>';
        
        db.collection("orders").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
            ordersList.innerHTML = '';
            allOrdersList = [];
            if (snapshot.empty) {
                ordersList.innerHTML = '<tr><td colspan="7">No orders or inquiries found.</td></tr>';
                return;
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                allOrdersList.push({ id: doc.id, ...data });
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
                        <select onchange="updateOrderStatus('${doc.id}', this.value)" style="padding: 5px; border-radius: 4px; margin-bottom: 5px; display: block; width: 100%;">
                            <option value="new" ${status === 'new' ? 'selected' : ''}>New</option>
                            <option value="contacted" ${status === 'contacted' ? 'selected' : ''}>Contacted</option>
                            <option value="closed" ${status === 'closed' ? 'selected' : ''}>Closed</option>
                        </select>
                        <button class="admin-btn admin-btn-view" style="width: auto; padding: 5px 10px; font-size: 0.8rem;" onclick="openReplyModal('${doc.id}', '${(data.name || '').replace(/'/g, "\\'")}', '${(data.email || '').replace(/'/g, "\\'")}', '${(data.phone || '').replace(/'/g, "\\'")}', '${detailsStr.replace(/'/g, "\\'").replace(/\n/g, "<br>")}')"><i class="fas fa-reply"></i> Reply</button>
                        <button class="admin-btn admin-btn-delete" style="width: auto; padding: 5px 10px; font-size: 0.8rem;" onclick="deleteOrder('${doc.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                ordersList.appendChild(tr);
            });
            updateDashboardStats();
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

    // --- EXPORT ORDERS ---
    const exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            if (allOrdersList.length === 0) return alert("No orders to export.");
            
            let csvContent = "Date,Name,Email,Phone,Type,Details,Status\n";
            allOrdersList.forEach(data => {
                const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : 'N/A';
                const name = `"${(data.name || '').replace(/"/g, '""')}"`;
                const email = `"${(data.email || '').replace(/"/g, '""')}"`;
                const phone = `"${(data.phone || '').replace(/"/g, '""')}"`;
                const type = `"${(data.type || '').replace(/"/g, '""')}"`;
                
                let detailsStr = '';
                if (data.type === 'Sample Request') {
                    detailsStr = `Collection: ${data.collection || ''} | Tile: ${data.tile || ''} | Qty: ${data.quantity || ''} | Address: ${data.address || ''}, ${data.city || ''}`;
                } else if (data.type === 'General Inquiry') {
                    detailsStr = data.message || '';
                }
                const details = `"${detailsStr.replace(/"/g, '""')}"`;
                const status = `"${(data.status || 'new').toUpperCase()}"`;

                csvContent += `${date},${name},${email},${phone},${type},${details},${status}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "lim_factory_orders.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    const exportPdfBtn = document.getElementById('export-pdf-btn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            if (allOrdersList.length === 0) return alert("No orders to export.");
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape');
            
            // Add Branding
            doc.setFontSize(22);
            doc.text("LIM Factory", 14, 20);
            doc.setFontSize(12);
            doc.text("Orders & Inquiries Report", 14, 30);
            doc.setFontSize(10);
            doc.text("Generated on: " + new Date().toLocaleString(), 14, 38);

            const tableColumn = ["Date", "Name", "Email", "Phone", "Type", "Details", "Status"];
            const tableRows = [];

            allOrdersList.forEach(data => {
                const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : 'N/A';
                const name = data.name || '';
                const email = data.email || '';
                const phone = data.phone || '';
                const type = data.type || '';
                
                let detailsStr = '';
                if (data.type === 'Sample Request') {
                    detailsStr = `Col: ${data.collection || ''}\nTile: ${data.tile || ''}\nQty: ${data.quantity || ''}\nAddr: ${data.address || ''}, ${data.city || ''}`;
                } else if (data.type === 'General Inquiry') {
                    detailsStr = data.message ? (data.message.length > 100 ? data.message.substring(0, 100) + '...' : data.message) : '';
                }
                const status = (data.status || 'new').toUpperCase();

                tableRows.push([date, name, email, phone, type, detailsStr, status]);
            });

            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 45,
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [163, 26, 30] }, // LIM Red
                columnStyles: {
                    5: { cellWidth: 80 } // Give more width to details
                }
            });

            doc.save("lim_factory_orders.pdf");
        });
    }

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === colModal) colModal.classList.remove('show');
        if (e.target === prodModal) prodModal.classList.remove('show');
        if (typeof replyModal !== 'undefined' && e.target === replyModal) replyModal.classList.remove('show');
    });

    // --- REPLY MODAL LOGIC ---
    const replyModal = document.getElementById('reply-modal');
    const closeReplyModal = document.getElementById('close-reply-modal');
    const btnSendEmail = document.getElementById('btn-send-email');
    const btnSendWhatsapp = document.getElementById('btn-send-whatsapp');
    const replyStatusMsg = document.getElementById('reply-status-msg');

    if (replyModal) {
        window.openReplyModal = function(orderId, name, email, phone, message) {
            document.getElementById('reply-order-id').value = orderId;
            document.getElementById('reply-customer-name').textContent = name || 'Unknown';
            document.getElementById('reply-customer-email').textContent = email || 'N/A';
            document.getElementById('reply-email-address').value = email || '';
            document.getElementById('reply-customer-phone').textContent = phone || 'N/A';
            document.getElementById('reply-phone-number').value = phone || '';
            document.getElementById('reply-customer-message').innerHTML = message || 'No details provided.';
            
            document.getElementById('reply-message').value = '';
            replyStatusMsg.textContent = '';
            
            replyModal.classList.add('show');
        };

        closeReplyModal.addEventListener('click', () => {
            replyModal.classList.remove('show');
        });

        btnSendWhatsapp.addEventListener('click', () => {
            const phone = document.getElementById('reply-phone-number').value.replace(/[^0-9+]/g, '');
            const message = document.getElementById('reply-message').value;
            if (!phone) {
                alert("No phone number available for this customer.");
                return;
            }
            if (!message) {
                alert("Please type a message first.");
                return;
            }
            
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
            
            const orderId = document.getElementById('reply-order-id').value;
            if (orderId) updateOrderStatus(orderId, 'contacted');
        });

        btnSendEmail.addEventListener('click', () => {
            const email = document.getElementById('reply-email-address').value;
            const message = document.getElementById('reply-message').value;
            const name = document.getElementById('reply-customer-name').textContent;
            
            if (!email || email === 'N/A') {
                alert("No email address available for this customer.");
                return;
            }
            if (!message) {
                alert("Please type a message first.");
                return;
            }

            btnSendEmail.disabled = true;
            btnSendEmail.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            replyStatusMsg.textContent = 'Sending email...';
            replyStatusMsg.style.color = '#555';

            const templateParams = {
                to_name: name,
                to_email: email,
                reply_message: message
            };

            // Using actual credentials provided by the user
            emailjs.send('service_bwb75tb', 'template_046burx', templateParams)
                .then(function(response) {
                    console.log('SUCCESS!', response.status, response.text);
                    replyStatusMsg.textContent = 'Email sent successfully!';
                    replyStatusMsg.style.color = 'green';
                    
                    const orderId = document.getElementById('reply-order-id').value;
                    if (orderId) updateOrderStatus(orderId, 'contacted');
                    
                    setTimeout(() => {
                        replyModal.classList.remove('show');
                        btnSendEmail.disabled = false;
                        btnSendEmail.innerHTML = '<i class="fas fa-envelope"></i> Send Email';
                    }, 2000);
                }, function(error) {
                    console.log('FAILED...', error);
                    replyStatusMsg.textContent = 'Failed to send email. Check your EmailJS setup.';
                    replyStatusMsg.style.color = 'red';
                    btnSendEmail.disabled = false;
                    btnSendEmail.innerHTML = '<i class="fas fa-envelope"></i> Send Email';
                });
        });
    }

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

    // --- DASHBOARD LOGIC ---
    function countTotalProducts() {
        if (!allCollectionsList || allCollectionsList.length === 0) {
            const el = document.getElementById('dash-tot-products');
            if (el) el.textContent = '0';
            return;
        }
        
        let total = 0;
        let processed = 0;
        
        allCollectionsList.forEach(col => {
            if (col.type === 'category') {
                processed++;
                if (processed === allCollectionsList.length) {
                    const el = document.getElementById('dash-tot-products');
                    if (el) el.textContent = total;
                }
                return;
            }

            db.collection("collections").doc(col.id).collection("products").get()
                .then(snap => {
                    total += snap.size;
                })
                .catch(err => console.warn(err))
                .finally(() => {
                    processed++;
                    if (processed === allCollectionsList.length) {
                        const el = document.getElementById('dash-tot-products');
                        if (el) el.textContent = total;
                    }
                });
        });
    }

    let dashboardChart = null;

    function updateDashboardStats() {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        let weekCount = 0;
        let statusCounts = { new: 0, contacted: 0, closed: 0 };
        let mostRecentStr = "None yet.";

        if (allOrdersList.length > 0) {
            const recent = allOrdersList[0];
            const typeStr = recent.type || 'Inquiry';
            const nameStr = recent.name || 'Unknown';
            const dateStr = recent.createdAt ? new Date(recent.createdAt.seconds * 1000).toLocaleDateString() : '';
            mostRecentStr = `${nameStr} - ${typeStr} <span style="color:#888;font-size:0.9rem">(${dateStr})</span>`;
        }

        allOrdersList.forEach(order => {
            if (order.createdAt) {
                const d = new Date(order.createdAt.seconds * 1000);
                if (d > oneWeekAgo) weekCount++;
            }
            const s = (order.status || 'new').toLowerCase();
            if (statusCounts[s] !== undefined) statusCounts[s]++;
        });

        const elWeek = document.getElementById('dash-orders-week');
        if(elWeek) elWeek.textContent = weekCount;
        
        const elStatus = document.getElementById('dash-orders-status');
        if(elStatus) elStatus.innerHTML = `New: ${statusCounts.new}<br>Contacted: ${statusCounts.contacted}<br>Closed: ${statusCounts.closed}`;
        
        const elRecent = document.getElementById('dash-recent-order');
        if(elRecent) elRecent.innerHTML = mostRecentStr;

        renderChart();
    }

    function renderChart() {
        const ctx = document.getElementById('ordersChart');
        if (!ctx) return;
        
        const now = new Date();
        const weeks = [0, 0, 0, 0];
        const labels = [];
        
        for (let i = 3; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            labels.push(d.toLocaleDateString(undefined, {month:'short', day:'numeric'}));
        }

        allOrdersList.forEach(order => {
            if (order.createdAt) {
                const d = new Date(order.createdAt.seconds * 1000);
                const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
                if (diffDays >= 0 && diffDays < 7) weeks[3]++;
                else if (diffDays >= 7 && diffDays < 14) weeks[2]++;
                else if (diffDays >= 14 && diffDays < 21) weeks[1]++;
                else if (diffDays >= 21 && diffDays < 28) weeks[0]++;
            }
        });

        if (dashboardChart) {
            dashboardChart.data.datasets[0].data = weeks;
            dashboardChart.data.labels = labels;
            dashboardChart.update();
        } else {
            if (typeof Chart !== 'undefined') {
                dashboardChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Inquiries (Last 4 Weeks)',
                            data: weeks,
                            backgroundColor: 'rgba(163, 26, 30, 0.7)',
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                    }
                });
            }
        }
    }

});
