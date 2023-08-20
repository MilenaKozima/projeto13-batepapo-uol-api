import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import Joi from 'joi';

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
} catch(err){
    console.log(err.message)
}

const db = mongoClient.db();

//Schemas
const participantsSchema = Joi.object({ name: Joi.string().required()});

//rotas - endpoints
app.post("/participants", async (request,response) => {
    const { name } = request.body;

    const validation = participantsSchema.validate(request.body);
    if(validation.error){
       return response.status(422).send(validation.error.details.map(detail => detail.message));
    }

    try{
        const participant = await db.collection('participants').findOne({name});
        if (participant){
            return response.sendStatus(409);
        }

        const timenow = Date.now()
        await db.collection('participants').insertOne({name, lastStatus:timenow})

        const message = {
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs(timenow).format('HH:mm:ss')
        }
        await db.collection('messages').insertOne(message)
        response.sendStatus(201);

    } catch (err) {
        response.statusCode(500).send(err.message);
    }
})

app.get("/participants", async (request, response) =>{
    try {
        const participants = await db.collection('participants').find().toArray();
        response.send(participants);
    } catch (err){
        response.status(500).send(err.message);
    }
})

//ouvir na porta 5000
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running at port ${PORT}`));

