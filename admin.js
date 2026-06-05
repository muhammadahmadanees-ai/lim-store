document.addEventListener('DOMContentLoaded', () => {

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

    window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
        let user = session?.user;
        if (user) {
            loginContainer.style.display = 'none';
            adminDashboard.style.display = 'block';
            loadCollections();
            loadOrders();
        } else {
            loginContainer.style.display = 'flex';
            adminDashboard.style.display = 'none';
        }
    });

    window.supabaseClient.auth.onAuthStateChange((_event, session) => {
        let user = session?.user;
        if (user) {
            loginContainer.style.display = 'none';
            adminDashboard.style.display = 'block';
            loadCollections();
            loadOrders();
        } else {
            loginContainer.style.display = 'flex';
            adminDashboard.style.display = 'none';
        }
    });


    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginEmail.value;
        const pass = loginPassword.value;
        
        const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password: pass });
        if (error) {
            loginError.textContent = error.message;
            loginError.style.display = 'block';
        } else {
            loginError.style.display = 'none';
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await window.supabaseClient.auth.signOut();
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
    async function loadCollections() {
        collectionsList.innerHTML = '<p>Loading collections...</p>';
        const { data, error } = await window.supabaseClient.from("collections").select('*').order('order');
        if (error) {
            console.error("Error loading collections:", error);
            collectionsList.innerHTML = '<p>Error loading collections.</p>';
            return;
        }
        
        allCollectionsList = [];
        
        data.forEach(raw => {
            const rowData = {};
            for (let k in raw) {
                rowData[k.toLowerCase().replace(/[\s_]+/g, '')] = raw[k];
            }
            allCollectionsList.push({
                id: raw.id,
                name: rowData.name || rowData.title || '',
                desc: rowData.description || rowData.desc || '',
                img: rowData.img || rowData.imageurl || '',
                order: raw.order || 0,
                type: rowData.type || 'collection',
                parentId: raw.parent_id || rowData.parentid || ''
            });
        });

        collectionsList.innerHTML = '';
        if (allCollectionsList.length === 0) {
            collectionsList.innerHTML = '<p>No collections found.</p>';
            const elTot = document.getElementById('dash-tot-collections');
            if (elTot) elTot.textContent = '0';
            return;
        }
        
        const elTot = document.getElementById('dash-tot-collections');
        if (elTot) elTot.textContent = allCollectionsList.length;
        countTotalProducts();

        allCollectionsList.forEach(data => {
            const parentName = data.parentId ? (allCollectionsList.find(p => p.id === data.parentId)?.name || 'Unknown') : '';
            const parentBadge = data.parentId ? `<span style="background: #f3f4f6; color: #4b5563; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; display: inline-block;">Parent: ${parentName}</span>` : '';
            const typeBadge = `<span style="background: ${data.type === 'category' ? '#e0f2fe' : '#f0fdf4'}; color: ${data.type === 'category' ? '#0369a1' : '#15803d'}; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; font-weight: bold; display: inline-block;">${data.type}</span>`;

            const card = document.createElement('div');
            card.className = 'admin-card';
            card.draggable = true;
            card.dataset.id = data.id;
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
                        ${data.type !== 'category' ? `<button class="admin-btn admin-btn-view" onclick="openProducts('${data.id}', '${data.name.replace(/'/g, "\\'")}')">Products</button>` : ''}
                        <button class="admin-btn admin-btn-edit" onclick="editCollection('${data.id}')"><i class="fas fa-edit"></i> Edit</button>
                        <button class="admin-btn admin-btn-delete" onclick="deleteCollection('${data.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
            collectionsList.appendChild(card);
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

    colForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('collection-id').value;
        const data = {
            name: document.getElementById('col-name').value,
            description: document.getElementById('col-desc').value,
            img: document.getElementById('col-img').value,
            order: parseInt(document.getElementById('col-order').value) || 0,
            parent_id: document.getElementById('col-parent').value || null,
            type: document.getElementById('col-type').value || 'collection'
        };

        const btn = colForm.querySelector('button');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
            if (id) {
                // Update
                const { error } = await window.supabaseClient.from("collections").update(data).eq('id', id);
                if (error) throw error;
            } else {
                // Add
                const { error } = await window.supabaseClient.from("collections").insert([data]);
                if (error) throw error;
            }
            colModal.classList.remove('show');
            loadCollections();
        } catch (err) {
            console.error("Save error:", err);
            alert("Error saving: " + err.message);
        } finally {
            btn.textContent = 'Save Collection';
            btn.disabled = false;
        }
    });

    window.editCollection = async function(id) {
        const { data, error } = await window.supabaseClient.from("collections").select('*').eq('id', id).single();
        if (data) {
            const raw = data;
            const extracted = extractData(raw);
            const parentId = raw.parent_id || '';
            const type = raw.type || 'collection';

            document.getElementById('collection-id').value = raw.id;
            document.getElementById('col-name').value = extracted.name;
            document.getElementById('col-desc').value = extracted.desc;
            document.getElementById('col-img').value = extracted.img;
            document.getElementById('col-order').value = extracted.order;
            
            document.getElementById('col-type').value = type;
            populateParentSelect(raw.id, parentId);

            colModal.classList.add('show');
        }
    };

    window.deleteCollection = async function(id) {
        if (confirm("Are you sure you want to delete this collection? All products inside must be deleted manually first if you want to keep Firebase clean.")) {
            await window.supabaseClient.from("collections").delete().eq('id', id);
            loadCollections();
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

    async function loadProducts(colId) {
        productsList.innerHTML = '<p>Loading products...</p>';
        const { data, error } = await window.supabaseClient.from("products").select('*').eq('collection_id', colId).order('order');
        if (error) {
            console.error("Error loading products:", error);
            productsList.innerHTML = '<p>Error loading products.</p>';
            return;
        }

        productsList.innerHTML = '';
        if (data.length === 0) {
            productsList.innerHTML = '<p>No products found in this collection.</p>';
            return;
        }

        data.forEach(raw => {
            const rowData = {};
            for (let k in raw) {
                rowData[k.toLowerCase().replace(/[\s_]+/g, '')] = raw[k];
            }
            const prodData = {
                id: raw.id,
                name: rowData.name || rowData.title || '',
                price: rowData.price || '',
                desc: rowData.description || rowData.desc || '',
                img: rowData.img || rowData.imageurl || '',
                sizes: rowData.sizes || '',
                refcode: rowData.refcode || '',
                order: raw.order || 0
            };
            
            const card = document.createElement('div');
            card.className = 'admin-card';
            card.draggable = true;
            card.dataset.id = prodData.id;
            card.innerHTML = `
                <div class="admin-card-img" style="background-image: url('${prodData.img}')">
                    ${(!prodData.img) ? 'No Image' : ''}
                </div>
                <div class="admin-card-content">
                    <h4>${prodData.name}</h4>
                    ${prodData.price ? `<p style="color:var(--primary-color); font-weight:bold; margin-bottom: 5px;">${prodData.price}</p>` : ''}
                    <p class="admin-card-desc">${prodData.desc}</p>
                    <p style="font-size: 0.8rem; color: #999;">Order: ${prodData.order}</p>
                    <div class="admin-actions">
                        <button class="admin-btn admin-btn-edit" onclick="editProduct('${colId}', '${prodData.id}')"><i class="fas fa-edit"></i> Edit</button>
                        <button class="admin-btn admin-btn-delete" onclick="deleteProduct('${colId}', '${prodData.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
            productsList.appendChild(card);
        });
    }

    addProductBtn.addEventListener('click', () => {
        prodForm.reset();
        document.getElementById('product-id').value = '';
        prodModal.classList.add('show');
    });

    prodClose.addEventListener('click', () => prodModal.classList.remove('show'));

    prodForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentCollectionId) return;

        const id = document.getElementById('product-id').value;
        const data = {
            collection_id: currentCollectionId,
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

        try {
            if (id) {
                const { error } = await window.supabaseClient.from("products").update(data).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await window.supabaseClient.from("products").insert([data]);
                if (error) throw error;
            }
            prodModal.classList.remove('show');
            loadProducts(currentCollectionId);
        } catch (err) {
            console.error("Save error:", err);
            alert("Error saving: " + err.message);
        } finally {
            btn.textContent = 'Save Product';
            btn.disabled = false;
        }
    });

    window.editProduct = async function(colId, prodId) {
        const { data, error } = await window.supabaseClient.from("products").select('*').eq('id', prodId).single();
        if (data) {
            const raw = data;
            const extracted = extractData(raw);
            document.getElementById('product-id').value = raw.id;
            document.getElementById('prod-name').value = extracted.name;
            document.getElementById('prod-price').value = extracted.price;
            document.getElementById('prod-desc').value = extracted.desc;
            document.getElementById('prod-img').value = extracted.img;
            document.getElementById('prod-sizes').value = extracted.sizes;
            document.getElementById('prod-refcode').value = extracted.refcode;
            document.getElementById('prod-order').value = extracted.order;
            prodModal.classList.add('show');
        }
    };

    window.deleteProduct = async function(colId, prodId) {
        if (confirm("Are you sure you want to delete this product?")) {
            await window.supabaseClient.from("products").delete().eq('id', prodId);
            loadProducts(currentCollectionId);
        }
    };


    // ─── ORDERS CRUD ────────────────────────────────────────

    const ordersList = document.getElementById('admin-orders-list');
    let allOrdersList = [];
    let filteredOrdersList = [];

    function renderOrders(ordersToRender) {
        ordersList.innerHTML = '';
        if (ordersToRender.length === 0) {
            ordersList.innerHTML = '<tr><td colspan="7">No orders or inquiries found.</td></tr>';
            return;
        }

        ordersToRender.forEach((data) => {
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
                    <select onchange="updateOrderStatus('${data.id}', this.value)" style="padding: 5px; border-radius: 4px; margin-bottom: 5px; display: block; width: 100%;">
                        <option value="new" ${status === 'new' ? 'selected' : ''}>New</option>
                        <option value="contacted" ${status === 'contacted' ? 'selected' : ''}>Contacted</option>
                        <option value="closed" ${status === 'closed' ? 'selected' : ''}>Closed</option>
                    </select>
                    <button class="admin-btn admin-btn-view" style="width: auto; padding: 5px 10px; font-size: 0.8rem;" onclick="openReplyModal('${data.id}', '${(data.name || '').replace(/'/g, "\\'")}', '${(data.email || '').replace(/'/g, "\\'")}', '${(data.phone || '').replace(/'/g, "\\'")}', '${detailsStr.replace(/'/g, "\\'").replace(/\n/g, "<br>")}')"><i class="fas fa-reply"></i> Reply</button>
                    <button class="admin-btn admin-btn-delete" style="width: auto; padding: 5px 10px; font-size: 0.8rem;" onclick="deleteOrder('${data.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            ordersList.appendChild(tr);
        });
    }

    function applyOrderFilters() {
        const searchInput = document.getElementById('order-search-input');
        const statusFilter = document.getElementById('order-status-filter');
        const dateFromInput = document.getElementById('order-date-from');
        const dateToInput = document.getElementById('order-date-to');
        
        let searchTerm = '';
        let statusVal = 'All';
        let dateFrom = null;
        let dateTo = null;
        
        if (searchInput) searchTerm = searchInput.value.toLowerCase();
        if (statusFilter) statusVal = statusFilter.value;
        if (dateFromInput && dateFromInput.value) dateFrom = new Date(dateFromInput.value + 'T00:00:00');
        if (dateToInput && dateToInput.value) dateTo = new Date(dateToInput.value + 'T23:59:59');
        
        filteredOrdersList = allOrdersList.filter(order => {
            const nameMatch = (order.name || '').toLowerCase().includes(searchTerm);
            const emailMatch = (order.email || '').toLowerCase().includes(searchTerm);
            const typeMatch = (order.type || '').toLowerCase().includes(searchTerm);
            const matchesSearch = nameMatch || emailMatch || typeMatch;
            
            const matchesStatus = (statusVal === 'All') || ((order.status || 'new').toLowerCase() === statusVal.toLowerCase());
            
            let matchesDate = true;
            if (dateFrom || dateTo) {
                if (!order.createdAt) matchesDate = false;
                else {
                    const orderDate = new Date(order.createdAt.seconds * 1000);
                    if (dateFrom && orderDate < dateFrom) matchesDate = false;
                    if (dateTo && orderDate > dateTo) matchesDate = false;
                }
            }
            
            return matchesSearch && matchesStatus && matchesDate;
        });
        
        renderOrders(filteredOrdersList);
    }

    async function loadOrders() {
        ordersList.innerHTML = '<tr><td colspan="7">Loading orders...</td></tr>';
        
        try {
            const { data, error } = await window.supabaseClient.from("orders").select('*').order('created_at', { ascending: false });
            if (error) throw error;
            
            allOrdersList = [];
            if (!data || data.length === 0) {
                renderOrders([]);
                if (typeof updateDashboardStats === 'function') updateDashboardStats();
                return;
            }

            data.forEach((row) => {
                allOrdersList.push({
                    id: row.id,
                    createdAt: { seconds: new Date(row.created_at).getTime() / 1000 },
                    name: row.name,
                    email: row.email,
                    phone: row.phone,
                    type: row.type,
                    collection: row.collection,
                    tile: row.tile,
                    quantity: row.quantity,
                    address: row.address,
                    city: row.city,
                    message: row.message,
                    status: row.status
                });
            });
            
            applyOrderFilters();
            if (typeof updateDashboardStats === 'function') updateDashboardStats();
        } catch (error) {
            ordersList.innerHTML = `<tr><td colspan="7" style="color:red;">Error loading orders: ${error.message}</td></tr>`;
        }
    }

    const orderSearchInput = document.getElementById('order-search-input');
    const orderStatusFilter = document.getElementById('order-status-filter');
    const orderDateFrom = document.getElementById('order-date-from');
    const orderDateTo = document.getElementById('order-date-to');
    const presetToday = document.getElementById('preset-today');
    const presetWeek = document.getElementById('preset-week');
    const presetMonth = document.getElementById('preset-month');
    const presetAll = document.getElementById('preset-all');

    if (orderSearchInput) orderSearchInput.addEventListener('input', applyOrderFilters);
    if (orderStatusFilter) orderStatusFilter.addEventListener('change', applyOrderFilters);
    if (orderDateFrom) orderDateFrom.addEventListener('change', applyOrderFilters);
    if (orderDateTo) orderDateTo.addEventListener('change', applyOrderFilters);

    function setDateFilter(daysAgoStart, daysAgoEnd) {
        if (!orderDateFrom || !orderDateTo) return;
        const now = new Date();
        
        if (daysAgoStart === null && daysAgoEnd === null) {
            orderDateFrom.value = '';
            orderDateTo.value = '';
        } else {
            const start = new Date(now.getTime() - (daysAgoStart * 24 * 60 * 60 * 1000));
            const end = new Date(now.getTime() - (daysAgoEnd * 24 * 60 * 60 * 1000));
            orderDateFrom.value = start.toISOString().split('T')[0];
            orderDateTo.value = end.toISOString().split('T')[0];
        }
        applyOrderFilters();
    }

    if (presetToday) presetToday.addEventListener('click', () => setDateFilter(0, 0));
    if (presetWeek) presetWeek.addEventListener('click', () => setDateFilter(7, 0));
    if (presetMonth) presetMonth.addEventListener('click', () => setDateFilter(30, 0));
    if (presetAll) presetAll.addEventListener('click', () => setDateFilter(null, null));

    window.updateOrderStatus = async function(orderId, newStatus) {
        await window.supabaseClient.from("orders").update({ status: newStatus }).eq('id', orderId);
        console.log("Order status updated");
    };

    window.deleteOrder = function(orderId) {
        if(confirm("Are you sure you want to delete this order?")) {
            window.supabaseClient.from("orders").delete().eq('id', orderId).then(() => loadOrders());
        }
    };

    // --- EXPORT ORDERS ---
    const exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            if (filteredOrdersList.length === 0) return alert("No orders to export matching the current filters.");
            
            let csvContent = "Date,Name,Email,Phone,Type,Details,Status\n";
            filteredOrdersList.forEach(data => {
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
            if (filteredOrdersList.length === 0) return alert("No orders to export matching the current filters.");
            
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

            filteredOrdersList.forEach(data => {
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
            const promises = [];
            const cards = evt.to.querySelectorAll('.admin-card');
            cards.forEach((card, index) => {
                const id = card.dataset.id;
                if (!id) return;
                promises.push(window.supabaseClient.from('collections').update({order: index}).eq('id', id));
            });
            Promise.all(promises).then(() => console.log('Collections reordered')).catch(e => console.error(e));
        }
    });

    Sortable.create(document.getElementById('admin-products-list'), {
        animation: 150,
        swapThreshold: 0.65,
        ghostClass: 'dragging',
        onEnd: function (evt) {
            if (!currentCollectionId) return;
            const promises = [];
            const cards = evt.to.querySelectorAll('.admin-card');
            cards.forEach((card, index) => {
                const id = card.dataset.id;
                if (!id) return;
                promises.push(window.supabaseClient.from('products').update({order: index}).eq('id', id));
            });
            Promise.all(promises).then(() => console.log('Products reordered')).catch(e => console.error(e));
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
    async function countTotalProducts() {
        if (!allCollectionsList || allCollectionsList.length === 0) {
            const el = document.getElementById('dash-tot-products');
            if (el) el.textContent = '0';
            return;
        }
        
        let total = 0;
        let processed = 0;
        
        for (const col of allCollectionsList) {
            if (col.type === 'category') {
                processed++;
                continue;
            }
            const { count } = await window.supabaseClient.from("products").select('id', {count: 'exact', head: true}).eq('collection_id', col.id);
            total += count || 0;
            processed++;
        }
        
        if (processed === allCollectionsList.length) {
            const el = document.getElementById('dash-tot-products');
            if (el) el.textContent = total;
        }
    }

    let dashboardChart = null;

    function updateDashboardStats() {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        let weekCount = 0;
        let lastWeekCount = 0;
        let monthCount = 0;
        let lastMonthCount = 0;
        let statusCounts = { new: 0, contacted: 0, closed: 0 };
        let mostRecentStr = "None yet.";
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

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
                else if (d > twoWeeksAgo) lastWeekCount++;
                
                if (d > oneMonthAgo) monthCount++;
                else if (d > twoMonthsAgo) lastMonthCount++;
            }
            const s = (order.status || 'new').toLowerCase();
            if (statusCounts[s] !== undefined) statusCounts[s]++;
        });

        const elWeek = document.getElementById('dash-orders-week');
        if(elWeek) elWeek.textContent = weekCount;
        
        const badgeWeek = document.getElementById('badge-orders-week');
        if(badgeWeek) {
            if (lastWeekCount === 0) {
                badgeWeek.textContent = '+100% vs last week';
                badgeWeek.style.color = 'green';
                badgeWeek.style.background = '#e6f4ea';
            } else {
                const delta = Math.round(((weekCount - lastWeekCount) / lastWeekCount) * 100);
                badgeWeek.textContent = `${delta > 0 ? '+' : ''}${delta}% vs last week`;
                badgeWeek.style.color = delta >= 0 ? 'green' : 'red';
                badgeWeek.style.background = delta >= 0 ? '#e6f4ea' : '#fce8e6';
            }
        }
        
        const badgeStatus = document.getElementById('badge-orders-status');
        if(badgeStatus) {
            if (lastMonthCount === 0) {
                badgeStatus.textContent = '+100% vs last month';
                badgeStatus.style.color = 'green';
                badgeStatus.style.background = '#e6f4ea';
            } else {
                const delta = Math.round(((monthCount - lastMonthCount) / lastMonthCount) * 100);
                badgeStatus.textContent = `${delta > 0 ? '+' : ''}${delta}% vs last month`;
                badgeStatus.style.color = delta >= 0 ? 'green' : 'red';
                badgeStatus.style.background = delta >= 0 ? '#e6f4ea' : '#fce8e6';
            }
        }
        
        const elStatus = document.getElementById('dash-orders-status');
        if(elStatus) elStatus.innerHTML = `New: ${statusCounts.new}<br>Contacted: ${statusCounts.contacted}<br>Closed: ${statusCounts.closed}`;
        
        const elRecent = document.getElementById('dash-recent-order');
        if(elRecent) elRecent.innerHTML = mostRecentStr;

        renderChart();
    }

    let splitChart = null;
    let funnelChart = null;

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

        let sampleRequests = 0;
        let generalInquiries = 0;
        let statusCounts = { new: 0, contacted: 0, closed: 0 };

        allOrdersList.forEach(order => {
            if (order.createdAt) {
                const d = new Date(order.createdAt.seconds * 1000);
                const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
                if (diffDays >= 0 && diffDays < 7) weeks[3]++;
                else if (diffDays >= 7 && diffDays < 14) weeks[2]++;
                else if (diffDays >= 14 && diffDays < 21) weeks[1]++;
                else if (diffDays >= 21 && diffDays < 28) weeks[0]++;
            }

            if (order.type === 'Sample Request') sampleRequests++;
            else generalInquiries++;

            const s = (order.status || 'new').toLowerCase();
            if (statusCounts[s] !== undefined) statusCounts[s]++;
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

        const ctxSplit = document.getElementById('splitChart');
        if (ctxSplit) {
            if (splitChart) {
                splitChart.data.datasets[0].data = [sampleRequests, generalInquiries];
                splitChart.update();
            } else if (typeof Chart !== 'undefined') {
                splitChart = new Chart(ctxSplit, {
                    type: 'doughnut',
                    data: {
                        labels: ['Sample Requests', 'General Inquiries'],
                        datasets: [{
                            data: [sampleRequests, generalInquiries],
                            backgroundColor: ['rgba(163, 26, 30, 0.8)', 'rgba(60, 60, 60, 0.8)'],
                            borderWidth: 0
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, cutout: '65%' }
                });
            }
        }

        const ctxFunnel = document.getElementById('funnelChart');
        if (ctxFunnel) {
            if (funnelChart) {
                funnelChart.data.datasets[0].data = [statusCounts.new, statusCounts.contacted, statusCounts.closed];
                funnelChart.update();
            } else if (typeof Chart !== 'undefined') {
                funnelChart = new Chart(ctxFunnel, {
                    type: 'bar',
                    data: {
                        labels: ['New', 'Contacted', 'Closed'],
                        datasets: [{
                            label: 'Status Funnel',
                            data: [statusCounts.new, statusCounts.contacted, statusCounts.closed],
                            backgroundColor: ['#f39c12', '#3498db', '#2ecc71'],
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: { legend: { display: false } },
                        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
                    }
                });
            }
        }
    }

});
