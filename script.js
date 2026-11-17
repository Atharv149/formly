
/* =========================================
   FORMLY — STORE FUNCTIONALITY
   Compatible with current index.html
   ========================================= */

/* ---------- PRODUCT DATA ---------- */

const categories = [
  { name: "3D-Printed Gifts", color: "#8fbf7a", img: "images/category-gifts.jpg" },
  { name: "Engineering", color: "#8a8a8a", img: "images/category-engineering.jpg" },
  { name: "Home Decor", color: "#e59a92", img: "images/category-home.jpg" },
  { name: "Kitchen", color: "#e8833a", img: "images/category-kitchen.jpg" },
  { name: "Gadgets & Tools", color: "#8a6fd1", img: "images/category-gadgets.jpg" }
];

const products = [
  {
    id: 1,
    cat: "Home Decor",
    name: "Rock-On Planter",
    rating: 4.0,
    reviews: 12,
    price: 229,
    color: "#8a6fd1",
    img: "images/rock-on-planter.jpg",
    description: "A modern sculptural planter design that adds character to your home.",
    formats: ["STL", "OBJ"],
    gift: true
  },
  {
    id: 2,
    cat: "Kitchen",
    name: "Faceted Mug Design",
    rating: 5.0,
    reviews: 18,
    price: 179,
    color: "#e6c98e",
    img: "images/faceted-mug.jpg",
    description: "A geometric mug design with a distinctive faceted surface.",
    formats: ["STL", "3MF"],
    gift: true
  },
  {
    id: 3,
    cat: "Engineering",
    name: "Mini Robot Rover Chassis",
    rating: 4.5,
    reviews: 16,
    price: 349,
    color: "#555555",
    img: "images/robot-rover.jpg",
    description: "A compact rover chassis concept for robotics and engineering projects.",
    formats: ["STL", "STEP"],
    gift: false
  },
  {
    id: 4,
    cat: "Engineering",
    name: "Mechanical Learning Kit",
    rating: 5.0,
    reviews: 14,
    price: 399,
    color: "#777777",
    img: "images/mechanical-kit.jpg",
    description: "A mechanical learning model designed for educational exploration.",
    formats: ["STL", "STEP"],
    gift: false
  },
  {
    id: 5,
    cat: "Home Decor",
    name: "Organic Arch Sculpture",
    rating: 5.0,
    reviews: 9,
    price: 299,
    color: "#d9795a",
    img: "images/arch-sculpture.jpg",
    description: "An elegant architectural-inspired sculpture for modern interiors.",
    formats: ["STL", "OBJ"],
    gift: true
  },
  {
    id: 6,
    cat: "Home Decor",
    name: "Spiral Twist Vase",
    rating: 4.0,
    reviews: 11,
    price: 199,
    color: "#3f9a55",
    img: "images/spiral-vase.jpg",
    description: "A decorative spiral vase with a flowing, contemporary form.",
    formats: ["STL", "3MF"],
    gift: true
  }
];

/* ---------- STATE ---------- */

let cart = [];
let activeCategory = "All";
let searchQuery = "";
let sortMode = "featured";
let currentProduct = null;

const $ = id => document.getElementById(id);

const money = value =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);

/* ---------- IMAGE HANDLING ---------- */

function imageHTML(item, className = "photo") {
  const fallback = item.color || "#e9e5dc";

  return `
    <img
      class="${className}"
      src="${item.img || ""}"
      alt="${item.name || "Product image"}"
      loading="lazy"
      style="background:${fallback}"
      onerror="this.onerror=null;this.style.display='none';this.parentElement.style.background='linear-gradient(135deg, ${fallback}, #f1ede6)'"
    >
  `;
}

/* ---------- RATINGS ---------- */

function stars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;

  return `
    <span class="rating-stars">
      ${"★".repeat(full)}${half ? "½" : ""}
    </span>
    <span>${rating.toFixed(1)}</span>
  `;
}

/* ---------- TOAST ---------- */

let toastTimer;

function toast(message) {
  const element = $("toast");
  if (!element) return;

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    element.classList.remove("show");
  }, 2200);
}

/* ---------- CATEGORY DISPLAY ---------- */

function renderCategories() {
  const container = $("catGrid");
  if (!container) return;

  container.innerHTML = categories.map(category => `
    <article class="cat-card" data-category="${category.name}">
      <div class="cat-media">
        ${imageHTML({
          name: category.name,
          img: category.img,
          color: category.color
        })}
      </div>

      <div class="cat-label">
        ${category.name}
      </div>
    </article>
  `).join("");
}

/* ---------- PRODUCT CARD ---------- */

