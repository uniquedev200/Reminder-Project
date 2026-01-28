# Email Keyword Reminder App

A web-based reminder application that automatically retrieves emails, detects important keywords (such as submission deadlines and important links), stores them, displays them in a frontend PWA(Progressive Web App), and sends push notifications when new emails matching the criteria are found.

---

## Features

- Keyword-based email detection (e.g., deadlines, submissions)
- Hourly email checking using cron jobs
- PostgreSQL database for storing parsed emails
- Web Push Notifications for newly detected emails
- Frontend dashboard to view saved reminders
- Service Worker support for background notifications
- Duplicate detection to avoid repeated notifications
- Progressive Web App (PWA) support with install capability

---

## Tech Stack

### Backend
- Node.js
- Express
- node-cron for scheduled hourly email checks
- PostgreSQL for persistent storage
- Email retrieval and parsing (IMAP + mail parsing)
- web-push for browser push notifications

### Frontend
- HTML and CSS
- Vanilla JavaScript
- Service Worker for push notifications
- manifest.json for PWA configuration
- Frontend served using the Express server

---

## How It Works

1. A cron job runs every hour on the backend.
2. The server connects to the email inbox and retrieves recent emails.
3. Email content is parsed and checked for predefined important keywords.
4. Newly matched emails are stored in PostgreSQL.
5. If the email is not already present in the database, a web push notification is sent.
6. The Express server serves the frontend assets.
7. The frontend fetches stored emails and displays them as reminders.

---

## Push Notification Logic

- Notifications are triggered only when new emails are detected.
- Emails already stored in the database are not re-notified.
- Notification handling is performed directly within the cron job logic.

---

## API Routes

### GET /fetch
Fetches all stored reminder emails for display in the frontend.

### POST /subscribe
Stores push subscription details sent from the frontend.

---

## Frontend Overview

- `app.js`
  - Fetches stored emails from the backend
  - Registers the service worker
  - Sends push subscription data to the `/subscribe` route

- `service-worker.js`
  - Handles push events
  - Displays notifications even when the application is closed

- `manifest.json`
  - Enables PWA functionality
  - Allows the app to be installed on mobile devices

---

## Database

- PostgreSQL is used to store:
  - Email sender, subject, and date
  - Parsed email content
  - subscriptions
- Duplicate checks prevent re-inserting existing emails.

---

## Conclusion

This application is a simple automation for retrieving important email periodically, storing them to view later and also notifying user when new emails are found.The frontend is a PWA which provides hass
le-free and browser-less experience when installed