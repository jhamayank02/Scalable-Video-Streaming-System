const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

const appRoutes = require('./routes');

// Configure .env
dotenv.config();

const app = express();

const PORT = process.env.PORT || 8000;

// TODO -> CORS
app.use(cors());
app.use(express.json());

// Routes
app.use('/', (req, res)=>{
    res.send("Server is running🚀🚀🚀");
});
app.use('/api/v1', appRoutes);

app.listen(PORT, ()=>{
    console.log("Server started on PORT:", PORT);
})