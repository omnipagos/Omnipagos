import { Transaction, ITransaction } from "../../db/models/transaction";
import {Business, IBusiness} from "./../models/business";
import { TransactionStatus} from "./../../../shared/models/transaction";
const request = require("request");
import * as _ from "lodash";

const OPEN_PAY = {
  businessId : process.env.OPEN_PAY_BUSINESS_ID,
  key : process.env.OPEN_PAY_BUSINESS_KEY
}
const CONEKTA = {
  key : process.env.CONEKTA_KEY
}

const Openpay = require('openpay');
const openpay = new Openpay(OPEN_PAY.businessId, OPEN_PAY.key);

const conekta = require('conekta-promise');
conekta.api_key =  CONEKTA.key;
conekta.api_version = '2.0.0';
conekta.locale = 'es';
import * as base64 from "./base64";
import {sendTransactionEmail, sendTransactionProcessedEmail } from "../../emails/config";
import {Client, IClient} from "../models/client";

//register transaction on OpenPay API
export function addOpenPayTransaction(transaction, customerId) : Promise<any | Boolean> {


    let request = {
        'method' : 'store',
        'amount' : transaction.amount,
        'description' : transaction.description,
        'order_id' : transaction._id
    };

    return new Promise((resolve,reject)=>{
    openpay.customers.list({
            'external_id' : customerId
        }, (err, customer) => {
            if(err) { console.log(err); reject(false); }
            else {
                openpay.customers.charges.create(customer[0].id, request, (error,charge)=>{
                if (error) { console.log(error); reject(false); }
                else resolve({externalId : charge.id, reference: charge.payment_method.reference, barcode_url: charge.payment_method.barcode_url});
                });
            }
        });
    });


}

//get locally pending transactions on openPay
export function requestOpenPayPendingTransactions(business: String, processor : number, externalId : string) {


    return new Promise((resolve,reject)=>{
        const lastStatusMatch = 0;
        const queryParams = {'processor': processor,
                            'business': business,
                            $where: `this.statusLog[this.statusLog.length - 1].statusType === ${lastStatusMatch}`
                            };
        Transaction.find(queryParams).select('_id').exec((err, transIds)=>{
            if(err) { console.log(err); reject(false); }
            else if(transIds.length === 0) {
                console.log("No pending records found");
                Transaction.find({'processor': processor, 'business': business}, (err,transactions)=> resolve(transactions));
            }
            else {
                let finalIds = [];
                getTransactionsOpenPayStatus(externalId).then((completedOPTransactions)=>{
                    let opCompletedArray = <Array<{}>>completedOPTransactions;
                    finalIds = _.intersectionWith(transIds, opCompletedArray, (a,b)=> b.order_id == a._id).map((t)=>t.id);
                    console.log("finalIDs", finalIds);
                    Transaction.update(
                        { _id : { $in : finalIds}},
                        { $push : { statusLog : {
                            description : "Procesado por OpenPay",
                            statusType : 1,
                            creator : "Omnipagos",
                            updatedAt : new Date()
                        }}},
                        { multi : true},
                        (err, raw) => {
                            if (err) { console.log(err); reject(false) }
                            else {
                                Transaction.find(
                                    {'processor': processor,
                                    'business': business},
                                (err,docs)=>{
                                    if(err) { console.log(err); reject(false) }
                                    else { console.log(docs.length); resolve(docs) }
                                });
                            }
                        }
                    );
                }).catch((err)=>{console.log(err); reject(false); });

                //let ids = transIds.map((tr)=> tr._id);

            }
        });
    });





}

//gets completed transactions from openpay by user (business)
function getTransactionsOpenPayStatus(customerId : string) {
    return new Promise((resolve,reject)=>{
        openpay.customers.charges.list(customerId, (err,list)=>{
            if(err) {
                console.log(err);
                reject(false);
            }
            let completedOnly = list.filter((element)=>element.status === "completed");
            console.log("Completed from openPay", completedOnly);
            resolve(completedOnly);
        });
    });
};

