import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

// criando a aplicação servidora
const app = express();

//configurações
app.use(cors);
app.use(express.json());
dotenv.config();

//conexão com o banco de dados
const mongoClient = new MongoClient(process.env.DATABASE_URL)
try{
    mongoClient.connect()
    console.log("MongoDB conectado")
} catch(error){
    console.log(error.message)
}

const db = mongoClient.db();

//rotas - endpoints
app.get("/participants", (request,response) => {
    response.send("Tudo ok");
})


//ouvir na porta 5000
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running at port ${PORT}`));

