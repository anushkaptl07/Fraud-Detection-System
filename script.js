// Constants and configurations
const HIGH_AMOUNT_THRESHOLD = 10000;
const RAPID_TRANSACTION_INTERVAL = 10000; // 10 seconds

// Store data in memory
let transactions = [];
let alerts = [];
const userLocations = {};
const seenTransactions = new Set();
const lastUserTransactions = {};

// Show/hide sections with animation
function showSection(sectionId) {
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
    section.style.display = "none";
  });
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.remove("active");
  });

  const targetSection = document.getElementById(sectionId);
  const targetButton = document.querySelector(
    `button[onclick="showSection('${sectionId}')"]`
  );

  void targetSection.offsetWidth;

  targetSection.style.display = "block";
  targetSection.classList.add("active");
  targetButton.classList.add("active");
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date
function formatDate(timestamp) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(timestamp));
}

// Add new transaction with enhanced fraud detection
function addTransaction(event) {
  event.preventDefault();
  const form = event.target;
  const txnId = form.querySelector("#txn-id").value;
  const userId = form.querySelector("#user-id").value;
  const amount = parseFloat(form.querySelector("#amount").value);
  const location = form.querySelector("#location").value;
  const timestamp = Date.now();

  // Validate transaction ID format
  if (!txnId.match(/^TXN\d{3,}$/)) {
    showNotification(
      "Transaction ID must start with TXN followed by at least 3 numbers",
      "error"
    );
    return;
  }

  // Validate user ID format
  if (!userId.match(/^USER\d{3,}$/)) {
    showNotification(
      "User ID must start with USER followed by at least 3 numbers",
      "error"
    );
    return;
  }

  // Enhanced fraud detection checks
  const fraudChecks = performFraudChecks({
    txnId,
    userId,
    amount,
    location,
    timestamp,
  });

  // Process alerts from fraud checks
  fraudChecks.forEach((alert) => {
    createAlert(alert.type, alert.message);
  });

  // Add transaction to history
  const transaction = { txnId, userId, amount, location, timestamp };
  transactions.push(transaction);

  updateDashboard();
  updateTables();
  showNotification("Transaction added successfully", "success");
  form.reset();
}

// Perform comprehensive fraud checks
function performFraudChecks(transaction) {
  const alerts = [];

  // Check for duplicate transaction
  if (seenTransactions.has(transaction.txnId)) {
    alerts.push({
      type: "duplicate",
      message: `Duplicate transaction detected: ${transaction.txnId}`,
    });
    return alerts; // Stop processing if duplicate
  }
  seenTransactions.add(transaction.txnId);

  // Check for location change
  if (
    userLocations[transaction.userId] &&
    userLocations[transaction.userId] !== transaction.location
  ) {
    alerts.push({
      type: "location",
      message: `Location change for user ${transaction.userId} from ${
        userLocations[transaction.userId]
      } to ${transaction.location}`,
    });
  }
  userLocations[transaction.userId] = transaction.location;

  // Check for high amount
  if (transaction.amount > HIGH_AMOUNT_THRESHOLD) {
    alerts.push({
      type: "amount",
      message: `High-risk transaction (${formatCurrency(
        transaction.amount
      )}) by ${transaction.userId}`,
    });
  }

  // Check for rapid transactions
  const lastTxnTime = lastUserTransactions[transaction.userId];
  if (
    lastTxnTime &&
    transaction.timestamp - lastTxnTime < RAPID_TRANSACTION_INTERVAL
  ) {
    alerts.push({
      type: "time",
      message: `Rapid transactions detected for user ${transaction.userId}`,
    });
  }
  lastUserTransactions[transaction.userId] = transaction.timestamp;

  // Add suspicious user tracking
  const userTransactionCount = transactions.filter(
    (t) => t.userId === transaction.userId
  ).length;
  if (userTransactionCount >= 5) {
    alerts.push({
      type: "frequency",
      message: `High transaction frequency for user ${transaction.userId}`,
    });
  }

  return alerts;
}

// Create new alert with enhanced visualization
function createAlert(type, message) {
  const alert = { type, message, timestamp: Date.now() };
  alerts.push(alert);
  updateAlerts();

  // Update high-risk section if applicable
  if (type === "amount" || type === "frequency") {
    updateHighRiskSection();
  }
}