//gets one openpay transaction
export function getOpenPayTransactionInfo(transaction : ITransaction) {

    return new Promise((resolve,reject)=>{
            const customerId = transaction.business.processors[0].externalId;

            if(transaction.statusLog[transaction.statusLog.length-1].statusType === 1){
                openpay.customers.charges.get(customerId, transaction.additionalData.externalId, (err,charge)=>{
                if(err) {console.log(err); reject(false); }
                else {
                    resolve(charge.payment_method);
                };
                });
            }

            else{
                resolve(transaction.additionalData);
            }


    });

}

//register transaction on Conekta API
export function addConektaTransaction(transaction : ITransaction, customerId, amount : number) : Promise<any | Boolean> {

    let request = {
        "currency": "MXN",
        "customer_info": {
        "customer_id": customerId
        },
        "line_items": [{
        "name": transaction.description,
        "unit_price": amount,
        "quantity": 1
        }],
        "charges": []
    };

    return new Promise((resolve,reject)=>{
        conekta.Order.create(request)
            .then(order=>{
                let orderId = order.toObject().id;
                //console.log("insercion conekta bien", order.toObject().id);
                order.createCharge({
                    "payment_method": {
                        "type": "oxxo_cash"
                    },
                    "amount" : order.amount
                    //"amount": order.amount * 100  ---- TODO, MANDAR COMO CENTAVOS?
                }).then((charge)=>{
                        //console.log("Chargizard", charge);
                        resolve({externalId : orderId, reference: charge.payment_method.reference, barcode_url: null});
                }).catch((err)=> { console.log(err); reject(false); })
                //resolve(order.id)
            })
          .catch(err=>{ console.log(err); reject(false); });
    });


}

let getOrdersURL = {
  url: 'https://api.conekta.io/orders',
  method: 'GET',
  headers: {
    'Accept': 'application/vnd.conekta-v2.0.0+json',
    'Accept-Charset': 'utf-8',
    'Authorization' : ['Basic ', base64.encode(conekta.api_key), ':'].join('')
  }
};

//get locally pending transactions on conekta
export function requestConektaPendingTransactions(business : string, processor : number, customerId : string){


  return new Promise((resolve, reject)=>{

    const lastStatusMatch = 0;
    const queryParams = {'processor': processor,
                         'business': business,
                          $where: `this.statusLog[this.statusLog.length - 1].statusType === ${lastStatusMatch}`
    };

    Transaction.find(queryParams).select('additionalData.externalId').exec((err, transIds)=> {
      if (err) {
        console.log(err);
        reject(false);
      }

      else if (transIds.length === 0) {
        console.log("No pending records found");
        Transaction.find({'processor': processor, 'business': business}, (err, transactions) => resolve(transactions));

      }

      else {
        //console.log('transids', transIds);

        getConektaTransactionsStatus(customerId).then((conektaTransactions)=>{
          //console.log("conekta", conektaTransactions);
          // procesamiento para update de nuestro lado
          let finalIds = [];
          finalIds = _.intersectionWith(transIds, conektaTransactions, (a,b)=> b.id == a.additionalData.externalId).map((t)=>t._id);
          console.log("finalIds", finalIds);

          Transaction.update(
                        { _id : { $in : finalIds}},
                        { $push : { statusLog : {
                            description : "Completado OxxoPay",
                            statusType : 1,
                            creator : "Omnipagos",
                            updatedAt : new Date()
                        }}},
                        { multi : true},
                        (err, raw) => {
                            if (err) { console.log(err); reject(false) }
                            else {
                                Transaction.find(
                                    {'processor': processor,
                                    'business': business},
                                (err,docs)=>{
                                    if(err) { console.log(err); reject(false) }
                                    else { console.log(docs.length); resolve(docs) }
                                });
                            }
                        }
            );
        }).catch((err)=>{console.log(err); reject(false); });
      }

    });


  })


}


export function handleTransactionEmailSend(email : string, order : any){

  return new Promise((resolve, reject)=>{
    sendTransactionEmail(email, order).then((data)=>{
      console.log('correo enviado...');
      resolve(true);
    }).catch((e)=>{
      console.log(e);
      resolve(false);
    });
  })

}


