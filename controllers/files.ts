import { Router, Request, Response } from 'express';
import { authenticate } from "../routes/middleware";
import { Business } from "../db/models/business";
import { User } from "../db/models/user";
import { Client } from "../db/models/client";
import { onError } from "../routes/onError";

// Assign router to the express.Router() instance
const router: Router = Router();
const path = require('path');

//Amazon Web Services
const aws = require('aws-sdk');
const S3_BUCKET = process.env.S3_BUCKET;
aws.config.update({region: 'us-east-2'});

//excel
const json2xls = require('json2xls');

/*router.use('/', (req: Request, res: Response, next: any)=>{
    authenticate(req,res,next);
});*/

router.get('local/:businessId/:filename', (req: Request, res: Response) => {

    let businessId = req.params.businessId;
    let fileName = req.params.filename;

    Business.findOne({_id : businessId, uploadedFiles : fileName}).then((business)=>{
          if(!business) return res.status(400).send("Not found");
          console.log('si aplica');
          res.download('./src/server/files/'+fileName);
    }).catch(e => res.status(500).json(e));

});

router.get('/amazon-upload/:businessId', (req : Request, res : Response) => {

  const s3 = new aws.S3();
  let businessId = req.params.businessId
  let fileName = businessId + '_' + req.query['file-name'];
  const fileType = req.query['file-type'];
  console.log(fileName, fileType);
  const s3Params = {
    Bucket: S3_BUCKET,
    Key: fileName,
    ContentType: fileType
  };


  s3.getSignedUrl('putObject', s3Params, (err, data) => {
    if(err){
      return res.status(500).json({err});
    }

    const returnData = {
      signedRequest: data,
      url: `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}`
    };


    Business.findByIdAndUpdate(businessId, {
      $addToSet : { 'uploadedFiles' : fileName }
    }, { new : true}).then((business)=>{
      if(!business) return res.status(400).json();
      let files = business.uploadedFiles;
      return res.json({returnData, files});
    }).catch(e => res.status(422).send("an Error occured"))

  });

});


router.get('/amazon/:businessId', (req : Request, res : Response)=> {
  const s3 = new aws.S3();
  const fileName = req.query.name;
  const s3Params = {
    Bucket: S3_BUCKET,
    Key: fileName,
    Expires : 60
  };

  var url = s3.getSignedUrl('getObject', s3Params);
  res.json(url);
});

router.get('/amazon-image/:dynamicId', (req : Request, res : Response) => {

  const s3 = new aws.S3();
  let id = req.params.dynamicId;
  let kind = req.query['kind'];
  let fileName = id + '_' + req.query['file-name'];
  const fileType = req.query['file-type'];

  const s3Params = {
    Bucket: S3_BUCKET,
    Key: fileName,
    ContentType: fileType,
    ACL: 'public-read'
  };


  s3.getSignedUrl('putObject', s3Params, (err, data) => {
    if(err){
      return res.status(500).json({err});
    }

    let url = `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}`;
    const returnData = {
      signedRequest: data,
      url
    };

    if(kind === 'user') {
      User.findByIdAndUpdate(id, {
        imgId : url
      }).then((user)=>{
        if(!user) return res.status(400).json();
        return res.json(returnData);
      }).catch(e => res.status(422).send("an Error occured"))
    }

    else if(kind === 'client'){
      Client.findByIdAndUpdate(id, {
        imgUrl : url
      }).then((client)=>{
        if(!client) return res.status(400).json();
        return res.json(returnData);
      }).catch(e => res.status(422).send("an Error occured"))
    }

    else{
      Business.findByIdAndUpdate(id, {
        imgUrl : url
      }).then((business)=>{
        if(!business) return res.status(400).json();
        return res.json(returnData);
      }).catch(e => res.status(422).send("an Error occured"))
    }

  });

});


router.post('/excel', (req : Request, res : any) => {

    let transactions = req.body;
    let formattedTransactions = formatTransactionsJsonArray(transactions);

    const xls = json2xls(formattedTransactions);
    const buf = new Buffer(xls, 'binary');
    const fileName = Date.now() + '.xlsx';
    const s3 = new aws.S3();
    let uploads3Params = {
      Body: buf,
      Bucket: S3_BUCKET,
      Key: fileName,
      ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    let gets3Params = {
      Bucket: S3_BUCKET,
      Key: fileName,
      Expires : 60
    };

    s3.putObject(uploads3Params, (err, data)=> {
      if (err) {
        console.log(err, err.stack);
        return onError(res, "Error generando archivo", err);
      } // an error occurred
      else    {
        console.log(data);
        const url = s3.getSignedUrl('getObject', gets3Params);
        return res.json(url);
      }
    });


  });


function formatTransactionsJsonArray(transactions : any){

    let returnedTransactions = [];

    transactions.forEach(transaction=>{
      returnedTransactions.push({
        'ID' : transaction.id,
        'Fecha' : transaction.date,
        'Procesador' : transaction.processorName,
        'Estatus' : getTransactionStatus(transaction.status),
        'Descripción' : transaction.description,
        'Cantidad' : transaction.amount,
        'Cliente' : transaction.client,
        'Referencia' : transaction.additionalData.reference
      });
    });

    return returnedTransactions;

  }

function getTransactionStatus(status : number){
  switch(status){
    case 0 :
      return 'Pendiente';
    case 1 :
      return 'Completado';
    case 2 :
      return "Cancelado";
    default :
      return "Aclaración";
  }
  }
  


export const FilesController: Router = router;
