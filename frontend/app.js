const PUBLIC_VAPID_KEY = "BInib05drJ4YZ8ypMC9Q00Nl8V5Ext9UBLmgX3SpTvzS8zIeu9794972lbcwEodewvoRQOfqMv_2uE2HWmtWm3w";

const subscribeBtn = document.getElementById("subscribeBtn");
const refreshBtn = document.getElementById("refreshBtn");
const emailsDiv = document.getElementById("emails");

async function registerSW() {
  if (!("serviceWorker" in navigator)) {
    alert("Service workers not supported");
    return;
  }
  return navigator.serviceWorker.register("/sw.js");
}


async function subscribe() {
  const reg = await registerSW();

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
  });

  await fetch(`/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription })
  });

  alert("Push notifications enabled ✅");
}


async function fetchEmails() {
  emailsDiv.innerHTML = "Loading...";
  const res = await fetch(`/fetch`);
  const data = await res.json();

  emailsDiv.innerHTML = "";

  data.emails.forEach(row => {
    const email = row.email;

    const div = document.createElement("div");
    div.className = "email";
    div.innerHTML = `
      <h3>${email.subject || "No Subject"}</h3>
      <small>${email.from || ""} • ${new Date(email.date).toLocaleString()}</small>
      <p>${(email.text || "").slice(0, 200)}</p>
    `;
    emailsDiv.appendChild(div);
  });
}

subscribeBtn.onclick = subscribe;
refreshBtn.onclick = fetchEmails;


function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}


fetchEmails();
