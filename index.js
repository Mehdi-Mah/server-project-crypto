const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Backend with Prisma is running.');
});

app.post('/users', async (req, res) => {
    const { email, password } = req.body;
    try {
        const newUser = await prisma.user.create({
            data: { email, password },
        });
        res.json(newUser);
    } catch (error) {
        res.status(500).json({ error: 'Error creating user' });
    }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
});
