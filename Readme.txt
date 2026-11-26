TECHHUB SHOP — SETUP AND EVALUATION GUIDE
Node.js Web Programming Project (502070)
Updated: November 26, 2026
============================================================

1. RUNNING THE APPLICATION

Requirements: Docker Desktop and Docker Compose v2. Open PowerShell in the
project root. If you do not already have a local .env file, create one from the
example:

    Copy-Item .env.example .env

Then build and start the application:

    docker compose up -d --build

Docker builds the images and installs dependencies. No host npm install is
required. On the first startup, wait for PostgreSQL, migrations, seed data,
Redis, Elasticsearch, the frontend, both backend replicas, and Nginx to start.
Check their status with:

    docker compose ps

Local URLs:

    Store:       http://localhost:8080
    Admin:       http://localhost:8080/admin
    API health:  http://localhost:8080/api/health

The project is not currently deployed to a public URL. The default local HTTP
port is 8080. If you change the published port in docker-compose.yml, update
BASE_URL and any OAuth or payment callback URLs to match.

2. SAMPLE ACCOUNTS

Default Compose credentials (unless overridden in .env):

    Admin:     admin@techhub.local / Admin123!ChangeMe
    Customer:  minh.nguyen@example.com / Customer123!ChangeMe
    Customer:  linh.tran@example.com / Customer123!ChangeMe
    Customer:  khoa.le@example.com / Customer123!ChangeMe

SEED_CUSTOMER_EMAIL and SEED_CUSTOMER_PASSWORD in .env can set the primary
sample customer account. SEED_CUSTOMER_EMAIL must be different from
ADMIN_EMAIL. The seed task updates the password for existing sample customer
accounts when it runs. ADMIN_PASSWORD must contain at least 12 characters.
Use these sample credentials only in a local development environment.

3. OPTIONAL SERVICE CONFIGURATION

Google and Facebook sign-in require their respective client ID and secret.
Register these OAuth callback URLs with each provider:

    http://localhost:8080/api/auth/google/callback
    http://localhost:8080/api/auth/facebook/callback

Real email delivery requires SMTP_HOST, SMTP_PORT, SMTP_USER,
SMTP_PASSWORD, and SMTP_FROM in .env. For Gmail, use an app password. Keep
credentials in .env; do not commit them. Without SMTP configuration, password
reset links are logged in development mode and email delivery is unavailable.

VNPay sandbox checkout uses VNPAY_TMN_CODE, VNPAY_HASH_SECRET, VNPAY_URL, and
VNPAY_RETURN_URL. Configure sandbox credentials in .env. The default return
URL is http://localhost:8080/api/checkout/vnpay-return. For a remote sandbox
IPN callback, configure a publicly reachable URL for
/api/checkout/vnpay-ipn; localhost cannot receive callbacks from VNPay.

4. APPLICATION FEATURES

TechHub is a computer and components shop. It includes product catalog,
search, filtering, sorting and pagination; product details and variants;
customer accounts and shipping addresses; guest and signed-in shopping carts;
discounts and loyalty points; tax and shipping calculations; COD and VNPay
sandbox checkout; order history; product reviews and comments; and an admin
dashboard. Feature descriptions and diagrams are in Bonus/README.md. A demo
outline is in Bonus/demo-script.md.

5. SCALING AND SEARCH CONFIGURATION

- Nginx distributes API traffic between two Express backend replicas.
- Redis stores shared sessions and supports the Socket.IO adapter.
- Elasticsearch provides catalog full-text search. The application falls
  back to PostgreSQL search when Elasticsearch is unavailable.
- GitHub Actions includes source and Compose checks and a workflow for
  publishing Docker images to GHCR.

These describe the repository configuration. Provide current run logs,
screenshots, or other evidence when claiming deployment or evaluation results.

6. KNOWN LIMITATIONS AND SUBMISSION EVIDENCE

- VNPay integration is for sandbox testing only; no production payment
  credentials or live payment processing are included.
- The admin dashboard does not provide category create, edit, or delete
  operations.
- Analytics does not yet include time-series counts or product-type breakdowns
  for sold items.
- Seed product images are placeholders. Replace them with real product images
  before recording a demonstration.
- A public deployment URL, demo.mp4, and screenshots documenting team
  collaboration are not included. Add genuine evidence before submission.
- Teamwork screenshots should show at least one month of project activity and
  the required contribution frequency for each member.

7. PROJECT FILES

    src/                 Node.js API, routes, controllers, and services
    frontend/            Frontend server, views, styles, and browser scripts
    db/                  PostgreSQL schema and database documentation
    docker-compose.yml   Local multi-container setup
    Bonus/               Feature notes, diagrams, and submission checklist
    git/                 Location for genuine collaboration screenshots
    Readme.txt           This setup and evaluation guide

Do not include .env files, secrets, tokens, sensitive logs, or database
volumes in the submission package.

To remove local database and other Compose data volumes and initialize the
seed data from scratch, run:

    docker compose down -v
    docker compose up -d --build

The -v option permanently removes PostgreSQL data, including accounts and
orders. Omit it when you need to preserve existing data.
