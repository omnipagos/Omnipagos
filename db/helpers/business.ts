import { IBusiness, Business } from "./../models/business";
import { Processor, IProcessor } from "./../models/processor";
import { onError } from "./../../routes/onError";
import { Response } from "express";

const OPEN_PAY = {
  businessId : process.env.OPEN_PAY_BUSINESS_ID,
  key : process.env.OPEN_PAY_BUSINESS_KEY
}
const CONEKTA = {
  key : process.env.CONEKTA_KEY
}

const Openpay = require('openpay');
const openpay = new Openpay(OPEN_PAY.businessId, OPEN_PAY.key);

let conekta = require('conekta');
conekta.api_key = CONEKTA.key;
conekta.api_version = '2.0.0';
conekta.locale = 'es';

const PROCESSORS = {
    "OPENPAY" : 0,
    "OXXOPAY" : 1,
    "SORIANA" : 2,
    "WALMART" : 3
}

//HELPERS for business Logic


//get basic business information
export function getCondensedBusinessInfo(id: string, res: Response) {
    Business.findById(id).populate('users clients transactions').exec((err,business)=>{
        if(err) return onError(res, "Error obteniendo negocios", err);
        if(!business) return res.status(404).send();
        getProcessors(business).then((data)=>{
            res.json(data);
        }).catch((error)=> onError(res,error.msg,error.err));
    });
}

//get all processors' status for a given business. return business also
function getProcessors(business) {
    return new Promise((resolve,reject)=>{
        Processor.find({}, (err,processors)=>{
            if(err) reject({msg:"Error obteniendo procesadores i7", err})
            let processorsDetail : any = [];
            processors.forEach((processor : IProcessor, index)=>{
                processorsDetail.push({
                    processor : processor,
                    active : business.processors[index]
                });
            });

            resolve({business,processorsDetail});
        });
    });
}

//updates value for processor on MongoDB for a given business
export function updateBusinessProcessor(business, processor){


        return Business.findOneAndUpdate({'_id' : business._id, 'processors.name' : processor.name },
        {
            $set: {
             "processors.$.value" : processor.value
            }
        }, {
            new : true
        });
}

//add processor to business (first time)
export function addBusinessToProcessor(business, type : string) : Promise<any> {

    let processorType = PROCESSORS[type.toUpperCase()];
    console.log(processorType);
    return new Promise((resolve,reject)=>{
            if(processorType === 0) {
                // add to openpay API
                if(!business.processors[0].externalId){
                    //TODO : mail for business
                    let customerRequest = {
                                'name' : business.name,
                                'email' : 'test@mail.com',
                                'external_id' : business._id
                        }
                    openpay.customers.create(customerRequest, (err,customer)=>{
                        if(err) { console.log(err); reject(false); }
                        //update locally
                        Business.findOneAndUpdate({"_id" : business._id, "processors.name" : "OpenPay"},
                                        {$set : { "processors.$.externalId" : customer.id }},
                                        { new : true}
                        ).then((newBusiness)=>{
                            resolve(newBusiness.processors);
                        }).catch((err)=>reject(false));
                    });
                }
                //business has already been registered with openPAY
                else {
                    resolve(business.processors);
                }

            }
            //add to Conekta API
            else if (processorType === 1) {

                if(!business.processors[1].externalId) {
                     conekta.Customer.create({
                            name: business.name,
                            email: 'usuario@example.com',
                            corporate: true,
                            payment_sources: [],
                            shipping_contacts: []
                        }, function(err, customer) {
                            if(err) { console.log('error', err); reject(false); }
                            else {
                                 const conektaId = customer.toObject().id;
                                 //update locally
                                 Business.findOneAndUpdate(
                                     {"_id" : business._id, "processors.name" : "OxxoPay"}, //criteria
                                     {$set : { "processors.$.externalId" : conektaId }}, //update
                                     { new : true} //config
                                ).then((newBusiness)=>{
                                    resolve(newBusiness.processors);
                                }).catch((err)=>reject(false));
                            }
                        });
                }
                //business has already been registered with conekta
                else {
                    resolve(business.processors);
                }
            }

            else{
              resolve(business.processors);
            }



    });
}
