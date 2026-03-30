//page logic + UI design
//JavaScript/React
import { useMemo, useState, useEffect } from "react";
import "./App.css";

const countries = ["Mexico", "India", "France", "Germany", "United States", "Canada"];

/** ---------- Panels ---------- */
function StatPill({ label, value }) {
  return (
    <div className="statPill">
      <div className="statLabel">{label}</div>
      <div className="statValue">{value}</div>
    </div>
  );
}

function OrdersPanel({ orders, loading, error }) {
  if (loading) return <section className="card">Loading orders…</section>;
  if (error) return <section className="card danger">Failed to load orders: {error}</section>;
  if (!orders?.length) return <section className="card">No orders found.</section>;

  const totalSpend = orders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);

  return (
    <>
      <section className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Orders</div>
            <div className="cardHint">Recent orders for this user.</div>
          </div>
          <span className="pill subtle">{orders.length} orders</span>
        </div>

        <div className="statsRow">
          <StatPill label="Total spend" value={`$${totalSpend.toFixed(2)}`} />
          <StatPill label="Paid via" value={mostCommon(orders.map(o => o.payment_method)) || "—"} />
          <StatPill label="Top category" value={mostCommon(orders.map(o => o.category)) || "—"} />
        </div>
      </section>

      <section className="card">
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Category</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Ship to</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_id}>
                  <td className="mono">#{o.order_id}</td>
                  <td>{o.order_date || "—"}</td>
                  <td>{o.category || "—"}</td>
                  <td className="mono">${Number(o.total_price || 0).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${badgeFor(o.status)}`}>{o.status || "—"}</span>
                  </td>
                  <td>{o.payment_method || "—"}</td>
                  <td className="muted">{o.shipping_address || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function TrackingPanel({ tracking, loading, error }) {
  if (loading) return <section className="card">Loading tracking…</section>;
  if (error) return <section className="card danger">Failed to load tracking: {error}</section>;
  if (!tracking?.length) return <section className="card">No tracking records found.</section>;

  return (
    <section className="card">
      <div className="cardHeader">
        <div>
          <div className="cardTitle">Tracking</div>
          <div className="cardHint">Shipments and delivery status per order.</div>
        </div>
        <span className="pill subtle">{tracking.length} records</span>
      </div>

      <div className="timeline">
        {tracking.map((t) => (
          <div key={`${t.order_id}-${t.shipment_id || "na"}`} className="timelineItem">
            <div className="timelineDot" />
            <div className="timelineBody">
              <div className="timelineTop">
                <div className="timelineTitle">
                  Order <span className="mono">#{t.order_id}</span>{" "}
                  <span className={`badge ${badgeFor(t.delivery_status || t.order_status)}`}>
                    {t.delivery_status || t.order_status || "—"}
                  </span>
                </div>
                <div className="muted">{t.order_date || "—"}</div>
              </div>

              <div className="timelineGrid">
                <div className="kv">
                  <div className="label">Carrier</div>
                  <div className="value">{t.carrier_name || "—"}</div>
                </div>
                <div className="kv">
                  <div className="label">Tracking #</div>
                  <div className="value mono">{t.tracking_number || "—"}</div>
                </div>
                <div className="kv">
                  <div className="label">ETA</div>
                  <div className="value">{t.estimated_arrival || "—"}</div>
                </div>
                <div className="kv">
                  <div className="label">Category / Total</div>
                  <div className="value">
                    {t.category || "—"} · <span className="mono">${Number(t.total_price || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {!t.shipment_id ? (
                <div className="hint" style={{ marginTop: 8 }}>
                  No shipment record yet (order exists but shipment not created).
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// helpers
function mostCommon(arr) {
  const m = new Map();
  for (const x of arr) {
    if (!x) continue;
    m.set(x, (m.get(x) || 0) + 1);
  }
  let best = null, bestN = 0;
  for (const [k, v] of m.entries()) {
    if (v > bestN) { best = k; bestN = v; }
  }
  return best;
}

function badgeFor(statusRaw) {
  const s = String(statusRaw || "").toLowerCase();
  if (s.includes("deliver")) return "good";
  if (s.includes("ship") || s.includes("transit")) return "info";
  if (s.includes("process") || s.includes("pending")) return "warn";
  if (s.includes("cancel") || s.includes("fail") || s.includes("error")) return "bad";
  return "subtle";
}

function ProfilePanel({ user, updateField }) {
  return (
    <section className="card">
      <div className="cardHeader">
        <div>
          <div className="cardTitle">User details</div>
          <div className="cardHint">Basic profile information used across the app.</div>
        </div>
        <span className="pill">Editable</span>
      </div>

      <div className="grid">
        <label className="field">
          <div className="label">Name</div>
          <input value={user.name} onChange={(e) => updateField("name", e.target.value)} />
        </label>

        <label className="field">
          <div className="label">Email</div>
          <input value={user.email} onChange={(e) => updateField("email", e.target.value)} />
        </label>

        <label className="field">
          <div className="label">Phone</div>
          <input value={user.phone} onChange={(e) => updateField("phone", e.target.value)} />
        </label>

        <label className="field">
          <div className="label">Country</div>
          <select value={user.country} onChange={(e) => updateField("country", e.target.value)}>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <div className="label">Account created</div>
          <div className="readonly">{user.account_creation_date}</div>
        </div>

        <div className="field">
          <div className="label">User ID</div>
          <div className="readonly">#{user.user_id}</div>
        </div>
      </div>
    </section>
  );
}

function AccountPanel({ user, onReset }) {
  return (
    <>
      <section className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Account</div>
            <div className="cardHint">Security and account metadata.</div>
          </div>
          <span className="pill subtle">Read-only</span>
        </div>

        <div className="twoCol">
          <div className="kv">
            <div className="label">Primary email</div>
            <div className="value">{user.email}</div>
          </div>
          <div className="kv">
            <div className="label">Created</div>
            <div className="value">{user.account_creation_date}</div>
          </div>
        </div>
      </section>

      <section className="card danger">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Danger zone</div>
            <div className="cardHint">Actions here are irreversible.</div>
          </div>
        </div>

        <button className="dangerBtn" onClick={onReset}>
          Reset profile fields
        </button>
      </section>
    </>
  );
}

function PreferencesPanel({ prefs, updatePref }) {
  return (
    <>
      <section className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Preferences</div>
            <div className="cardHint">Personalization & notifications.</div>
          </div>
          <span className="pill">Editable</span>
        </div>

        <div className="grid">
          <label className="field">
            <div className="label">Email notifications</div>
            <select
              value={prefs.email_notifications ? "on" : "off"}
              onChange={(e) => updatePref("email_notifications", e.target.value === "on")}
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </label>

          <label className="field">
            <div className="label">SMS notifications</div>
            <select
              value={prefs.sms_notifications ? "on" : "off"}
              onChange={(e) => updatePref("sms_notifications", e.target.value === "on")}
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </label>

          <label className="field">
            <div className="label">Language</div>
            <select value={prefs.language} onChange={(e) => updatePref("language", e.target.value)}>
              <option value="English">English</option>
              <option value="Chinese">Chinese</option>
              <option value="Spanish">Spanish</option>
            </select>
          </label>

          <label className="field">
            <div className="label">Timezone</div>
            <select value={prefs.timezone} onChange={(e) => updatePref("timezone", e.target.value)}>
              {/* United States */}
              <option value="U.S. ET">U.S. ET</option>
              <option value="U.S. CT">U.S. CT</option>
              <option value="U.S. MT">U.S. MT</option>
              <option value="U.S. PT">U.S. PT</option>

              {/* India */}
              <option value="India/IST">India/IST</option>

              {/* Mexico */}
              <option value="Mexico/CT">Mexico/CT</option>
              <option value="Mexico/PT">Mexico/PT</option>

              {/* France */}
              <option value="France/CET">France/CET</option>

              {/* Germany */}
              <option value="Germany/CET">Germany/CET</option>

              {/* Canada */}
              <option value="Canada/ET">Canada/ET</option>
              <option value="Canada/CT">Canada/CT</option>
              <option value="Canada/MT">Canada/MT</option>
              <option value="Canada/PT">Canada/PT</option>
            </select>
          </label>
        </div>
      </section>
    </>
  );
}

/** ----------------------- App ----------------------- */
export default function App() {
  const initialUser = useMemo(
    () => ({
      user_id: 1,
      name: "Ava Hall",
      email: "thomasjacqueline@gmail.com",
      phone: "+1-996-608-5026",
      account_creation_date: "2024-06-26",
      country: "Mexico",
    }),
    []
  );

  // state
  const [user, setUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState("Profile");
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const [errorMsg, setErrorMsg] = useState("");
  const [prefs, setPrefs] = useState({
    email_notifications: true,
    sms_notifications: false,
    language: "English",
    timezone: "America/Los_Angeles",
  });
  const API_BASE = "http://127.0.0.1:5000";
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [orderUserIds, setOrderUserIds] = useState([]);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  const [tracking, setTracking] = useState([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");


  // helper
  function updatePref(field, value) {
    setPrefs((p) => ({ ...p, [field]: value }));
  }

  function updateField(field, value) {
    setUser((prev) => ({ ...prev, [field]: value }));
  }

  // effect: load user from Flask
  useEffect(() => {
  let cancelled = false;

  async function pickUserWithOrders() {
    try {
      const res = await fetch(`${API_BASE}/api/order-user-ids`);
      if (!res.ok) throw new Error(`GET /api/order-user-ids failed: ${res.status}`);
      const ids = await res.json();
      if (!cancelled) setSelectedUserId(ids?.[0] ?? null);
    } catch (e) {
      if (!cancelled) setErrorMsg(String(e?.message || e));
    }
  }

  pickUserWithOrders();
  return () => { cancelled = true; };
}, []);

  useEffect(() => {
  let cancelled = false;

  async function loadOrderUserIds() {
    try {
      const res = await fetch(`${API_BASE}/api/order-user-ids`);
      if (!res.ok) throw new Error(`GET /api/order-user-ids failed: ${res.status}`);
      const ids = await res.json();

      if (cancelled) return;

      const safeIds = Array.isArray(ids) ? ids.map(Number).filter(Boolean) : [];
      setOrderUserIds(safeIds);

      if (!selectedUserId && safeIds.length) {
        setSelectedUserId(safeIds[0]);
      }
    } catch (e) {
      if (!cancelled) setErrorMsg(String(e?.message || e));
    }
  }

  loadOrderUserIds();
  return () => {
    cancelled = true;
  };
}, []);

  useEffect(() => {
  if (!selectedUserId) return;
  let cancelled = false;

  async function loadUser() {
    try {
      const res = await fetch(`${API_BASE}/api/user/${selectedUserId}`);
      if (!res.ok) throw new Error(`GET /api/user/${selectedUserId} failed: ${res.status}`);
      const data = await res.json();
      if (!cancelled && data && data.user_id) setUser(data);
    } catch (e) {
      if (!cancelled) setErrorMsg(String(e?.message || e));
    }
  }

  loadUser();
  return () => { cancelled = true; };
}, [selectedUserId]);


  useEffect(() => {
  if (!selectedUserId) return;
  let cancelled = false;

  async function loadOrders() {
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const res = await fetch(`${API_BASE}/api/orders?user_id=${selectedUserId}`);
      if (!res.ok) throw new Error(`GET /api/orders failed: ${res.status}`);
      const data = await res.json();
      if (!cancelled) setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      if (!cancelled) setOrdersError(String(e?.message || e));
    } finally {
      if (!cancelled) setOrdersLoading(false);
    }
  }

  async function loadTracking() {
    setTrackingLoading(true);
    setTrackingError("");
    try {
      const res = await fetch(`${API_BASE}/api/tracking?user_id=${selectedUserId}`);
      if (!res.ok) throw new Error(`GET /api/tracking failed: ${res.status}`);
      const data = await res.json();
      if (!cancelled) setTracking(Array.isArray(data) ? data : []);
    } catch (e) {
      if (!cancelled) setTrackingError(String(e?.message || e));
    } finally {
      if (!cancelled) setTrackingLoading(false);
    }
  }

  loadOrders();
  loadTracking();

  return () => { cancelled = true; };
}, [selectedUserId]);

  async function onSave() {
    setStatus("saving");
    setErrorMsg("");

    try {
      const res = await fetch("http://127.0.0.1:5000/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`POST /api/user failed: ${res.status} ${txt}`);
      }

      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1200);
    } catch (e) {
      setStatus("error");
      setErrorMsg(String(e?.message || e));
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  const subtitle =
  activeTab === "Profile"
    ? "Update user information and save changes."
    : activeTab === "Preferences"
    ? "Personalization & notifications."
    : activeTab === "Orders"
    ? "Order history and payment details."
    : "Shipment tracking and delivery status.";


  return (
    <div className="page">
      <div className="shell">
        <aside className="sidebar sidebarWithRobot">
          <div className="sidebarInner">
            <div className="brand">
              <div className="logo" />
              <div>
                <div className="brandTitle">Settings</div>
                <div className="brandSub">User Management</div>
              </div>
            </div>

            <nav className="nav">
              {["Profile", "Preferences", "Orders", "Tracking"].map((t) => (
                <button
                  key={t}
                  className={`navItem ${activeTab === t ? "active" : ""}`}
                  onClick={() => setActiveTab(t)}
                >
                  {t}
                </button>
              ))}
            </nav>
          </div>

          {/* robot image */}
          <img className="robotMark" src="/robot.png" alt="robot" />
        </aside>




        <main className="content">
          <div className="headerRow">
            <div>
              <h1 className="title">{activeTab}</h1>
              <p className="subtitle">{subtitle}</p>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                selectedUserId: {String(selectedUserId)}
              </div>
            </div>

            <div className="toolbar">
              <div className="toolbarGroup">
                <span className="toolbarLabel">User</span>

                <select
                  className="select"
                  value={selectedUserId || ""}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                >
                  {orderUserIds.map((id) => (
                    <option key={id} value={id}>
                      User {id}
                    </option>
                  ))}
                </select>
              </div>

              {activeTab === "Profile" ? (
                <button className="primaryBtn" onClick={onSave} disabled={status === "saving"}>
                  {status === "saving" ? "Saving..." : "Save changes"}
                </button>
              ) : null}
            </div>
          </div>

          {activeTab === "Profile" && <ProfilePanel user={user} updateField={updateField} />}

          {activeTab === "Preferences" && <PreferencesPanel prefs={prefs} updatePref={updatePref} />}

          {activeTab === "Orders" && (
            <OrdersPanel orders={orders} loading={ordersLoading} error={ordersError} />
          )}

          {activeTab === "Tracking" && (
            <TrackingPanel tracking={tracking} loading={trackingLoading} error={trackingError} />
          )}
            

          <div className="statusRow">
            {status === "saved" ? (
              <span className="saved">Saved ✓</span>
            ) : status === "error" ? (
              <span className="saved" style={{ color: "#b91c1c" }}>
                Save failed
              </span>
            ) : (
              <span className="hint">Changes are local for now.</span>
            )}
          </div>

          {errorMsg ? (
            <div style={{ marginTop: 10, color: "#b91c1c", fontSize: 13 }}>
              {errorMsg}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
