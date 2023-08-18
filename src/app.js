import express from 'express';
import cors

// criando a aplicação servidora
const app = express();

//configurações
app.use(cors);
app.use(express.json());

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running at port ${PORT}`));