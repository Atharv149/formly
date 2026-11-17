/* =========================================
   FORMLY — SUPABASE BACKEND CONNECTION
   Auth, products, orders, custom requests, admin.
   Load AFTER script.js (see index.html).
   ========================================= */
(() => {
  const cfg = window.FORMLY_SUPABASE || {};
  const ready = window.supabase && cfg.url && cfg.anonKey && !cfg.url.startsWith("YOUR_");
  const sb = ready ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
  if (!sb) console.warn("Formly: add your Supabase URL and anon key in supabase-config.js");

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const noBackend = () => toast("Backend not connected yet — check supabase-config.js");

  let user = null;
  let mode = "login";
  let pendingCheckout = false;

  const fromRow = r => ({
    id: r.id, cat: r.category, name: r.name, rating: Number(r.rating), reviews: r.reviews,
    price: Number(r.price), color: r.color, img: r.image_url || "", description: r.description,
    formats: r.formats || [], gift: r.is_gift
  });

  const refreshShop = () => { renderHome(); renderModels(); renderGifts(); renderChips(); };

  async function loadProducts() {
    if (!sb) return;
    const { data, error } = await sb.from("products").select("*").order("id");
    if (error) return toast("Couldn't load products");
    products.splice(0, products.length, ...data.map(fromRow));
    refreshShop();
  }

  /* ---------- ROUTING ---------- */
  validPages.push("login", "checkout", "admin");

  const baseShow = showView;
  showView = (v, updateURL) => {
    if (v === "admin" && user?.role !== "admin") v = "login";
    if (v === "login" && user) v = "home";
    if (v === "checkout") {
      if (!cart.length) v = "cart";
      else if (!user) { v = "login"; pendingCheckout = true; toast("Please log in to place your order"); }
    }
    baseShow(v, updateURL);
    if (v === "admin") renderAdmin();
    if (v === "checkout") renderCheckout();
  };

  /* ---------- AUTH ---------- */
  async function setUser(session) {
    user = null;
    if (session) {
      const { data } = await sb.from("profiles").select("name, role").eq("id", session.user.id).single();
      user = {
        id: session.user.id,
        email: session.user.email,
        name: data?.name || session.user.email.split("@")[0],
        role: data?.role || "customer"
      };
    }
    updateNav();
  }

  function updateNav() {
    const link = $("authLink");
    link.textContent = user ? `Logout (${user.name.split(" ")[0]})` : "Login";
    link.setAttribute("href", user ? "#/home" : "#/login");
    $("adminLink").hidden = user?.role !== "admin";
  }

  $("authLink").addEventListener("click", async () => {
    if (!user) return;
    await sb.auth.signOut();
    user = null;
    updateNav();
    toast("Logged out");
  });

  function setMode(m) {
    mode = m;
    const signup = m === "signup";
    $("authTitle").textContent = signup ? "Create account." : "Log in.";
    $("authSubmit").textContent = signup ? "Sign up →" : "Log in →";
    $("nameWrap").hidden = !signup;
    $("authSwitchText").textContent = signup ? "Already have an account?" : "New to Formly?";
    $("authSwitch").textContent = signup ? "Log in" : "Create an account";
    $("authError").hidden = true;
  }

  $("authSwitch").addEventListener("click", e => {
    e.preventDefault();
    setMode(mode === "login" ? "signup" : "login");
  });

  $("authForm").addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.target, err = $("authError");
    const fail = msg => { err.textContent = msg; err.hidden = false; };
    if (!sb) return fail("Backend not connected yet.");
    if (!form.checkValidity()) return fail("Enter a valid email and a password of at least 6 characters.");

    const f = new FormData(form);
    const email = f.get("email").trim().toLowerCase();
    const password = f.get("password");
    const name = (f.get("name") || "").trim();

    if (mode === "signup") {
      if (!name) return fail("Please enter your name.");
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name } } });
      if (error) return fail(error.message);
      if (!data.session) {
        setMode("login");
        return fail("Account created! Check your email to confirm it, then log in.");
      }
      await setUser(data.session);
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return fail("Wrong email or password.");
      await setUser(data.session);
    }

    form.reset();
    err.hidden = true;
    toast(`Welcome, ${user.name.split(" ")[0]}!`);
    showView(pendingCheckout ? "checkout" : user.role === "admin" ? "admin" : "home");
    pendingCheckout = false;
  });

  /* ---------- CHECKOUT ---------- */
  const cartTotal = () => cart.reduce((s, i) => s + i.price * i.quantity, 0);

  function renderCheckout() {
    $("checkoutForm").hidden = false;
    $("orderSummary").hidden = false;
    $("orderSuccess").hidden = true;
    $("orderSummary").innerHTML = cart.map(i =>
      `<p>${esc(i.name)} × ${i.quantity} — <strong>${money(i.price * i.quantity)}</strong></p>`
    ).join("") + `<p class="price">Total: ${money(cartTotal())}</p>`;
    const nameInput = $("checkoutForm").elements.name;
    if (user && !nameInput.value) nameInput.value = user.name;
  }

  const oldBtn = $("checkoutBtn");
  const newBtn = oldBtn.cloneNode(true); // removes the old "not connected" listener
  oldBtn.replaceWith(newBtn);
  newBtn.addEventListener("click", () => showView("checkout"));

  $("checkoutForm").addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) return form.reportValidity();
    if (!cart.length) return showView("cart");
    if (!sb) return noBackend();

    const submit = form.querySelector("[type=submit]");
    submit.disabled = true;
    // Only product ids and quantities are sent; the database sets the prices.
    const { data: orderNumber, error } = await sb.rpc("place_order", {
      p_items: cart.map(i => ({ id: i.id, quantity: i.quantity })),
      p_customer: Object.fromEntries(new FormData(form))
    });
    submit.disabled = false;
    if (error) return toast(error.message);

    cart = [];
    renderCart();
    form.reset();
    form.hidden = true;
    $("orderSummary").hidden = true;
    $("orderSuccess").hidden = false;
    $("orderId").textContent = orderNumber;
  });

  /* ---------- CUSTOM DESIGN REQUEST ---------- */
  $("customForm").addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.target, error = $("formError");
    error.hidden = true;
    if (!form.checkValidity()) {
      form.reportValidity();
      error.textContent = "Please complete all required fields correctly.";
      error.hidden = false;
      return;
    }
    if (!sb) return noBackend();

    const f = Object.fromEntries(new FormData(form));
    const { error: err } = await sb.from("custom_requests").insert({
      name: f.name.trim(), email: f.email.trim(), type: f.type, budget: f.budget, message: f.message.trim()
    });
    if (err) {
      error.textContent = "Couldn't send your request. Please try again.";
      error.hidden = false;
      return;
    }
    form.hidden = true;
    $("formSuccess").hidden = false;
    $("formSuccess").querySelector("h3").textContent = `Thank you, ${f.name.trim()}! Request received.`;
    form.reset();
  });

  /* ---------- ADMIN ---------- */
  $("pCat").innerHTML = categories.map(c => `<option>${esc(c.name)}</option>`).join("");

  const resizeToBlob = file => new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 900 / img.width);
      const c = document.createElement("canvas");
      c.width = img.width * s;
      c.height = img.height * s;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(resolve, "image/jpeg", 0.85);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

  const option = (list, current) => list.map(s => `<option ${s === current ? "selected" : ""}>${s}</option>`).join("");

  async function renderAdmin() {
    $("adminProducts").innerHTML = products.map(p => `
      <div class="cart-item">
        <div class="thumb">${imageHTML(p)}</div>
        <div><h3>${esc(p.name)}</h3><p>${esc(p.cat)} · ${money(p.price)}</p></div>
        <button class="remove" data-del="${p.id}" type="button">Delete</button>
      </div>`).join("") || `<p class="empty">No products yet.</p>`;

    if (!sb) return;
    const [orders, requests] = await Promise.all([
      sb.from("orders").select("*, order_items(name, quantity)").order("created_at", { ascending: false }),
      sb.from("custom_requests").select("*").order("created_at", { ascending: false })
    ]);

    $("adminOrders").innerHTML = (orders.data || []).map(o => `
      <div class="cart-item" style="align-items:flex-start">
        <div>
          <h3>#${esc(o.order_number)} · ${money(o.total)}</h3>
          <p>${esc(o.name)} · ${esc(o.phone)} · ${esc(o.email)}</p>
          <p>${esc(o.address)}, ${esc(o.city)}, ${esc(o.state)} ${esc(o.pin)}</p>
          <p>${o.order_items.map(i => `${esc(i.name)} × ${i.quantity}`).join(", ")}</p>
          <p>Payment: ${esc(o.payment)} · ${new Date(o.created_at).toLocaleString("en-IN")}</p>
        </div>
        <select data-order="${esc(o.order_number)}" style="margin-left:auto">
          ${option(["New", "Packed", "Shipped", "Delivered", "Cancelled"], o.status)}
        </select>
      </div>`).join("") || `<p class="empty">No orders yet.</p>`;

    $("adminRequests").innerHTML = (requests.data || []).map(r => `
      <div class="cart-item" style="align-items:flex-start">
        <div>
          <h3>${esc(r.name)} · ${esc(r.type)} · ${esc(r.budget)}</h3>
          <p>${esc(r.email)} · ${new Date(r.created_at).toLocaleString("en-IN")}</p>
          <p>${esc(r.message)}</p>
        </div>
        <select data-request="${r.id}" style="margin-left:auto">
          ${option(["New", "In progress", "Done"], r.status)}
        </select>
      </div>`).join("") || `<p class="empty">No custom requests yet.</p>`;
  }

  $("productForm").addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) return form.reportValidity();
    if (!sb) return noBackend();

    const f = new FormData(form);
    const file = form.elements.image.files[0];
    let image_url = null;

    if (file) {
      const blob = await resizeToBlob(file);
      if (blob) {
        const path = `${crypto.randomUUID()}.jpg`;
        const { error } = await sb.storage.from("product-images").upload(path, blob, { contentType: "image/jpeg" });
        if (error) return toast("Image upload failed: " + error.message);
        image_url = sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      }
    }

    const { error } = await sb.from("products").insert({
      category: f.get("cat"),
      name: f.get("name").trim(),
      description: f.get("description").trim(),
      price: Number(f.get("price")),
      formats: f.get("formats").split(",").map(s => s.trim().toUpperCase()).filter(Boolean),
      is_gift: form.elements.gift.checked,
      image_url
    });
    if (error) return toast(error.message);

    form.reset();
    await loadProducts();
    renderAdmin();
    toast("Product added");
  });

  $("adminProducts").addEventListener("click", async e => {
    const btn = e.target.closest("[data-del]");
    if (!btn || !confirm("Delete this product?")) return;
    const { error } = await sb.from("products").delete().eq("id", Number(btn.dataset.del));
    if (error) return toast(error.message);
    await loadProducts();
    renderAdmin();
  });

  $("adminOrders").addEventListener("change", async e => {
    const sel = e.target.closest("[data-order]");
    if (!sel) return;
    const { error } = await sb.from("orders").update({ status: sel.value }).eq("order_number", sel.dataset.order);
    toast(error ? error.message : "Order updated");
  });

  $("adminRequests").addEventListener("change", async e => {
    const sel = e.target.closest("[data-request]");
    if (!sel) return;
    const { error } = await sb.from("custom_requests").update({ status: sel.value }).eq("id", Number(sel.dataset.request));
    toast(error ? error.message : "Request updated");
  });

  /* ---------- START ---------- */
  (async () => {
    if (sb) {
      const { data } = await sb.auth.getSession();
      await setUser(data.session);
      await loadProducts();
    } else {
      updateNav();
    }
    const page = location.hash.replace("#/", "");
    if (["login", "checkout", "admin"].includes(page)) showView(page, false);
  })();
})();
