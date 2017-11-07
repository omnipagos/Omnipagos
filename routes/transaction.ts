import { Application, Request, Response } from "express";
import { onError } from "./onError";
import { Transaction, ITransaction, Status } from "./../db/models/transaction";
import * as _ from 'lodash';
import { Business } from "./../db/models/business";
import {
  addOpenPayTransaction,
  getOpenPayTransactionInfo,
  requestOpenPayPendingTransactions,
  addConektaTransaction,
  requestConektaPendingTransactions, handleTransactionEmailSend, formatOrderForEmail, handlePaidTransactionEmailSend
} from "./../db/helpers/transaction";

//gets all transaction by business and processor

export function getTransactionsByBusiness(req: Request, res: Response) {
    let businessId : string = req.params.id;
    let processorId = req.params.processorId;
    let externalId = req.params.externalId;
    let dateRange = req.query.startFrom;
    //optional, gets all transactions starting from a given date to today.
    if(!!dateRange){
        if(parseInt(dateRange).toString().length !== dateRange.length || dateRange <= 0) {
            return res.status(400).json();
        }

        let cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - dateRange);
        Transaction.find({'business': businessId, createdAt : {$gte : cutoff }}, (err,transactions)=>{
            if(err) return onError(res,"Error obteniendo transacciones",err);
            return res.json(transactions);
        });
    }

    //case all
    else{


        Transaction.find(
        {'processor': processorId, 'business': businessId})
          .then(transactions=> res.json(transactions))
          .catch(e => onError(res, "Error obteniendo transacciones por negocio", e));


        /*
        //openpay transactions (pending)
        //OLD METHOD MASTER-RACE
        if(parseInt(processorId) === 0){
            requestOpenPayPendingTransactions(businessId, processorId, externalId).then((values)=>{
              return res.json(values);
            }).catch((err)=> res.status(500).json());
        }

        //conekta transactions (pending)
        //OLD METHOD MASTER-RACE
        else if(parseInt(processorId) === 1){
            requestConektaPendingTransactions(businessId, processorId, externalId).then((values)=>{
              return res.json(values);
            }).catch((err)=> res.status(500).json());
        }

        //all other processors' transactions . TODO
        else{
            Transaction.find(
                {'processor': processorId, 'business': businessId},
                (err,transactions)=> res.json(transactions));
        }
        */

    }
}

export function getAllTransactionsByBusiness(req : Request, res : Response) {
    let businessId = req.params.businessId;
    Transaction.find({'business' : businessId}, (err,transactions)=>{
        if(err) return onError(res,"Error obteniendo transacciones",err);
        return res.json(transactions);
    });
}


//gets all transactions by client

export function getTransactionsByClient(req: Request, res: Response) {
    let clientId = req.params.id;
    let notInclude = "-updatedAt -createdAt -type -uploadedFiles -transactions -clients -processors -users";
    Transaction.find({'client': clientId}).populate("business", notInclude)
      .exec((err,transactions)=>{
        if(err) return onError(res,"Error obteniendo transacciones",err);
        return res.json(transactions);
    });
}

//gets one transaction . TODO : implement processor for different logic
export function getTransaction(req: Request, res: Response) {
  let id = req.params.id;
  let processor = req.query.p;
  Transaction.findById(id).populate("business", "name processors").exec((err,transaction)=>{
    if(err) return onError(res,"Error obteniendo transacción",err);
    if(transaction.processor === 0){
      getOpenPayTransactionInfo(transaction).then((additional)=>{
        return res.json({transaction, additional});
      }).catch((err)=> onError(res, "Error obteniendo transacción", err));
    }

    else if(transaction.processor === 1){
      return res.json({transaction, additional:transaction.additionalData});
    }

  });
}

//creates a new transaction, with the specified processor

