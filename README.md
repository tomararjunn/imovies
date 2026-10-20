# iMovies: Movie Ticket Booking (MERN)

Movie ticket booking made simple. Users browse movies, pick a show and seats, pay, and get an e-ticket.
Admins manage movies, theatres, shows and bookings.

**Stack:** MongoDB, Express.js, React (Vite), Node.js, JWT, Bootstrap + SCSS

## Features
- User and admin registration/login (JWT, bcrypt, role-based routes)
- Movie list with search and filters (genre, language, rating, theatre, location, date)
- Movie details, favorites, reviews and ratings
- Show timings and live seat map; seats are held for 5 minutes while paying
- Double-booking prevention (atomic seat locking in MongoDB)
- Payment flow with Razorpay (test mode built in), booking confirmation, cancellation with refund
- Booking history with printable e-ticket
- Email confirmation, cancellation and show reminders (node-cron)
- Admin dashboard: revenue charts, movie / theatre / show management, booking list, review moderation
- Rate limiting, input sanitizing, central error handling, pagination, database indexes

## Project structure
```
imovies/
├── client/   React + Vite frontend
└── server/   Express API (models, controllers, routes, middlewares, utils)
```

## Setup

### 1. Server
```bash
cd server
npm install
cp .env.example .env      # Windows: copy .env.example .env
# edit .env: set MONGO_URI (local MongoDB or Atlas) and JWT_SECRET
npm run dev               # http://localhost:3000
```

### 2. Client
```bash
cd client
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev               # http://localhost:5173
```

### 3. Sample data (optional)
Add a free TMDB key as `TMDB_API_KEY` in `server/.env`, then:
```bash
cd server
node scripts/seedMovies.js
```
This adds real movies with posters, 4 theatres and shows for the next 5 days.

### Test accounts
Register through the app: `/register` for a user, `/admin/register` for an admin.

## Payments
With empty Razorpay keys the app uses a **test gateway** (no real money; there is a "Simulate failed payment" button).
Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to use real Razorpay checkout in test mode.

## API overview
| Base path | Purpose |
|---|---|
| `/api/auth` | User register, login, profile |
| `/api/auth/admin` | Admin register, login, stats, users |
| `/api/movie` | Movie CRUD, search and filters |
| `/api/theatre` | Theatre CRUD |
| `/api/shows` | Show CRUD, seat map |
| `/api/bookings` | Lock seats, checkout, confirm, cancel, history, admin list and report |
| `/api/favorite` | Favorites |
| `/api/review` | Reviews and moderation |

## Credits
Movie data and posters from [TMDB](https://www.themoviedb.org). This product uses the TMDB API but is not endorsed or certified by TMDB.