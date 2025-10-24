// server/server.js
import express from "express";
import cors from "cors";
import userRoutes from "./local_postgre/routes/users.js";
import supabaseUserRoutes from "./supabase/routes/supabase_users.js";
import "./local_postgre/db.js"; 
import "./supabase/supa_db.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use(userRoutes);          // local database routes
app.use(supabaseUserRoutes);  // supabase database routes

const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

import bcrypt from "bcrypt";

//bcrypt hash compare
const plain = "3413be4a";
const hash = "$2b$10$ha6EB.JsWOvwn243rU9IVO2nAjohRhLYxMwpxQ7JdMUByCPm4A0L6";

const match = await bcrypt.compare(plain, hash);
console.log(match); // true or false
