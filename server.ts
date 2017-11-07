import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as helmet from 'helmet';
import { Application } from 'express';
import { initApi } from "./src/server/routes/api";
import { mongoose } from './src/server/db/config';
const cors = require('cors');
const PORT = process.env.PORT || 3000;
const Ddos = require('ddos');
const ddos = new Ddos({burst:10, limit:15, expiry:10})
const path = require('path');
const app: Application = express();
mongoose.connect; //connect to our dev/prod database...


/*Middlewares*/

app.use(helmet());
app.use(bodyParser.json());
//app.use(ddos.express);
app.use(cors());
//configure API Routes
initApi(app);
app.use(express.static(path.join(__dirname, 'dist'))); //serve the production Angular Application


//initialize HTTP Server
app.listen(PORT, ()=> {
    console.log(`server is now running on port ${PORT}`);
});

//if no API Route was matched, handle control to Angular Application

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, './dist/index.html'))
});

//helpheroku