export function handlePaidTransactionEmailSend(email : string, order : any){

  return new Promise((resolve, reject)=>{
    sendTransactionProcessedEmail(email, order).then((data)=>{
      console.log('correo enviado...');
      resolve(true);
    }).catch((e)=>{
      console.log(e);
      resolve(false);
    });
  })

}


export function handleTransactionProcessedEmailSend(email : string, order : any){

  return new Promise((resolve, reject)=>{
    sendTransactionProcessedEmail(email, order).then((data)=>{
      console.log('correo de pago completado enviado...');
      resolve(true);
    }).catch((e)=>{
      console.log(e);
      resolve(false);
    });
  })

}

export function formatOrderForEmail(transaction : ITransaction, additionalData : any) {

  let formattedData : any = {
    transaction : {},
    email : ''
  };
  return new Promise((resolve, reject)=>{
      Business.findById(transaction.business).then((business : IBusiness)=>{
        formattedData.transaction.business = business.name;
        Client.findById(transaction.client).then((client : IClient)=>{
          formattedData.email = client.email;
          formattedData.transaction.user_name = client.firstName + ' ' + client.lastName;
          formattedData.transaction._id = transaction._id;
          formattedData.transaction.amount = transaction.amount;
          formattedData.transaction.date = transaction.createdAt;
          formattedData.transaction.processor = transaction.processor == 0 ?  'OpenPay' : 'OxxoPay';
          formattedData.transaction.description = transaction.description;
          formattedData.transaction.externalRef = additionalData.reference;
          formattedData.transaction.barcodeUrl = additionalData.barcode_url === null ? 'N/D' : additionalData.barcode_url;
          console.log(formattedData);
          resolve(formattedData);
        })
      }).catch(e => reject(e))
  });
}


//gets completed transactions from conekta by user (business)
function getConektaTransactionsStatus(customerId : string) {

  return new Promise((resolve, reject) => {

        let url = `https://api.conekta.io/orders?customer_info.customer_id=${customerId}&payment_status=paid`;

        getInitialPage(url).then((orders) => {
          var start = +new Date();
          var allOrders = orders["data"];
          if (orders["has_more"]) {
            let wait = processNextPage(orders["next_page_url"], allOrders, (value) => {
              var end = +new Date();
              console.log("actions executed in " + (end - start) + " milliseconds");
              console.log('we done', value.length);
              resolve(value);
            });
          }
          else {
            resolve(allOrders);
          }
        }).catch((err) => {
          console.log(err);
          reject(false)
        });
  });






    /*return new Promise((resolve, reject)=>{
      const conektaQuery = {"customer_info.customer_id" : customerId, "payment_status" : "paid"};
      conekta.Order.where(conektaQuery)
        .then((customers)=>{
          var start = +new Date();
          var allOrders = customers.data;
          if(customers.has_more){
            let wait = processNextPage(customers.next_page_url, allOrders, (value)=> {
              var end = +new Date();
              console.log("actions executed in " + (end-start) + " milliseconds");
              console.log('we done', value.length);
              resolve(value);
            });
          }
          else{
            resolve(allOrders);
          }
        }).catch((err)=>{console.log(err); reject(false)})
    });*/
}

//functions to avoid conekta's Node bad library
//gets initial page for paid orders (Given a customer id)
function getInitialPage(page_url){

  getOrdersURL.url = page_url;

  return new Promise((resolve, reject)=>{
    request(getOrdersURL, (err,res,body)=>{
      if(err) reject(false);
      let json = JSON.parse(body);
      if(json.data.length > 0) resolve(json);
      else resolve([]);
    });
  });


}

//gets next pages (if existent) for paid orders. TODO : implement this globally for being used for different Conekta API Routes
function processNextPage(page_url, orderArray, callback){

  getOrdersURL.url = page_url;

  request(getOrdersURL, (err,res,body)=>{
    let json = JSON.parse(body);
    orderArray = orderArray.concat(json.data);
    if(json.has_more) {
      processNextPage(json.next_page_url, orderArray, callback);
    }
    else{
      callback(orderArray);
    }
  });


}