function productCard(product) {
  return `
    <article class="card">

      <div class="card-art" data-product="${product.id}">
        ${imageHTML(product)}
      </div>

      <div class="card-body">

        <p class="muted">${product.cat}</p>

        <h3>${product.name}</h3>

        <div class="rating">
          ${stars(product.rating)}
          <span>(${product.reviews})</span>
        </div>

        <div class="formats">
          ${product.formats.map(format =>
            `<span>${format}</span>`
          ).join("")}
        </div>

        <div class="card-foot">

          <span class="price">${money(product.price)}</span>

          <button
            class="add-btn"
            data-add="${product.id}"
            type="button">
            Add to cart
          </button>

        </div>
      </div>
    </article>
  `;
}

/* ---------- FILTER AND SORT ---------- */

function getFilteredProducts() {
  let result = [...products];

  if (activeCategory !== "All") {
    result = result.filter(product =>
      product.cat.toLowerCase() === activeCategory.toLowerCase()
    );
  }

  if (searchQuery) {
    result = result.filter(product =>
      `${product.name} ${product.cat} ${product.description}`
        .toLowerCase()
        .includes(searchQuery)
    );
  }

  if (sortMode === "low") {
    result.sort((a, b) => a.price - b.price);
  }

  if (sortMode === "high") {
    result.sort((a, b) => b.price - a.price);
  }

  if (sortMode === "rating") {
    result.sort((a, b) => b.rating - a.rating);
  }

  return result;
}

/* ---------- PRODUCT GRID ---------- */

function renderProductGrid(containerId, list) {
  const container = $(containerId);
  if (!container) return;

  container.innerHTML = list.length
    ? list.map(productCard).join("")
    : `<p class="empty">No models found. Try another search.</p>`;
}

function renderHome() {
  renderProductGrid("featuredGrid", products.slice(0, 4));

  // Gift preview on homepage
  renderProductGrid(
    "giftPreview",
    products.filter(product => product.gift).slice(0, 2)
  );
}

function renderModels() {
  const result = getFilteredProducts();

  renderProductGrid("modelsGrid", result);

  const empty = $("modelsEmpty");
  if (empty) {
    empty.hidden = result.length > 0;
  }
}

function renderGifts() {
  const gifts = products.filter(product => product.gift);
  renderProductGrid("giftsGrid", gifts);
}

/* ---------- FILTER CHIPS ---------- */

function renderChips() {
  const container = $("chips");
  if (!container) return;

  const options = [
    "All",
    ...new Set(products.map(product => product.cat))
  ];

  container.innerHTML = options.map(category => `
    <button
      type="button"
      class="chip ${activeCategory === category ? "active" : ""}"
      data-filter="${category}">
      ${category}
    </button>
  `).join("");
}

/* ---------- PRODUCT MODAL ---------- */

function openProduct(id) {
  const product = products.find(p => p.id === Number(id));
  if (!product) return;

  currentProduct = product;

  const modal = $("modal");
  if (!modal) return;

  $("mArt").innerHTML = imageHTML(product);
  $("mCat").textContent = product.cat;
  $("mTitle").textContent = product.name;

  $("mRating").innerHTML =
    `${stars(product.rating)} (${product.reviews} reviews)`;

  $("mDesc").textContent = product.description;

  $("mFormats").innerHTML = product.formats
    .map(format => `<span>${format}</span>`)
    .join("");

  $("mPrice").textContent = money(product.price);

  // Important: remove hidden attribute as well
  modal.hidden = false;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
}

function closeProduct() {
  const modal = $("modal");
  if (!modal) return;

  modal.classList.remove("active");
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");

  currentProduct = null;
}

/* ---------- CART ---------- */

function addToCart(id) {
  const product = products.find(p => p.id === Number(id));
  if (!product) return;

  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      ...product,
      quantity: 1
    });
  }

  renderCart();
  toast(`${product.name} added to cart`);
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== Number(id));
  renderCart();
}

function changeQuantity(id, amount) {
  const item = cart.find(p => p.id === Number(id));
  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {
    removeFromCart(id);
  } else {
    renderCart();
  }
}

function renderCart() {
  const count = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if ($("cartCount")) {
    $("cartCount").textContent = count;
  }

  if ($("cartTotal")) {
    $("cartTotal").textContent = money(total);
  }

  const list = $("cartList");

  if (list) {
    list.innerHTML = cart.length
      ? cart.map(item => `
        <div class="cart-item">

          <div class="thumb">
            ${imageHTML(item)}
          </div>

          <div>
            <h3>${item.name}</h3>

            <p>${money(item.price)} × ${item.quantity}</p>

            <button
              data-quantity="${item.id}"
              data-change="-1"
              type="button">−</button>

            <span>${item.quantity}</span>

            <button
              data-quantity="${item.id}"
              data-change="1"
              type="button">+</button>
          </div>

          <button
            class="remove"
            data-remove="${item.id}"
            type="button">
            Remove
          </button>

        </div>
      `).join("")
      : `<p class="empty">Your cart is empty.</p>`;
  }

  const empty = $("cartEmpty");
  if (empty) {
    empty.hidden = cart.length > 0;
  }

  const summary = $("cartSummary");
  if (summary) {
    summary.hidden = cart.length === 0;
  }
}

