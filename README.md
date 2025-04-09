# Vendor Order System

A robust e-commerce platform built with NestJS that manages vendors, products, and customers in a centralized system.

## Overview

This application provides a complete backend solution for an e-commerce platform where:

- Vendors can list and manage their products
- Customers can browse products and place orders
- Admins have full control over the platform

## Features

- **User Management**: Register and authenticate users with role-based access (Customer, Vendor, Admin)
- **Product Management**: Create, update, list, and delete products with inventory tracking
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
- MongoDB instance (local or remote)

### Environment Variables

Create a [`.env`](.env ) file in the root directory with:
```bash
MONGODB_URI=mongodb://localhost:27017/vendor-order-system JWT_SECRET=your_jwt_secret_key JWT_EXPIRATION=24h PORT=3000
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

API Endpoints
Authentication
POST /auth/signup - Register a new user
POST /auth/login - User login
Users
GET /users - Get all users (Admin only)
GET /users/:id - Get user by ID (Admin only)
PATCH /users/:id - Update user (Admin only)
DELETE /users/:id - Delete user (Admin only)
Products
GET /products - Get all products
GET /products/:id - Get product by ID
POST /products - Create product (Vendor only)
PATCH /products/:id - Update product (Vendor or Admin)
DELETE /products/:id - Delete product (Vendor or Admin)
GET /products/vendor/:vendorId - Get products by vendor
GET /products/inventory/low-stock - Get low stock products (Vendor only)

Project Structure
src/
├── auth/             # Authentication module
├── products/         # Products module
├── users/            # Users module
├── app.controller.ts
├── app.module.ts
├── app.service.ts
└── main.ts