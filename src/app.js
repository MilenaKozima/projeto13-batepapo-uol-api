import express, { response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import Joi from 'joi';
import dayjs from 'dayjs';

// criando a aplicação servidora
const app = express();

//configurações
app.use(cors());
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
const messageSchema = Joi.object({
    from:Joi.string().required(),
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.string().required().valid("message", "private_message")
})




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

app.post("/messages", async (request,response) => {
    const {to, text, type} = request.body;
    const {user} = request.headers;
    
    const validation = messageSchema.validate({...request.body, from: user});
    if(validation.error){
       return response.status(422).send(validation.error.details.map(detail => detail.message));
    }

    try{
        const participant = await db.collection('participants').findOne({name: user})
        if(!participant){
            return response.sendStatus(422)
        }

        const message = {
            from: user, 
            to, 
            text, 
            type, 
            time: dayjs().format('HH:mm:ss')
        }
        await db.collection('messages').insertOne(message)
        response.sendStatus(201);

    }catch(err){
        response.status(500).send(err.message);
    }

})

app.get("/messages", async (request, response) =>{

    const {user} = request.headers
    const {limit} = request.query

    if(limit !== undefined && (Number(limit) <= 0 || isNaN(Number(limit)))){
        return response.sendStatus(422);
    }

    try{
        const messages = await db.collection('messages')
        .find({ $or: [{from: user}, {to: user}, {type: "message"}, {to: "Todos"}]})
        .sort({ time: -1})
        .limit(limit === undefined ? 0 : Number(limit))
        .toArray()
        response.send(messages);
    }catch (err){
        response.status(500).send(err.message);
    }
})

app.post("/status", async (request,response) => {
const {user} = request.headers

if (!user) {
    return response.sendStatus(404);
}

try{
    const participant = await db.collection('participants').findOne({name: user})
    if(!participant){
        return response.sendStatus(404)
    }

    await db.collection('participants').updateOne(
        {name: user}, {$set: {lastStatus: Date.now()}}    
    )

    response.sendStatus(200);

}catch(err){
    response.status(500).send(err.message)
}
})

setInterval(async () => {
    const tensec = Date.now()-10000;

    try{
        const inactive = await db.collection("participants")
        .find({lastStatus: {$lt: tensec}})
        .toArray()

        if(inactive.length >0){
            const messages = inactive.map(user => {
                return {
                    from: user.name,
                    to: 'Todos',
                    text: 'sai da sala...',
                    type: 'status',
                    time: dayjs().format('HH:mm:ss')
            }
            })

            await db.collection('messages').insertMany(messages)
            await db.collection('participants').deleteMany({lastStatus: {$lt: tensec}})
        }

    }catch(err){
        console.log(err)
    }

}, 15000)

//ouvir na porta 5000
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running at port ${PORT}`));

