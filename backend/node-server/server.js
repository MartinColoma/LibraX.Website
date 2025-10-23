// server/server.js
import express from "express";
import cors from "cors";
import userRoutes from "./routes/users.js";
import "./db.js"; // 👈 Import the DB config so it connects

const app = express();

app.use(cors());
app.use(express.json());
app.use(userRoutes);

const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
import bcrypt from "bcrypt";

//bcrypt hash compare
// const plain = "b802a766";
// const hash = "$2b$10$DnmJYsSzr/JZd6eH72EpF.7olcf5JSRAMdGE/DgzLdFF.HRvzLwVa";

// const match = await bcrypt.compare(plain, hash);
// console.log(match); // true or false