export function createTransaction(req:Request, res:Response){

    let data : any = _.pick(req.body, ['processor', 'description', 'amount', 'client', 'business', 'statusLog']);
    //initial transaction status
    let status : Status = {
        description : 'Inicio Transacción',
        statusType : 0,
        updatedAt : new Date(),
        creator : 'Omnipagos'
    }
    data.statusLog.push(status);
    let transaction = new Transaction(data);
    let businessId = data.business;
    console.log(businessId);
    transaction.save((err,transaction)=>{
        if(err) return onError(res, "Error insertando transacción", err);
        Business.findByIdAndUpdate(businessId,
        {$push : {transactions: transaction._id}}, (err, affected) => {
            if(err) return onError(res, "Error añadiendo transacción al negocio", err);
            if(affected === null) return res.status(400).json({message: 'Esta transacción ya existe'});

            let additionalData;

            //add transaction to OpenPay API
            if(data.processor === 0) {
                 addOpenPayTransaction(transaction, businessId)
                .then((charge)=> {
                    console.log("Nuevo cargo a OpenPay", charge);
                    additionalData = charge;
                    return transaction.update({"additionalData" : charge})
                })
                .then((nice)=>{
                   console.log('por formatear órden');
                   return formatOrderForEmail(transaction, additionalData)
                })
                .then((formattedBody)=>{
                   console.log('por enviar correo');
                   return handleTransactionEmailSend(formattedBody['email'], formattedBody['transaction'])
                })
                .then((status)=>{
                   return res.json(transaction)
                })
                .catch((err) => onError(res, "Error añadiendo transacción al proveedor", err))
            }

            //add transaction to Conekta API
            else if(data.processor === 1) {
                Business.findById(businessId, (err, business)=>{
                    if(err)  return onError(res, "Error insertando transacción", err);
                    let additionalData;
                    let conektaId = business.processors[1].externalId;
                    let realAmount = transaction.amount * 100;
                    addConektaTransaction(transaction, conektaId, realAmount).then((charge)=>{
                        additionalData = charge;
                        return transaction.update({"additionalData" : charge})
                    })
                    .then((nice)=>{
                      console.log('por formatear órden');
                      return formatOrderForEmail(transaction, additionalData)
                    })
                    .then((formattedBody)=>{
                      console.log('por enviar correo');
                      return handleTransactionEmailSend(formattedBody['email'], formattedBody['transaction'])
                    })
                    .then((status)=>{
                      return res.json(transaction)
                    })
                    .catch((err) => onError(res, "Error añadiendo transacción al proveedor", err));
                });

            }

            //add locally if other processor
            else {
                return res.json(transaction);
            }

        });
    });

}

//update one transaction

export function updateTransaction(req:Request, res:Response){

    let id = req.params.id;
    let newStatus = req.body;
    newStatus.updatedAt = new Date();
    Transaction.findByIdAndUpdate(id, {$push : {statusLog : newStatus}}, { new: true}, (err, result) => {
        if (err) return onError(res, "Error actualizando transacción", err);
        return res.json({message: "Transacción Actualizada", update: result });
    });

}

//delete one transaction

export function deleteTransaction(req:Request, res:Response){

    let id = req.params.id;
    Transaction.findByIdAndRemove(id, (err, result) => {
        if (err) return onError(res, "Error eliminando transacción", err);
        return res.json({message: "Transacción Eliminada"});
    });

}


export function handleOpenPayWebhook(req : Request, res : Response){

    let body = req.body;
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    //if(ip != '54.210.130.67'){
    //    console.log('SENDER IP PRESUMABLY INVALID...', ip);
    //    return;
    //}

    if(body.type === 'charge.succeeded') {

      let transactionId = body.transaction.id;
      console.log('OP PAYMENT COMPLETED!', transactionId);
      Transaction.findOneAndUpdate({'additionalData.externalId' : transactionId, processor : 0},
        { $push : { statusLog : {
        description : "Procesado por OpenPay",
        statusType : 1,
        creator : "Omnipagos",
        updatedAt : new Date()
      }}})
        /*.then(t=>{


          console.log('estatus actualizado OP');
          return res.status(200).json();

        })*/
        .then((t)=>{
          console.log('estatus actualizado OP');
          return formatOrderForEmail(t, t.additionalData)
        })
        .then((formattedBody)=>{
          console.log('por enviar correo');
          return handlePaidTransactionEmailSend(formattedBody['email'], formattedBody['transaction'])
        })
        .then(status=>{
          return res.status(200).json();
        })
        .catch(e => {
          console.log('error', e);
          return res.status(200).json();
      });


    }


    else if(body.type === 'charge.created') {
      console.log('OP CHARGE CREATED!', body.transaction.payment_method);
      return res.status(200).json();
    }

    else{
      return res.status(200).json();
    }



}


export function handleConektaWebhook(req : Request, res : Response){

  let body = req.body;
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if(ip != '52.200.151.182'){
    console.log('SENDER IP PRESUMABLY INVALID...', ip);
    return;
  }

  console.log('resquetype', body.type);

if(body.type === 'charge.paid'){

    let transactionId = body.data.object.order_id;
    console.log('OXXO PAYMENT COMPLETED!', transactionId);
    Transaction.findOneAndUpdate({'additionalData.externalId' : transactionId, processor : 1},
      { $push : { statusLog : {
        description : "Procesado por OxxoPay",
        statusType : 1,
        creator : "Omnipagos",
        updatedAt : new Date()
      }}}, {new : true}).then((t)=>{
        console.log('estatus actualizado OPso');
        return formatOrderForEmail(t, t.additionalData)
      })
      .then((formattedBody)=>{
        console.log('por enviar correo');
        return handlePaidTransactionEmailSend(formattedBody['email'], formattedBody['transaction'])
      })
      .then(status=>{
        return res.status(200).json();
      })
      .catch(e => {
        console.log('error', e);
        return res.status(200).json();
      });
    }


    else if(body.type === 'charge.created') {
      console.log('OXXO CHARGE CREATED!', body.data.object.payment_method);
      return res.status(200).json();
    }

    else{
      return res.status(200).json();
    }


}
