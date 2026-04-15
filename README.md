# 🌿 Ayufresh — Botanical Oral Care Website

A full-stack, multi-page website for Ayufresh Botanical Oral Care product.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure email (optional — edit .env file)
#    Set EMAIL_USER, EMAIL_PASS, EMAIL_TO with your Gmail + App Password
#    Orders will be saved to database regardless of email config

# 3. Start the server
npm start

# 4. Open in browser
# Website:  http://localhost:3000
# Admin:    http://localhost:3000/admin
```

## 📁 Project Structure

```
ayufresh/
├── server.js              # Express server + API + SQLite database
├── .env                   # Email & admin config (edit this!)
├── package.json
├── ayufresh.db            # Auto-created SQLite database
├── public/
│   ├── css/styles.css     # Shared global styles (#e5d6c4 theme)
│   ├── js/main.js         # Shared JavaScript (nav, scroll, particles)
│   └── images/
│       ├── logo.png
│       └── product.jpeg
└── views/
    ├── index.html         # Home page (hero, benefits, ingredients, testimonials)
    ├── about.html         # About page (story, mission, values)
    ├── contact.html       # Contact page (form → database + email)
    ├── order.html         # Order page (form → database + email to you)
    ├── order-success.html # Order confirmation page
    └── admin.html         # Admin dashboard (orders, contacts, stats)
```

## 📄 Pages

| URL | Page |
|-----|------|
| `/` | Home — Hero, benefits, ingredients, how-to-use, testimonials |
| `/about` | About — Brand story, mission, values |
| `/contact` | Contact — Contact form (saved to DB + emailed to you) |
| `/order` | Order — Full order form with quantity selector |
| `/order-success` | Order confirmation with Order ID |
| `/admin` | Admin dashboard (password protected) |

## 🔌 API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/orders` | Place a new order |
| POST | `/api/contacts` | Submit contact form |
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/orders` | List all orders |
| PATCH | `/api/admin/orders/:id` | Update order status |
| DELETE | `/api/admin/orders/:id` | Delete an order |
| GET | `/api/admin/contacts` | List all contact messages |
| PATCH | `/api/admin/contacts/:id/read` | Mark message as read |
| GET | `/api/admin/stats` | Dashboard statistics |

## 📧 Email Notifications

When a customer places an order, you receive a **beautifully formatted email** with:
- Order ID, customer name, phone, email
- Full delivery address
- Quantity, payment method, total amount

### Setup Gmail:
1. Go to https://myaccount.google.com/apppasswords
2. Generate an App Password
3. Edit `.env` file:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-char-app-password
   EMAIL_TO=your-email@gmail.com
   ```

## 🔐 Admin Dashboard

- **URL:** `/admin`
- **Default password:** `ayufresh2026` (change in `.env`)
- **Features:**
  - View all orders with status management
  - Update order status (Pending → Confirmed → Shipped → Delivered)
  - Delete orders
  - View contact form submissions
  - Mark messages as read
  - Dashboard stats (total orders, revenue, pending, unread)

## 🎨 Theme Colors

The entire site uses `#e5d6c4` as the primary theme:
- Sand: `#e5d6c4` (primary)
- Bark: `#3d2c1e` (dark accent)
- Cream: `#faf7f2` (background)
- Gold: `#c4a55a` (highlight)

## 🌐 Deployment

Works with any Node.js hosting:
- **Railway** — Push to GitHub → Connect → Deploy
- **Render** — Connect repo → Auto-deploy
- **DigitalOcean** — Droplet + PM2
- **VPS** — `npm install && npm start` with PM2

## 📱 Responsive

Fully responsive on mobile, tablet, and desktop with:
- Hamburger mobile navigation
- Stacked layouts on small screens
- Touch-friendly forms and buttons
