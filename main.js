document.addEventListener('DOMContentLoaded', () => {

    // 0. Theme Toggle Logic
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeIcon.innerHTML = '&#9789;'; // Moon icon
    }

    themeToggle.addEventListener('click', () => {
        const root = document.documentElement;
        if (root.getAttribute('data-theme') === 'light') {
            root.removeAttribute('data-theme');
            localStorage.setItem('theme', 'dark');
            themeIcon.innerHTML = '&#9728;'; // Sun icon
        } else {
            root.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            themeIcon.innerHTML = '&#9789;'; // Moon icon
        }
    });

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

    // 3. Simple Form Submission Simulation
    const form = document.getElementById('inquiry-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.textContent;

            btn.textContent = 'Sending...';
            btn.style.opacity = '0.8';

            // Simulate network request
            setTimeout(() => {
                btn.textContent = 'Message Sent!';
                btn.style.backgroundColor = '#4caf50'; // Green success
                form.reset();

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.backgroundColor = '';
                    btn.style.opacity = '1';
                }, 3000);
            }, 1500);
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
            data[cleanKey] = rawData[key];
        }
        return {
            name: data.name || data.title || 'Unnamed',
            desc: data.description || data.desc || data.detail || '',
            img: data.imageurl || data.imgurl || data.image || data.img || data.pic || '',
            sizesImg: data.sizesimageurl || data.sizeimage || data.sizesimage || data.sizepic || '',
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

                    const imageStyle = fields.img ? `style="background-image: url('${fields.img}'); background-size: contain; background-repeat: no-repeat; background-position: center; color: transparent;"` : '';
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

                const imageStyle = fields.img ? `style="background-image: url('${fields.img}'); background-size: contain; background-repeat: no-repeat; background-position: center; color: transparent;"` : '';
                const imageText = fields.img ? '' : 'Product Image';

                card.innerHTML = `
                    <div class="img-placeholder" ${imageStyle}>
                        <span>${imageText}</span>
                    </div>
                    <div class="card-content">
                        <h3>${fields.name}</h3>
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
                    window.openModal(fields.name, fields.desc, fields.img, fields.sizesImg);
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
    const backBtn = document.getElementById("back-to-collections");
    if (backBtn) {
        backBtn.addEventListener("click", showCollectionsView);
    }

    // Dynamically position back button just below navbar
    function updateBackBtnPosition() {
        if (backBtn) {
            backBtn.style.top = (navbar.offsetHeight + 8) + "px";
        }
    }
    updateBackBtnPosition();
    window.addEventListener("resize", updateBackBtnPosition);
    window.addEventListener("scroll", updateBackBtnPosition);

    // 6. Modal Logic
    const modal = document.getElementById('product-modal');
    const closeBtn = document.querySelector('.close-btn');

    // Make openModal available globally or within the closure
    window.openModal = function (title, desc, img, sizesImg) {
        document.getElementById('modal-title').textContent = title;
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

        modal.classList.add('show');
    }

    if (closeBtn) {
        closeBtn.onclick = function () {
            modal.classList.remove('show');
        }
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.classList.remove('show');
        }
    }

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

    // 7. Theme Toast Notification
    const toast = document.getElementById('theme-toast');
    if (toast) {
        // Show toast after 1 second
        setTimeout(() => {
            toast.classList.add('show');
        }, 1000);

        // Hide toast after 10 seconds visibility
        setTimeout(() => {
            toast.classList.remove('show');
        }, 11000);
    }


});