// Show notification with improved styling
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  void notification.offsetWidth;

  notification.style.opacity = "1";
  notification.style.transform = "translateY(0)";

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateY(-100%)";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Update dashboard with animated counters
function updateDashboard() {
  const stats = {
    "total-transactions": transactions.length,
    "active-alerts": alerts.length,
    "monitored-users": new Set(transactions.map((t) => t.userId)).size,
    "high-risk-cases": transactions.filter(
      (t) => t.amount > HIGH_AMOUNT_THRESHOLD
    ).length,
  };

  for (const [id, value] of Object.entries(stats)) {
    const element = document.getElementById(id);
    const currentValue = parseInt(element.textContent);
    animateNumber(element, currentValue, value);
  }
}

// Animate number changes with smooth transitions
function animateNumber(element, start, end) {
  const duration = 1000;
  const steps = 60;
  const increment = (end - start) / steps;
  let current = start;
  let step = 0;

  const animate = () => {
    current += increment;
    step++;

    element.textContent = Math.round(current);

    if (step < steps) {
      requestAnimationFrame(animate);
    } else {
      element.textContent = end;
    }
  };

  requestAnimationFrame(animate);
}

// Update transaction tables with enhanced formatting
function updateTables() {
  // Recent transactions (last 5)
  updateTable("#recent-transactions tbody", transactions.slice(-5).reverse());

  // All transactions
  updateTable("#all-transactions-table tbody", [...transactions].reverse());

  // Update high-risk section
  updateHighRiskSection();
}

// Update specific table with improved formatting
function updateTable(selector, data, isHighRisk = false) {
  const tbody = document.querySelector(selector);
  tbody.innerHTML = data
    .map(
      (t) => `
        <tr class="${isHighRisk ? "high-risk-row" : ""}">
            <td>${t.txnId}</td>
            <td>${t.userId}</td>
            <td>${formatCurrency(t.amount)}</td>
            <td>${t.location}</td>
            <td>${formatDate(t.timestamp)}</td>
            ${isHighRisk ? `<td>${getHighRiskFactors(t)}</td>` : ""}
        </tr>
    `
    )
    .join("");
}

// Get high risk factors for a transaction
function getHighRiskFactors(transaction) {
  const factors = [];
  if (transaction.amount > HIGH_AMOUNT_THRESHOLD) factors.push("High Amount");
  if (userLocations[transaction.userId] !== transaction.location)
    factors.push("Location Change");
  const userTxnCount = transactions.filter(
    (t) => t.userId === transaction.userId
  ).length;
  if (userTxnCount >= 5) factors.push("High Frequency");
  return factors.join(", ") || "None";
}

// Update high risk section with detailed analysis
function updateHighRiskSection() {
  const highRiskTransactions = transactions.filter(
    (t) =>
      t.amount > HIGH_AMOUNT_THRESHOLD ||
      getHighRiskFactors(t).includes("Location Change") ||
      getHighRiskFactors(t).includes("High Frequency")
  );

  updateTable("#high-risk-table tbody", highRiskTransactions, true);
}

// Update alerts with enhanced visualization
function updateAlerts() {
  const alertsContainer = document.getElementById("alerts-container");
  alertsContainer.innerHTML = alerts
    .slice(-5)
    .reverse()
    .map(
      (alert) => `
        <div class="alert">
            <div class="alert-icon ${getAlertTypeClass(alert.type)}">⚠️</div>
            <div class="alert-content">
                <h4>${alert.message}</h4>
                <p>${formatDate(alert.timestamp)}</p>
            </div>
        </div>
    `
    )
    .join("");
}

// Get CSS class for alert type
function getAlertTypeClass(type) {
  switch (type) {
    case "amount":
      return "amount-high";
    case "location":
      return "location-change";
    case "time":
      return "time-anomaly";
    case "frequency":
      return "frequency-high";
    case "duplicate":
      return "duplicate-alert";
    default:
      return "";
  }
}

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", () => {
  updateDashboard();
  updateTables();
  updateAlerts();
});
