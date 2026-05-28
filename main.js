document.addEventListener('DOMContentLoaded', () => {

    // 1. Sticky Navigation Effect
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. Smooth Scrolling for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const navHeight = navbar.offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 3. Form Submission to Firebase
    const form = document.getElementById('inquiry-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const name    = document.getElementById('name').value;
            const email   = document.getElementById('email').value;
            const message = document.getElementById('message').value;

            btn.textContent  = 'Sending...';
            btn.style.opacity = '0.8';

            const db = firebase.firestore();
            db.collection("orders").add({
                type: 'General Inquiry',
                name: name,
                email: email,
                message: message,
                status: 'new',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                btn.textContent = '\u2705 Inquiry Sent!';
                btn.style.backgroundColor = '#4caf50';
                form.reset();
                setTimeout(() => {
                    btn.textContent = 'Send Inquiry';
                    btn.style.backgroundColor = '';
                    btn.style.opacity = '1';
                }, 3000);
            }).catch((error) => {
                console.error("Error writing document: ", error);
                btn.textContent = 'Error! Try again.';
                btn.style.backgroundColor = 'red';
                setTimeout(() => {
                    btn.textContent = 'Send Inquiry';
                    btn.style.backgroundColor = '';
                    btn.style.opacity = '1';
                }, 3000);
            });
        });
    }

    // 4. Intersection Observer for Scroll Animations
    // You can add 'fade-in-scroll' class to elements you want to animate on scroll
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.collection-card, .stat').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(el);
    });

    // 5. Fetch Collections from Firebase Firestore
    const collectionsContainer = document.getElementById('collections-container');
    const productsContainer = document.getElementById('products-container');
    const productsView = document.getElementById('products-view');
    const collectionsView = document.getElementById('collections');
    const heroView = document.querySelector('.hero');
    const db = firebase.firestore();

    // Function to show collections view
    function showCollectionsView() {
        productsView.style.display = 'none';
        heroView.style.display = 'flex';
        collectionsView.style.display = 'block';
        window.scrollTo({ top: collectionsView.offsetTop - 80, behavior: 'smooth' });
    }

    // Function to show products view
    function showProductsView(collectionId, collectionName) {
        heroView.style.display = 'none';
        collectionsView.style.display = 'none';
        productsView.style.display = 'block';
        document.getElementById('products-view-title').textContent = collectionName;
        window.scrollTo({ top: 0, behavior: 'smooth' });

        loadProducts(collectionId);
    }

    // Helper to extract fields case-insensitively
    function extractData(rawData) {
        const data = {};
        for (let key in rawData) {
            // Lowercase and remove any spaces/underscores so "Image URL" or "image_url" matches "imageurl"
            const cleanKey = key.toLowerCase().replace(/[\s_]+/g, '');
            if (key !== cleanKey && rawData.hasOwnProperty(cleanKey)) continue;
            data[cleanKey] = rawData[key];
        }
        return {
            name: data.name || data.title || 'Unnamed',
            desc: data.description || data.desc || data.detail || '',
            img: data.imageurl || data.imgurl || data.image || data.img || data.pic || '',
            sizesImg: data.sizesimageurl || data.sizeimage || data.sizesimage || data.sizepic || '',
            sizes: data.sizes || data.size || '',
            refcode: data.refcode || data.referencecode || data.code || data.refercode || '',
            price: data.price || data.cost || ''
        };
    }

    // Load Collections
    function loadCollections() {
        collectionsContainer.innerHTML = '';
        db.collection("collections").orderBy("order").get().then((querySnapshot) => {
            if (!querySnapshot.empty) {
                collectionsContainer.innerHTML = ''; // clear static placeholders
                querySnapshot.forEach((doc) => {
                    const fields = extractData(doc.data());
                    const card = document.createElement('div');
                    card.className = 'collection-card';

                    const imageStyle = fields.img ? `style="background-image: url('${fields.img}'); background-size: contain; background-repeat: no-repeat; background-position: center; color: transparent; padding: 1.5rem; background-origin: content-box;"` : '';
                    const imageText = fields.img ? '' : 'Image loaded from Firebase';

                    card.innerHTML = `
                        <div class="img-placeholder" ${imageStyle}>
                            <span>${imageText}</span>
                        </div>
                        <div class="card-content">
                            <h3>${fields.name}</h3>
                            <p class="card-desc">${fields.desc}</p>
                            <a href="#" class="link view-products-btn">View Products &rarr;</a>
                        </div>
                    `;
                    collectionsContainer.appendChild(card);

                    // Click listener to load products
                    const viewBtn = card.querySelector('.view-products-btn');
                    viewBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        showProductsView(doc.id, fields.name);
                    });

                    card.style.opacity = '0';
                    card.style.transform = 'translateY(30px)';
                    card.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                    observer.observe(card);
                });
            }
        }).catch((error) => {
            console.error("Error fetching collections from Firebase:", error);
        });
    }

    // Load Products for a specific collection
    function loadProducts(collectionId) {

        productsContainer.innerHTML = '<p style="text-align: center; width: 100%;">Loading products...</p>';

        db.collection("collections").doc(collectionId).collection("products").orderBy("order").get().then((querySnapshot) => {

            productsContainer.innerHTML = '';
            if (querySnapshot.empty) {
                productsContainer.innerHTML = '<p style="text-align: center; width: 100%;">No products found in this collection yet. Add them in Firebase!</p>';
                return;
            }

            querySnapshot.forEach((doc) => {
                const fields = extractData(doc.data());
                const card = document.createElement('div');
                card.className = 'collection-card';

                const priceHtml = fields.price ? `<p style="color: var(--accent-color); font-weight: bold; margin-bottom: 0;">${fields.price}</p>` : '';
                const refCodeHtml = fields.refcode ? `<span class="ref-code" style="margin-left:auto;">${fields.refcode}</span>` : '';

                const imageStyle = fields.img ? `style="background-image: url('${fields.img}'); background-size: contain; background-repeat: no-repeat; background-position: center; color: transparent; padding: 1.5rem; background-origin: content-box;"` : '';
                const imageText = fields.img ? '' : 'Product Image';

                card.innerHTML = `
                    <div class="img-placeholder" ${imageStyle}>
                        <span>${imageText}</span>
                    </div>
                    <div class="card-content">
                        <h3 style="display:flex; align-items:baseline; flex-wrap:wrap; gap:0.5rem;">${fields.name} ${refCodeHtml}</h3>
                        ${priceHtml}
                        <p class="card-desc" style="margin-top: 0.5rem;">${fields.desc}</p>
                        <a href="#" class="link view-details-btn">View Details &rarr;</a>
                    </div>
                `;
                productsContainer.appendChild(card);

                // Click listener to open modal
                const viewBtn = card.querySelector('.view-details-btn');
                viewBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.openModal(fields.name, fields.desc, fields.img, fields.sizesImg, fields.refcode, fields.sizes);
                });

                // Click listener for image lightbox
                const imgPlaceholder = card.querySelector('.img-placeholder');
                if (fields.img) {
                    imgPlaceholder.style.cursor = 'zoom-in';
                    imgPlaceholder.title = 'Click to view full image';
                    imgPlaceholder.addEventListener('click', (e) => {
                        e.preventDefault();
                        window.openLightbox(fields.img);
                    });
                }

                card.style.opacity = '0';
                card.style.transform = 'translateY(30px)';
                card.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                observer.observe(card);
            });
        }).catch((error) => {
            console.error("Error fetching products from Firebase:", error);
            productsContainer.innerHTML = '<p style="text-align: center; width: 100%; color: red;">Error loading products. Check your Firebase permissions.</p>';
        });
    }

    // Initialize Collections on load
    loadCollections();

    // Handle Back Button
    const backBtn = document.getElementById('back-to-collections');
    if (backBtn) {
        backBtn.addEventListener('click', showCollectionsView);
    }

    // 6. Modal Logic
    const modal = document.getElementById('product-modal');
    // Use the close-btn INSIDE product-modal specifically, not the first one on the page
    const closeBtn = modal ? modal.querySelector('.close-btn') : null;

    // Make openModal available globally or within the closure
    window.openModal = function (title, desc, img, sizesImg, refcode, sizes) {
        document.getElementById('modal-title').childNodes[0].nodeValue = title + " ";
        const refCodeEl = document.getElementById('modal-ref-code');
        if (refcode) {
            refCodeEl.textContent = refcode;
            refCodeEl.style.display = 'inline-block';
        } else {
            refCodeEl.style.display = 'none';
        }
        document.getElementById('modal-desc').textContent = desc;

        const modalImg = document.getElementById('modal-image');
        if (img) {
            modalImg.style.backgroundImage = `url('${img}')`;
        } else {
            modalImg.style.backgroundImage = 'none';
        }

        const modalSizesImg = document.getElementById('modal-sizes-img');
        if (sizesImg) {
            modalSizesImg.src = sizesImg;
            modalSizesImg.style.display = 'block';
        } else {
            modalSizesImg.style.display = 'none';
            modalSizesImg.src = '';
        }

        const sizesContainer = document.getElementById('modal-sizes-container');
        if (sizes) {
            const sizesArray = sizes.split(',').map(s => s.trim()).filter(s => s);
            
            // Calculate global max dimension for this product to ensure proportional scaling
            let maxDim = 1;
            sizesArray.forEach(size => {
                const match = size.match(/(\d+)\s*[xX]\s*(\d+)/);
                if (match) {
                    maxDim = Math.max(maxDim, parseInt(match[1]), parseInt(match[2]));
                }
            });
            // Let the largest dimension be represented by 120 pixels
            const scale = 120 / maxDim;

            let boxesHtml = `<div class="sizes-wrapper">`;
            sizesArray.forEach(size => {
                const match = size.match(/(\d+)\s*[xX]\s*(\d+)/);
                let width = 60;
                let height = 60;
                if (match) {
                    width = Math.max(Math.round(parseInt(match[1]) * scale), 20); // Minimum 20px so it's not too tiny
                    height = Math.max(Math.round(parseInt(match[2]) * scale), 20);
                } else {
                    width = 80; height = 80;
                }
                boxesHtml += `
                    <div class="size-item">
                        <div class="size-box" style="width: ${width}px; height: ${height}px;"></div>
                        <span class="size-text">${size}</span>
                    </div>
                `;
            });
            boxesHtml += `</div><div class="sizes-header-line"></div>`;
            sizesContainer.innerHTML = boxesHtml;
            sizesContainer.style.display = 'block';
        } else {
            sizesContainer.style.display = 'none';
        }

        modal.classList.add('show');
    }

    if (closeBtn) {
        closeBtn.onclick = function () {
            modal.classList.remove('show');
        }
    }

    // Close any modal when clicking the backdrop
    window.addEventListener('click', function (event) {
        // product modal backdrop
        if (event.target === modal) modal.classList.remove('show');
        // order modal backdrop
        const orderModal = document.getElementById('order-modal');
        if (event.target === orderModal) orderModal.classList.remove('show');
        // sample form modal backdrop
        const sampleModal = document.getElementById('sample-form-modal');
        if (event.target === sampleModal) sampleModal.classList.remove('show');
    });

    // 8. Lightbox Logic
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeLightbox = document.getElementById('close-lightbox');

    window.openLightbox = function(imgUrl) {
        if (!imgUrl) return;
        lightboxImg.src = imgUrl;
        lightbox.classList.add('show');
    };

    if (closeLightbox) {
        closeLightbox.onclick = function () {
            lightbox.classList.remove('show');
            setTimeout(() => lightboxImg.src = '', 300);
        }
    }

    if (lightbox) {
        lightbox.onclick = function (event) {
            if (event.target === lightbox || event.target === lightboxImg) {
                lightbox.classList.remove('show');
                setTimeout(() => lightboxImg.src = '', 300);
            }
        }
    }

    const modalImage = document.getElementById('modal-image');
    if (modalImage) {
        modalImage.style.cursor = 'zoom-in';
        modalImage.title = 'Click to view full image';
        modalImage.addEventListener('click', () => {
            const bg = modalImage.style.backgroundImage;
            if (bg && bg !== 'none') {
                const url = bg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
                window.openLightbox(url);
            }
        });
    }


});