/* ---------- PAGE NAVIGATION ---------- */

const validPages = [
  "home",
  "models",
  "gifts",
  "custom",
  "cart"
];

function showView(viewName, updateURL = true) {
  if (!validPages.includes(viewName)) {
    viewName = "home";
  }

  // Match data-view, not element ID
  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle(
      "active",
      view.dataset.view === viewName
    );
  });

  // Update active navigation link
  document.querySelectorAll(".nav a").forEach(link => {
    link.classList.toggle(
      "active",
      link.getAttribute("href") === `#/${viewName}`
    );
  });

  // Close mobile menu
  $("nav")?.classList.remove("open");

  $("burger")?.setAttribute("aria-expanded", "false");

  // Update browser URL
  if (updateURL && location.hash !== `#/${viewName}`) {
    history.pushState(null, "", `#/${viewName}`);
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* ---------- NAVIGATION EVENTS ---------- */

document.addEventListener("click", event => {
  const link = event.target.closest('a[href^="#/"]');
  if (!link) return;

  const viewName = link.getAttribute("href").replace("#/", "");

  if (validPages.includes(viewName)) {
    event.preventDefault();
    showView(viewName);
  }
});

// Browser back and forward buttons
window.addEventListener("popstate", () => {
  const page = location.hash.replace("#/", "");
  showView(page, false);
});

/* ---------- MOBILE MENU ---------- */

$("burger")?.addEventListener("click", () => {
  const nav = $("nav");
  const burger = $("burger");

  const isOpen = nav.classList.toggle("open");

  burger.setAttribute("aria-expanded", isOpen);
});

/* ---------- CATEGORY SELECTION ---------- */

$("catGrid")?.addEventListener("click", event => {
  const card = event.target.closest("[data-category]");
  if (!card) return;

  const selected = card.dataset.category;

  // Ignore category labels without matching products
  const hasProducts = products.some(
    product => product.cat.toLowerCase() === selected.toLowerCase()
  );

  if (!hasProducts) {
    toast("More designs coming soon!");
    return;
  }

  activeCategory = selected;
  searchQuery = "";

  if ($("search")) {
    $("search").value = "";
  }

  renderChips();
  renderModels();
  showView("models");
});

/* ---------- PRODUCT DETAILS AND ADD TO CART ---------- */

document.addEventListener("click", event => {
  const addButton = event.target.closest("[data-add]");

  if (addButton) {
    addToCart(addButton.dataset.add);
    return;
  }

  const productArea = event.target.closest("[data-product]");

  if (productArea) {
    openProduct(productArea.dataset.product);
  }
});

/* ---------- MODAL BUTTONS ---------- */

$("mAdd")?.addEventListener("click", () => {
  if (currentProduct) {
    addToCart(currentProduct.id);
    closeProduct();
  }
});

$("modal")?.addEventListener("click", event => {
  if (
    event.target.classList.contains("modal-backdrop") ||
    event.target.closest("[data-close]")
  ) {
    closeProduct();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeProduct();
  }
});

/* ---------- CATEGORY FILTER ---------- */

$("chips")?.addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;

  activeCategory = button.dataset.filter;

  renderChips();
  renderModels();
});

/* ---------- SEARCH ---------- */

$("search")?.addEventListener("input", event => {
  searchQuery = event.target.value.trim().toLowerCase();
  renderModels();
});

/* ---------- SORT ---------- */

$("sort")?.addEventListener("change", event => {
  sortMode = event.target.value;
  renderModels();
});

/* ---------- CART EVENTS ---------- */

$("cartList")?.addEventListener("click", event => {
  const removeButton = event.target.closest("[data-remove]");

  if (removeButton) {
    removeFromCart(removeButton.dataset.remove);
    return;
  }

  const quantityButton = event.target.closest("[data-quantity]");

  if (quantityButton) {
    changeQuantity(
      quantityButton.dataset.quantity,
      Number(quantityButton.dataset.change)
    );
  }
});

/* ---------- CLEAR CART ---------- */

$("clearBtn")?.addEventListener("click", () => {
  cart = [];
  renderCart();
  toast("Bag cleared");
});

/* ---------- CHECKOUT ---------- */

$("checkoutBtn")?.addEventListener("click", () => {
  if (!cart.length) {
    toast("Your bag is empty");
    return;
  }

  toast("Checkout is not connected yet");
});

/* Custom design form is handled in extras.js (saved to Supabase) */

/* ---------- INITIALIZE ---------- */

function init() {
  renderCategories();
  renderHome();
  renderModels();
  renderGifts();
  renderChips();
  renderCart();

  const initialPage = location.hash.replace("#/", "");

  showView(
    validPages.includes(initialPage) ? initialPage : "home",
    false
  );
}

init();
