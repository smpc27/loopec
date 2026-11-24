# Google Cloud SQL (PostgreSQL) Setup Guide for LOOPEC

This guide explains how to provision, configure, and connect a **Google Cloud SQL for PostgreSQL** instance for the LOOPEC campus peer-to-peer exchange platform.

---

## 1. Quick Provisioning via Google Cloud CLI (`gcloud`)

Run the following commands in Google Cloud Shell or your local terminal with the `gcloud` CLI installed:

### Step 1: Set Your Google Cloud Project
```bash
gcloud config set project YOUR_GCP_PROJECT_ID
```

### Step 2: Enable the Cloud SQL Admin API
```bash
gcloud services enable sqladmin.googleapis.com
```

### Step 3: Create the PostgreSQL Instance in India (`asia-south1` - Mumbai)
```bash
gcloud sql instances create loopec-db \
    --database-version=POSTGRES_15 \
    --region=asia-south1 \
    --tier=db-custom-1-3840 \
    --storage-type=SSD \
    --storage-size=10GB \
    --storage-auto-increase \
    --backup \
    --root-password="YOUR_SECURE_PASSWORD"
```

> **Note:** For free tier / low cost testing, you can use `--tier=db-f1-micro`. For production campus traffic, `--tier=db-custom-1-3840` is recommended.

### Step 4: Create the LOOPEC Database
```bash
gcloud sql databases create loopec --instance=loopec-db
```

### Step 5: Create the Application User
```bash
gcloud sql users create loopec_admin \
    --instance=loopec-db \
    --password="YOUR_USER_PASSWORD"
```

---

## 2. Applying LOOPEC's Complete Schema to Google Cloud SQL

Connect to your instance using the Cloud SQL Auth Proxy or `psql`:

```bash
# Connect using gcloud
gcloud sql connect loopec-db --user=postgres --database=loopec
```

Run the migration scripts in order:
1. `supabase/migrations/20261107000000_initial_schema.sql` (Tables, RLS, triggers, indexes, initial seed data)
2. `supabase/operations/apply_pending_migrations.sql` (Pickup locations, action rate limits, online payments, live auto-approval)

---

## 3. Connecting LOOPEC to Google Cloud SQL

### Option A: Direct PostgreSQL Connection (`DATABASE_URL`)
Add your Cloud SQL public IP or connection string to your environment variables (`.env.local` and Vercel):
```env
DATABASE_URL="postgresql://loopec_admin:YOUR_USER_PASSWORD@INSTANCE_PUBLIC_IP:5432/loopec?sslmode=require"
```

### Option B: Cloud SQL Auth Proxy (Recommended for Vercel / Cloud Run)
Run the proxy locally or attach the service account credentials:
```bash
./cloud-sql-proxy YOUR_GCP_PROJECT_ID:asia-south1:loopec-db
```

---

## 4. Verification Checklist
- [x] Products submitted for sale are automatically approved and live on the marketplace.
- [x] NIT Calicut pickup points (SAC, Mega Mess, Central Library, MBH, LH) seeded.
- [x] All 20+ tables (products, orders, wishlists, reviews, notifications, payments) intact.
