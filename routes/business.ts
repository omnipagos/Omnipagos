import { Application, Request, Response } from "express";
import { Business } from "./../db/models/business";
import { Query } from "mongoose";
import { onError } from "./onError";
import { Processor, IProcessor } from "./../db/models/processor";
import { getCondensedBusinessInfo, updateBusinessProcessor, addBusinessToProcessor } from "./../db/helpers/business";
const Openpay = require('openpay');

const OPEN_PAY = {
  businessId : process.env.OPEN_PAY_BUSINESS_ID,
  key : process.env.OPEN_PAY_BUSINESS_KEY
}

const openpay = new Openpay(OPEN_PAY.businessId, OPEN_PAY.key);

//gets all businesses

export function getBusinesses(req: Request, res: Response) {
    Business.find({}).populate('users').exec((err,businesses)=>{
        if(err) return onError(res,"Error obteniendo negocios",err);
        if(businesses.length === 0) return res.json({message:"No registers available"});
        return res.json(businesses);
    });
}

//gets all businesses

export function getBusinessesNames(req: Request, res: Response) {


  let target = req.params.name.toLowerCase();

  Business.find({}).select('name -_id').exec((err,businesses)=>{
    if(err) return onError(res,"Error obteniendo negocios",err);
    if(businesses.length === 0) return res.json({exists:false});
    let result = businesses.filter(b=> b.name.toLowerCase() === target);
    if(result.length === 0) return res.json({exists: false});
    return res.json({exists:true});
  });
}


//gets one business

export function getBusiness(req: Request, res: Response) {
    const id = req.params.id;
    getCondensedBusinessInfo(id, res);
}


//creates a business (method currently not used)

export function createBusiness(req:Request, res:Response){


    let business = new Business(req.body);

    business.save((err,business)=>{
        if(err) return onError(res, "Error creando negocio", err);
        let customerRequest = {
            'name' : business.name,
            'email' : 'test@mail.com',
            'external_id' : business._id
        }
        openpay.customers.create(customerRequest, (error,customer)=>{
            if(error) return onError(res, "Error creando negocio", error);
            console.log('CUSTOMER', customer);
            return res.json(business);
        });

    });

}

//updates processors fon one business

export function updateProcessors(req: Request, res: Response){
    let id = req.params.id;
    let processor = req.body.processor;
    Business.findById(id)
    .then(business => updateBusinessProcessor(business, processor))
    .then((savedBusiness)=>addBusinessToProcessor(savedBusiness, processor.name))
    .then((processors)=>res.json({message : "Procesadores actualizados para el negocio", processors}))
    .catch(err => onError(res, "Error actualizando procesadores", err));
}

//adds a user to an specific business

export function addUserToBusiness(req:Request, res:Response){
    let id = req.params.id;
    let userid = req.body.userid;

    Business.findOneAndUpdate({_id: id, 'users' : {$ne : userid}},
    {$push : {users: userid}}, (err, affected) => {
        if(err) return onError(res, "Error añadiendo usuario al negocio", err);
        if(affected === null) return res.status(400).json({message: 'El usuario ya es parte del negocio'});
        res.json({affected});
    });


}