// =====================
// ORDER SAMPLES MODAL
// =====================
(function() {
    const prewrittenMsg = "Hello! I visited the LIM Terrazzo website and I'm interested in ordering samples. Could you please provide more information about available collections and pricing? Thank you!";

    window.addEventListener('DOMContentLoaded', () => {
        const orderBtn = document.getElementById('order-samples-btn');
        const orderModal = document.getElementById('order-modal');
        const closeOrderModal = document.getElementById('close-order-modal');
        const waLink = document.getElementById('order-whatsapp');
        const emailLink = document.getElementById('order-email');
        const igBtn = document.getElementById('order-instagram-btn');
        const igMsgBox = document.getElementById('instagram-msg-box');
        const copyBtn = document.getElementById('copy-ig-msg');
        const openSampleFormBtn = document.getElementById('open-sample-form-btn');

        if (waLink) waLink.href = "https://wa.me/4402035140483?text=Hello%20LIM%20Factory%21%20%F0%9F%91%8B%20I%20visited%20your%20website%20and%20I%27m%20interested%20in%20placing%20an%20order.%20Could%20you%20please%20help%20me%20with%20your%20terrazzo%20tile%20collections%2C%20pricing%2C%20and%20availability%3F%20Thank%20you%21";
        if (emailLink) emailLink.href = "https://mail.google.com/mail/?view=cm&to=limfactoryy%40gmail.com&su=Order%20Inquiry%20%E2%80%93%20LIM%20Factory&body=Hello%20LIM%20Factory%20Team%2C%0A%0AI%20visited%20your%20website%20and%20I%20am%20interested%20in%20placing%20an%20order%20for%20your%20terrazzo%20tiles.%0A%0ACould%20you%20please%20provide%20me%20with%20more%20information%20about%3A%0A-%20Available%20collections%20and%20products%0A-%20Pricing%20and%20minimum%20order%20quantities%0A-%20Delivery%20times%20and%20shipping%20costs%0A%0ALooking%20forward%20to%20hearing%20from%20you.%0A%0AKind%20regards";

        function resetOrderModal() {
            if (igMsgBox) igMsgBox.style.display = 'none';
            if (igBtn) igBtn.style.display = 'flex';
            if (copyBtn) { copyBtn.innerHTML = '&#128203; Copy Message'; copyBtn.classList.remove('copied'); }
        }

        function closeOrder() { orderModal.classList.remove('show'); resetOrderModal(); }

        if (orderBtn) orderBtn.addEventListener('click', () => { resetOrderModal(); orderModal.classList.add('show'); });
        if (closeOrderModal) closeOrderModal.addEventListener('click', closeOrder);
        if (orderModal) orderModal.addEventListener('click', e => { if (e.target === orderModal) closeOrder(); });
        if (igBtn) igBtn.addEventListener('click', () => { igMsgBox.style.display = 'block'; igBtn.style.display = 'none'; });
        if (copyBtn) copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(prewrittenMsg).then(() => {
                copyBtn.innerHTML = '✅ Copied!';
                copyBtn.classList.add('copied');
                setTimeout(() => { copyBtn.innerHTML = '&#128203; Copy Message'; copyBtn.classList.remove('copied'); }, 2500);
            });
        });

        if (openSampleFormBtn) openSampleFormBtn.addEventListener('click', () => {
            closeOrder();
            document.getElementById('sample-form-modal').classList.add('show');
        });
    });
})();

