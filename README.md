# 📦 My Shop Management API

Welcome to your **Shop Management System** built with **Node.js**, **Express**, and **MongoDB** — perfect for tracking purchases, sales, stock levels, and summary reports.

---

## 🚀 Features

* 🔐 Secret-protected delete-all endpoint
* 🔄 Case-insensitive product system (e.g., `Chair`, `chair`, `CHAIR` = same)
* 🔢 Auto-generated product serial number starting from `1`
* 📦 Track purchases, sales, stock quantity, and summary
* 📁 MongoDB with Mongoose schema models

---

## ⚙️ Setup

1. **Clone or Remix Project**
2. Create `.env` file:

```env
MONGO_URI=mongodb+srv://your-user:your-pass@cluster.mongodb.net/inventory
```

3. Create a `CRX.txt` file and add your secret key:

```
mysecret123
```

4. Install packages:

```bash
npm install
```

5. Start the server:

```bash
node index.js
```

---

## 📂 API Endpoints (GET)

### ➕ Add Product

```http
/api/add-product?name=Chair
```

* Creates new product with serial number
* Case-insensitive check to avoid duplicates

### 📥 Purchase Entry

```http
/api/purchase?name=chair&qty=10&price=500
```

### 📤 Sales Entry

```http
/api/sales?name=chair&qty=3
```

### 📊 Stock Report (All Products)

```http
/api/stock
```

### 📦 Stock for One Product

```http
/api/stock?name=chair
```

### 📄 Product Summary (All)

```http
/api/product-summary
```

### 🔥 Delete All Data (with secret)

```http
/api/delete-all?secret=mysecret123
```

> ⚠️ Be careful! This will delete everything from products, purchases, and sales collections.
----
## 📘 Example Product Document

```json
{
  "_id": "1",
  "name": "chair",
  "serial": 1,
  "__v": 0
}
```

You may hide `__v` using:

```js
mongoose.set('versionKey', false);
```

---

## 💡 Tips

* Use `app.set('json spaces', 2)` to pretty-print JSON
* MongoDB Atlas IP Whitelist must include `0.0.0.0/0`
* Always keep your `MONGO_URI` and `CRX.txt` secret 🔐

---

## 🧑‍💻 Author

Made with ❤️ **TANVIR 6X**
