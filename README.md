# Vendor Order System

A robust e-commerce platform built with NestJS that manages vendors, products, and customers in a centralized system.

## Overview

This application provides a complete backend solution for an e-commerce platform where:

- Vendors can list and manage their products
- Customers can browse products and place orders
- Admins have full control over the platform
- Orders are automatically split by vendor
- Analytics provide insights on sales and inventory

## Features

- **User Management**: Register and authenticate users with role-based access (Customer, Vendor, Admin)
- **Product Management**: Create, update, list, and delete products with inventory tracking
- **Order Processing**: Multi-vendor order placement with automatic order splitting
- **Transaction Safety**: MongoDB transactions for stock updates during order placement
- **Analytics**: Revenue tracking, product performance, and inventory insights
- **Authentication**: JWT-based secure authentication and authorization
- **Role-based Access Control**: Different permissions for customers, vendors, and admins

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT using Passport.js
- **Validation**: Class-validator and class-transformer
- **Password Security**: bcryptjs for password hashing

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB instance configured as a replica set (required for transactions)

### MongoDB Setup

To enable transactions, MongoDB must be run as a replica set:

```bash
# Create data directory
mkdir -p ~/data/rs0-0

# Start MongoDB with replica set
mongod --replSet rs0 --dbpath ~/data/rs0-0 --port 27017

# In another terminal, initialize the replica set
mongosh
> rs.initiate({_id: "rs0", members: [{_id: 0, host: "localhost:27017"}]})
```

### Environment Variables

Create a [`.env`](.env ) file in the root directory with:
```bash
MONGODB_URI=mongodb://localhost:27017/vendor-order-system?replicaSet=rs0
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=24h
PORT=3000
```

### Installation

```bash
# Install dependencies
$ npm install

# Development mode
$ npm run start:dev

# Production build
$ npm run build
$ npm run start:prod
```

## API Endpoints

### Authentication
- `POST /auth/signup` - Register a new user
- `POST /auth/login` - User login

### Users
- `GET /users` - Get all users (Admin only)
- `GET /users/:id` - Get user by ID (Admin only)
- `PATCH /users/:id` - Update user (Admin only)
- `DELETE /users/:id` - Delete user (Admin only)

### Products
- `GET /products` - Get all products
- `GET /products/:id` - Get product by ID
- `POST /products` - Create product (Vendor only)
- `PATCH /products/:id` - Update product (Vendor or Admin)
- `DELETE /products/:id` - Delete product (Vendor or Admin)
- `GET /products/vendor/:vendorId` - Get products by vendor
- `GET /products/inventory/low-stock` - Get low stock products (Vendor only)

### Orders
- `POST /orders` - Place a new order (Customer only)
- `GET /orders` - Get orders (filtered based on user role)
- `GET /orders/:id` -  Get order by ID
- `PATCH /orders/:id/status` - Update order status (Vendor or Admin)

### Analytics
- `GET /analytics/admin/revenue-per-vendor` -  Get revenue per vendor (Admin only)
- `GET /analytics/admin/top-products` - Get top selling products (Admin only)
- `GET /analytics/admin/average-order-value` - Get average order value (Admin only)
- `GET /analytics/vendor/daily-sales` - Get vendor's daily sales (Vendor only)
- `GET /analytics/vendor/low-stock` - Get vendor's low stock items (Vendor only)

## Project Structure
```bash
src/
├── analytics/        # Analytics module
│   ├── controllers/
│   ├── dto/
│   ├── interfaces/
│   └── services/
├── auth/             # Authentication module
│   ├── controllers/
│   ├── dto/
│   ├── guards/
│   ├── strategies/
│   └── services/
├── orders/           # Orders module
│   ├── controllers/
│   ├── dto/
│   ├── schemas/
│   └── services/
├── products/         # Products module
│   ├── controllers/
│   ├── dto/
│   ├── schemas/
│   └── services/
├── users/            # Users module
│   ├── controllers/
│   ├── dto/
│   ├── schemas/
│   └── services/
├── app.controller.ts
├── app.module.ts
├── app.service.ts
└── main.ts
```
