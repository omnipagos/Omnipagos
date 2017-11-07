/* Establishes connection via Mongoose to Local MongoDB instance or MLAB cloud-hosted DB*/


const mongoose = require('mongoose');
const env = process.env.NODE_ENV || 'development';
mongoose.Promise = global.Promise;
const MLAB_URI = process.env.MLAB_URI;
const nombre = "OmniPagos";

if(env === 'production'){
  mongoose.connect(MLAB_URI);
}

else{
  mongoose.connect('mongodb://localhost/omnipagos');
}

mongoose.connection.on('error', (err) => {
  console.log('Error conectando con la base de datos', err);
});

mongoose.connection.on('openUri', () => {
  console.log(`Conectado a base de datos ${nombre}`);
});

export { mongoose }
