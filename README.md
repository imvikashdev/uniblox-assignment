# NestJS E-commerce API Demo

This project implements a backend API for a simple e-commerce store using NestJS, TypeScript, Prisma, and PostgreSQL. It includes functionality for managing shopping carts, processing checkouts, and a discount system where every Nth order generates a single-use discount code.

## Features

- Add items to a user-specific cart (persisted in PostgreSQL).
- Retrieve items currently in a user's cart.
- Checkout items from the cart, creating an order.
- Automatic generation of a 10% discount code after every Nth successful order (configurable via constants).
- Validation and application of active, unused discount codes during checkout.
- Discount codes are single-use and apply to the entire order value.
- Admin endpoints to view statistics and the currently active discount code.
- Database interactions managed via Prisma ORM.
- Input validation using `class-validator` and `class-transformer`.
- Unit tests for services using Jest.

## Technology Stack

- **Backend Framework:** [NestJS](https://nestjs.com/) (Node.js)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Database:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Validation:** `class-validator`, `class-transformer`
- **Testing:** [Jest](https://jestjs.io/)
- **Code Formatting:** Prettier, ESLint

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended, e.g., v20 or v22)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [PostgreSQL](https://www.postgresql.org/download/) server running locally or accessible.
- A tool to interact with PostgreSQL (e.g., `psql`, pgAdmin, DBeaver).

## Setup and Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/imvikashdev/uniblox-assignment.git
    cd uniblox-assignment
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Setup PostgreSQL Database:**

    - Ensure your PostgreSQL server is running.
    - Create a database for this project (e.g., `ecommerce_dev`). You can use a command like:
      ```sql
      CREATE DATABASE ecommerce_dev;
      ```

4.  **Configure Environment Variables:**

    - Create a `.env` file in the project root directory by copying the example file:
      ```bash
      cp .env.example .env
      ```
      _(Note: If `.env.example` doesn't exist, create `.env` manually)_
    - Edit the `.env` file and set the `DATABASE_URL` variable to match your PostgreSQL connection details:
      ```dotenv
      # .env
      # Example: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
      DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/ecommerce_dev?schema=public"
      ```
      **Important:** Replace the user, password, host, port, and database name with your actual credentials. Do **not** commit the `.env` file with real credentials to Git (it should be in your `.gitignore`).

5.  **Run Database Migrations:**

    - This command applies the database schema defined in `prisma/schema.prisma` to your PostgreSQL database.

    ```bash
    npx prisma migrate dev
    ```

    - Prisma will create the necessary tables (`CartItem`, `Order`, `OrderItem`, `DiscountCode`, `AppState`).

6.  **Generate Prisma Client:**
    - Ensure the Prisma client is up-to-date with your schema (usually done by `migrate dev`, but good to run explicitly if needed).
    ```bash
    npx prisma generate
    ```

## Running the Application

- **Development Mode:**

  - Starts the application with hot-reloading.

  ```bash
  npm run start:dev
  # or
  # yarn start:dev
  ```

  - The API will typically be available at `http://localhost:4000` (or the port specified in `src/main.ts`). Check the console output for the exact URL.

- **Production Mode:**
  ```bash
  npm run build
  npm run start:prod
  # or
  # yarn build
  # yarn start:prod
  ```

## Running Tests

- Execute the Jest unit tests:

  ```bash
  npm test
  # or
  # yarn test
  ```

- Run tests in watch mode:

  ```bash
  npm run test:watch
  # or
  # yarn test:watch
  ```

- Run tests with coverage report:
  ```bash
  npm run test:cov
  # or
  # yarn test:cov
  ```

## API Endpoints

**Base URL:** `http://localhost:3000` (default)

---

### Cart

- **`POST /cart`**: Add Item to Cart

  - **Request Body:** `AddToCartDto`
    ```json
    {
      "userId": "string",
      "itemId": "string",
      "name": "string",
      "price": number, // e.g., 19.99
      "quantity": integer // e.g., 1
    }
    ```
  - **Success Response (201 Created):**
    ```json
    {
      "message": "Item added to cart successfully",
      "item": {
        /* CartItem object */
      }
    }
    ```
  - **Error Responses:** `400 Bad Request` (Validation errors)

- **`GET /cart/:userId`**: Get User's Cart
  - **URL Parameter:** `userId` (string)
  - **Success Response (200 OK):**
    ```json
    [
      {
        /* CartItem object */
      },
      {
        /* CartItem object */
      }
    ]
    ```
  - **Error Responses:** `404 Not Found`

---

### Order

- **`POST /order/checkout`**: Checkout Cart
  - **Request Body:** `CheckoutDto`
    ```json
    {
      "userId": "string",
      "discountCode": "string" // Optional
    }
    ```
  - **Success Response (201 Created):**
    ```json
    {
      "message": "Checkout successful!",
      "order": {
        "id": "string",
        "userId": "string",
        "subtotal": "string", // Decimal formatted as string
        "discountCode": "string | null",
        "discountAmount": "string", // Decimal formatted as string
        "total": "string", // Decimal formatted as string
        "createdAt": "string (ISO Date)",
        "items": [
          /* Array of OrderItem objects */
        ]
      }
    }
    ```
  - **Error Responses:**
    - `400 Bad Request` (Validation errors, cart total zero)
    - `404 Not Found` (Cart empty)
    - `500 Internal Server Error` (Transaction failure)

---

### Admin

- **`GET /admin/discount/active`**: Get Active Discount Code

  - **Success Response (200 OK):**
    ```json
    {
      "activeDiscount": { /* DiscountCode object */ }
    }
    // or if none is active:
    {
      "activeDiscount": null
    }
    ```

- **`GET /admin/stats`**: Get Store Statistics
  - **Success Response (200 OK):**
    ```json
    {
      "totalOrders": number,
      "totalItemsPurchased": number,
      "totalPurchaseAmount": "string", // Decimal formatted as string
      "discountCodesGenerated": [ /* Array of DiscountCode objects */ ],
      "discountCodesUsed": [ /* Array of DiscountCode objects */ ],
      "totalDiscountAmount": "string" // Decimal formatted as string
    }
    ```

---

## Database Schema Overview

- **`CartItem`**: Stores items currently in users' carts. Unique constraint on `(userId, itemId)`.
- **`Order`**: Represents a completed order, including totals and applied discount info.
- **`OrderItem`**: Represents individual items within a completed order, storing price/quantity at the time of purchase. Linked to `Order`.
- **`DiscountCode`**: Stores generated discount codes, their percentage, and their status (`isActive`, `isUsed`). Only one code should be active at a time.
- **`AppState`**: A singleton table (only one row) used to track the global `orderCount` for determining the Nth order.

## Notes & Assumptions

- **Authentication/Users:** This API does not implement user authentication. It relies on a `userId` string passed in requests. In a real application, this would be handled via proper authentication (e.g., JWT).
- **Error Handling:** Basic error handling is implemented. More specific error types and messages could be added.
- **Configuration:** Constants like `NTH_ORDER_FOR_DISCOUNT` and `DISCOUNT_PERCENTAGE` are hardcoded. In a real app, these should come from a configuration module (e.g., using `@nestjs/config`).
- **Discount Code Generation:** Uses `short-unique-id` for slightly nicer codes than UUIDs. Uniqueness relies on the library's randomness and the database unique constraint.