// =====================
// SAMPLE REQUEST FORM
// =====================
(function() {
    window.addEventListener('DOMContentLoaded', () => {
        const modal = document.getElementById('sample-form-modal');
        const closeBtn = document.getElementById('close-sample-form');
        const form = document.getElementById('sample-request-form');
        const submitBtn = document.getElementById('sample-submit-btn');

        if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('show'));
        if (modal) modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });

        if (form) form.addEventListener('submit', e => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form));
            
            submitBtn.textContent = 'Sending...';
            submitBtn.style.opacity = '0.8';

            const db = firebase.firestore();
            db.collection("orders").add({
                type: 'Sample Request',
                name: data.name,
                email: data.email,
                phone: data.phone || '',
                collection: data.collection || '',
                tile: data.tile || '',
                quantity: data.quantity || '',
                address: data.address || '',
                city: data.city || '',
                postcode: data.postcode || '',
                country: data.country || '',
                notes: data.notes || '',
                status: 'new',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                submitBtn.textContent = '✅ Request Sent!';
                submitBtn.style.backgroundColor = '#4caf50';
                form.reset();
                setTimeout(() => {
                    submitBtn.textContent = 'Send Sample Request';
                    submitBtn.style.backgroundColor = '';
                    submitBtn.style.opacity = '1';
                    modal.classList.remove('show');
                }, 3000);
            }).catch((error) => {
                console.error("Error saving sample request: ", error);
                submitBtn.textContent = 'Error!';
                submitBtn.style.backgroundColor = 'red';
                setTimeout(() => {
                    submitBtn.textContent = 'Send Sample Request';
                    submitBtn.style.backgroundColor = '';
                    submitBtn.style.opacity = '1';
                }, 3000);
            });
        });
    });
})();

// (old CSS overlay visualizer removed — replaced by canvas visualizer below)

// =====================
// FAQ ACCORDION
// =====================
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.parentElement;
            const isOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
            if (!isOpen) item.classList.add('open');
        });
    });

    // Dynamic back button position
    const navbar = document.getElementById('navbar');
    const backBtn = document.getElementById('back-to-collections');
    function updateBackBtnPosition() {
        if (backBtn && navbar) backBtn.style.top = (navbar.offsetHeight + 8) + 'px';
    }
    updateBackBtnPosition();
    window.addEventListener('resize', updateBackBtnPosition);
    window.addEventListener('scroll', updateBackBtnPosition);
});

// (old perspective patch removed)

// =====================
// CANVAS ROOM VISUALIZER — 6-handle perspective warp
// Handles: 0=TL, 1=TR, 2=BR, 3=BL (quad corners) + 4=mid-left, 5=mid-right (edge pulls)
// The 6-point shape is: pts[3] → pts[4] → pts[0] (left side curved via mid-left)
//                        pts[1] → pts[5] → pts[2] (right side curved via mid-right)
// For rendering we treat it as a quad (TL,TR,BR,BL) and the mid handles
// pull the left/right edges independently for rooms with angled walls.
// =====================
(function () {
    window.addEventListener('DOMContentLoaded', () => {
        const uploadArea    = document.getElementById('visualizer-upload');
        const fileInput     = document.getElementById('room-photo-input');
        const workspace     = document.getElementById('visualizer-workspace');
        const canvas        = document.getElementById('viz-canvas');
        const resetBtn      = document.getElementById('reset-visualizer');
        const tilesGrid     = document.getElementById('visualizer-tiles');
        const opacitySlider = document.getElementById('opacity-slider');
        const opacityVal    = document.getElementById('opacity-val');
        const scaleSlider   = document.getElementById('scale-slider');
        const scaleVal      = document.getElementById('scale-val');

        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        let roomImg     = null;
        let tileImg     = null;
        let offscreen   = null; // tiled texture canvas
        let tileOpacity = 0.9;
        let tileScale   = 15;
        // 6 handles: [TL, TR, BR, BL, MidLeft, MidRight]
        let pts      = [];
        let dragging = null;
        const HANDLE_R = 11;
        const SUBDIV   = 28; // mesh density

        // ── Upload ───────────────────────────────────────────────────
        if (uploadArea) {
            uploadArea.addEventListener('click', () => fileInput.click());
            uploadArea.addEventListener('dragover',  e => { e.preventDefault(); uploadArea.style.borderColor = 'var(--accent-color)'; });
            uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = '');
            uploadArea.addEventListener('drop',      e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); });
        }
        if (fileInput) fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));

        function handleFile(file) {
            if (!file || !file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = ev => {
                const img = new Image();
                img.onload = () => {
                    roomImg = img;
                    uploadArea.style.display = 'none';
                    workspace.style.display  = 'grid';
                    setupCanvas();
                    resetPts();
                    render();
                    loadVisualizerTiles();
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        }

        function setupCanvas() {
            if (!roomImg) return;
            const maxW = canvas.parentElement.clientWidth || 800;
            canvas.width  = maxW;
            canvas.height = Math.round(maxW * roomImg.height / roomImg.width);
        }

        // Default: nice perspective trapezoid + mid-edge handles centred
        function resetPts() {
            const W = canvas.width, H = canvas.height;
            pts = [
                { x: W * 0.18, y: H * 0.52 },   // 0 TL
                { x: W * 0.82, y: H * 0.52 },   // 1 TR
                { x: W,        y: H          },   // 2 BR
                { x: 0,        y: H          },   // 3 BL
                { x: 0,        y: H * 0.76  },   // 4 Mid-Left  (left edge mid)
                { x: W,        y: H * 0.76  },   // 5 Mid-Right (right edge mid)
            ];
        }

        // ── Build tiled offscreen texture ────────────────────────────
        // The offscreen must be large enough that UV pixel coords (which go up to
        // bw x bh = full canvas size) always fall within it. We build a repeating
        // grid large enough to cover the whole canvas at the current tile scale.
        function buildOffscreen() {
            if (!tileImg) { offscreen = null; return; }
            const ts   = Math.max(10, tileScale * 8);  // one tile in pixels
            const need = Math.max(canvas.width, canvas.height, 400);
            // Round up to next multiple of ts so tiles are never clipped
            const sz   = Math.ceil(need / ts) * ts;
            const oc   = document.createElement('canvas');
            oc.width   = sz;
            oc.height  = sz;
            const octx = oc.getContext('2d');
            for (let ty = 0; ty < sz; ty += ts)
                for (let tx = 0; tx < sz; tx += ts)
                    octx.drawImage(tileImg, tx, ty, ts, ts);
            offscreen = oc;
        }

        // ── Warp fill using 6-point shape ───────────────────────────
        // We subdivide the shape into a mesh. The shape is a hexagon:
        // TL(0) → TR(1) → MidRight(5) → BR(2) → BL(3) → MidLeft(4) → TL
        // For each mesh cell we map UV→canvas via the bilinear quad,
        // then draw a triangle using the affine setTransform trick.
        function drawWarped() {
            if (!offscreen) return;
            const [TL, TR, BR, BL, ML, MR] = pts;
            const ts = Math.max(10, tileScale * 8);

            // We parameterise the shape as a "bent quad":
            // Left edge:  BL(v=1) → ML(v=0.5) → TL(v=0)  (three points, piecewise)
            // Right edge: BR(v=1) → MR(v=0.5) → TR(v=0)
            // We sample each edge as a function of v in [0,1]:
            function leftEdge(v) {
                // piecewise linear: v=0→TL, v=0.5→ML, v=1→BL
                if (v <= 0.5) {
                    const t = v / 0.5;
                    return { x: TL.x + (ML.x - TL.x) * t, y: TL.y + (ML.y - TL.y) * t };
                } else {
                    const t = (v - 0.5) / 0.5;
                    return { x: ML.x + (BL.x - ML.x) * t, y: ML.y + (BL.y - ML.y) * t };
                }
            }
            function rightEdge(v) {
                if (v <= 0.5) {
                    const t = v / 0.5;
                    return { x: TR.x + (MR.x - TR.x) * t, y: TR.y + (MR.y - TR.y) * t };
                } else {
                    const t = (v - 0.5) / 0.5;
                    return { x: MR.x + (BR.x - MR.x) * t, y: MR.y + (BR.y - MR.y) * t };
                }
            }
            // A point inside the shape at (u,v): u=0→left, u=1→right
            function shapePoint(u, v) {
                const L = leftEdge(v), R = rightEdge(v);
                return { x: L.x + (R.x - L.x) * u, y: L.y + (R.y - L.y) * u };
            }

            // Bounding box of the whole shape (for UV scaling)
            const allX = [TL.x, TR.x, BR.x, BL.x, ML.x, MR.x];
            const allY = [TL.y, TR.y, BR.y, BL.y, ML.y, MR.y];
            const bw = Math.max(...allX) - Math.min(...allX);
            const bh = Math.max(...allY) - Math.min(...allY);

            // Clip to the shape boundary
            ctx.save();
            ctx.globalAlpha = tileOpacity;
            ctx.beginPath();
            // Walk: TL → TR (top), TR → MR → BR (right), BR → BL (bottom), BL → ML → TL (left)
            ctx.moveTo(TL.x, TL.y);
            ctx.lineTo(TR.x, TR.y);
            ctx.lineTo(MR.x, MR.y);
            ctx.lineTo(BR.x, BR.y);
            ctx.lineTo(BL.x, BL.y);
            ctx.lineTo(ML.x, ML.y);
            ctx.closePath();
            ctx.clip();

            // Mesh — UVs are in offscreen PIXEL coords.
            // offscreen is sized to cover bw x bh, so UVs (0..bw, 0..bh) are always valid.
            for (let row = 0; row < SUBDIV; row++) {
                for (let col = 0; col < SUBDIV; col++) {
                    const u0 = col       / SUBDIV, u1 = (col + 1) / SUBDIV;
                    const v0 = row       / SUBDIV, v1 = (row + 1) / SUBDIV;

                    const p00 = shapePoint(u0, v0);
                    const p10 = shapePoint(u1, v0);
                    const p11 = shapePoint(u1, v1);
                    const p01 = shapePoint(u0, v1);

                    // UV in offscreen pixel space: floor spans bw x bh canvas px = bw x bh texture px
                    const t00 = { u: u0 * bw, v: v0 * bh };
                    const t10 = { u: u1 * bw, v: v0 * bh };
                    const t11 = { u: u1 * bw, v: v1 * bh };
                    const t01 = { u: u0 * bw, v: v1 * bh };

                    drawTriangle(p00, p10, p11, t00, t10, t11);
                    drawTriangle(p00, p11, p01, t00, t11, t01);
                }
            }

            ctx.restore();
        }

        // Affine texture-map one triangle onto canvas.
        // t0/t1/t2 are UV coords in OFFSCREEN PIXEL space.
        // setTransform maps: offscreen pixel (u,v) -> canvas pixel (x,y).
        function drawTriangle(p0, p1, p2, t0, t1, t2) {
            const x0 = p0.x, y0 = p0.y, x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
            const u0 = t0.u,  v0 = t0.v,  u1 = t1.u,  v1 = t1.v,  u2 = t2.u,  v2 = t2.v;

            const denom = u0*(v1-v2) + u1*(v2-v0) + u2*(v0-v1);
            if (Math.abs(denom) < 1e-10) return;

            // Canvas x = a*u + b*v + c
            const a = (x0*(v1-v2) + x1*(v2-v0) + x2*(v0-v1)) / denom;
            const b = (x0*(u2-u1) + x1*(u0-u2) + x2*(u1-u0)) / denom;
            const c = (x0*(u1*v2-u2*v1) + x1*(u2*v0-u0*v2) + x2*(u0*v1-u1*v0)) / denom;
            // Canvas y = d*u + e*v + f
            const d = (y0*(v1-v2) + y1*(v2-v0) + y2*(v0-v1)) / denom;
            const e = (y0*(u2-u1) + y1*(u0-u2) + y2*(u1-u0)) / denom;
            const f = (y0*(u1*v2-u2*v1) + y1*(u2*v0-u0*v2) + y2*(u0*v1-u1*v0)) / denom;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2);
            ctx.closePath();
            ctx.clip();
            // setTransform(a,b,c,d,e,f) in canvas API:
            //   x_canvas = a*x_src + c*y_src + e
            //   y_canvas = b*x_src + d*y_src + f
            // Our system: x_canvas = a*u + b*v + c  =>  setTransform(a, d, b, e, c, f)
            ctx.setTransform(a, d, b, e, c, f);
            // Draw offscreen at origin — the transform does all the positioning
            ctx.drawImage(offscreen, 0, 0);
            ctx.restore();
        }

        // ── Render ───────────────────────────────────────────────────
        function render() {
            if (!roomImg) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(roomImg, 0, 0, canvas.width, canvas.height);

            if (offscreen && pts.length === 6) drawWarped();

            drawHandles();
        }

        function drawHandles() {
            if (pts.length !== 6) return;
            // Draw shape outline
            const [TL, TR, BR, BL, ML, MR] = pts;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(TL.x, TL.y);
            ctx.lineTo(TR.x, TR.y);
            ctx.lineTo(MR.x, MR.y);
            ctx.lineTo(BR.x, BR.y);
            ctx.lineTo(BL.x, BL.y);
            ctx.lineTo(ML.x, ML.y);
            ctx.closePath();
            ctx.strokeStyle = 'rgba(255,220,60,0.55)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 4]);
            ctx.stroke();
            ctx.restore();

            // Labels for handles
            const labels = ['TL','TR','BR','BL','◀','▶'];
            pts.forEach((p, i) => {
                ctx.save();
                ctx.beginPath();
                ctx.arc(p.x, p.y, HANDLE_R, 0, Math.PI * 2);
                ctx.fillStyle   = i === dragging ? '#ffffff' : (i >= 4 ? 'rgba(100,200,255,0.92)' : 'rgba(255,220,60,0.92)');
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur  = 6;
                ctx.fill();
                ctx.lineWidth   = 2;
                ctx.strokeStyle = '#111';
                ctx.shadowBlur  = 0;
                ctx.stroke();
                ctx.restore();
            });
        }

        // ── Drag ─────────────────────────────────────────────────────
        function getCanvasPos(e) {
            const rect = canvas.getBoundingClientRect();
            const src  = e.touches ? e.touches[0] : e;
            return {
                x: (src.clientX - rect.left) * canvas.width  / rect.width,
                y: (src.clientY - rect.top)  * canvas.height / rect.height,
            };
        }

        function nearestHandle(pos) {
            let best = -1, bestD = HANDLE_R * 3;
            pts.forEach((p, i) => {
                const d = Math.hypot(p.x - pos.x, p.y - pos.y);
                if (d < bestD) { bestD = d; best = i; }
            });
            return best;
        }

        canvas.addEventListener('mousedown',  e => { const idx = nearestHandle(getCanvasPos(e)); if (idx >= 0) { dragging = idx; e.preventDefault(); } });
        canvas.addEventListener('touchstart', e => { const idx = nearestHandle(getCanvasPos(e)); if (idx >= 0) { dragging = idx; e.preventDefault(); } }, { passive: false });

        function onMove(e) {
            if (dragging === null || dragging < 0) return;
            if (e.cancelable) e.preventDefault();
            const pos = getCanvasPos(e);
            pts[dragging] = {
                x: Math.max(0, Math.min(canvas.width,  pos.x)),
                y: Math.max(0, Math.min(canvas.height, pos.y)),
            };
            render();
        }
        window.addEventListener('mousemove',  onMove);
        window.addEventListener('touchmove',  onMove, { passive: false });
        window.addEventListener('mouseup',    () => { dragging = null; });
        window.addEventListener('touchend',   () => { dragging = null; });

        canvas.addEventListener('mousemove', e => {
            canvas.style.cursor = nearestHandle(getCanvasPos(e)) >= 0 ? 'grab' : 'default';
        });

        // ── Controls ─────────────────────────────────────────────────
        if (opacitySlider) opacitySlider.addEventListener('input', () => {
            tileOpacity = opacitySlider.value / 100;
            if (opacityVal) opacityVal.textContent = opacitySlider.value + '%';
            render();
        });

        if (scaleSlider) scaleSlider.addEventListener('input', () => {
            tileScale = parseInt(scaleSlider.value);
            if (scaleVal) scaleVal.textContent = (tileScale / 15).toFixed(1) + 'x';
            buildOffscreen();
            render();
        });

        if (resetBtn) resetBtn.addEventListener('click', () => {
            workspace.style.display = 'none';
            uploadArea.style.display = 'block';
            roomImg = null; tileImg = null; offscreen = null; pts = [];
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (fileInput) fileInput.value = '';
        });

        // ── Load tiles ───────────────────────────────────────────────
        function loadVisualizerTiles() {
            if (!tilesGrid) return;
            tilesGrid.innerHTML = '<p style="font-size:0.8rem;color:#a0a0a0;grid-column:1/-1;">Loading tiles…</p>';
            const dbRef    = firebase.firestore();
            const allTiles = [];

            dbRef.collection('collections').get().then(colSnap => {
                const promises = [];
                colSnap.forEach(colDoc => {
                    promises.push(
                        dbRef.collection('collections').doc(colDoc.id).collection('products').get().then(prodSnap => {
                            prodSnap.forEach(prodDoc => {
                                const d      = prodDoc.data();
                                const imgKey = Object.keys(d).find(k => {
                                    const c = k.toLowerCase().replace(/[\s_]/g, '');
                                    return c === 'imageurl' || c === 'image' || c === 'img' || c === 'pic';
                                });
                                const img = imgKey ? d[imgKey] : '';
                                if (img) allTiles.push({ name: d.name || d.Name || 'Tile', img });
                            });
                        })
                    );
                });
                return Promise.all(promises);
            }).then(() => {
                tilesGrid.innerHTML = '';
                if (!allTiles.length) {
                    tilesGrid.innerHTML = '<p style="font-size:0.8rem;color:#a0a0a0;grid-column:1/-1;">No tiles found.</p>';
                    return;
                }
                allTiles.forEach(tile => {
                    const btn = document.createElement('div');
                    btn.className = 'viz-tile-btn';
                    btn.title     = tile.name;
                    btn.style.backgroundImage = `url('${tile.img}')`;
                    btn.addEventListener('click', () => {
                        document.querySelectorAll('.viz-tile-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.onload  = () => { tileImg = img; buildOffscreen(); render(); };
                        img.onerror = () => { tileImg = null; offscreen = null; render(); };
                        img.src = tile.img;
                    });
                    tilesGrid.appendChild(btn);
                });
                tilesGrid.querySelector('.viz-tile-btn').click();
            });
        }

        window.addEventListener('resize', () => { setupCanvas(); resetPts(); buildOffscreen(); render(); });
    });
})();

// =====================
// STAT COUNTER ANIMATION
// =====================
window.addEventListener('DOMContentLoaded', () => {
    const statObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                statObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.4 });

    document.querySelectorAll('.stat').forEach(el => statObserver.observe(el));
});
