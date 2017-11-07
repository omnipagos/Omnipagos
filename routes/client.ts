import { Application, Request, Response } from "express";
import { Query } from "mongoose";
import { onError } from "./onError";
import { Client } from "./../db/models/client";
import { Business } from "./../db/models/business";

//gets all clients

export function getClients(req: Request, res: Response) {
    Client.find({}, (err,clients)=>{
        if(err) return onError(res,"Error obteniendo clientes",err);
        return res.json(clients);
    });
}

//gets all clients from a business

export function getClientsByBusiness(req: Request, res: Response) {
    let id = req.params.id;
    Client.find({'business':id}, (err,clients)=>{
        if(err) return onError(res,"Error obteniendo clientes por negocio",err);
        return res.json(clients);
    });
}

//gets one client

export function getClient(req: Request, res: Response) {
    let id = req.params.id;
    Client.findById(id, (err,client)=>{
        if(err) return onError(res,"Error obteniendo cliente",err);
        return res.json(client);
    });
}

//gets one client by email

export function getClientByEmail(req: Request, res: Response) {
    let email = req.body.email;
    let pwd = req.body.password;
    Client.findOne({email}, (err,client)=>{
        if(err) return onError(res,"Error obteniendo cliente",err);
        if(!client) return res.status(404).json();
        //console.log(pwd);
        return res.json(client);
    });
}

//creates a new client.

export function createClient(req:Request, res:Response){
    
    let client = new Client(req.body.client);
    let business = req.body.businessId;

    Client.findOne({email:client.email}).then(existing => {
        if(existing) {
        Business.findById(business).populate('clients').exec((err, business)=>{
            if(err) return onError(res, "Error creando cliente", err);
            let findResult = business.clients.find((c)=> c.email === client.email);
            if(!!findResult){
                return res.status(400).json({message : 'Cliente ya existe en ese negocio'});
            }
            else{

                business.clients.push(existing._id);
                business.save((err, savedBusiness)=>{
                    if(err) return onError(res, "Error creando cliente", err);
                    return res.json(existing);
                });
            }
        });
        }

        else {
        client.save((err,client)=>{
            if(err) return onError(res, "Error creando cliente", err);
            // add client reference in business MongoDB instance
            Business.findByIdAndUpdate(business, {
            $addToSet : { 'clients' : client._id }
            }, (err, result)=>{
            if(err) return onError(res, "Error creando cliente", err);
            return res.json(client);
            });
        });
        }

    });


    
    
}

//updates a client

export function updateClient(req:Request, res:Response){
    let id = req.params.id;
    let newInfo = req.body;

    Client.findByIdAndUpdate(id, newInfo, (err, result) => {
        if (err) return onError(res, "Error actualizando usuario", err);
        return res.json({message: "Cliente Actualizado"});
    });

}


//deletes a client

export function deleteClient(req:Request, res:Response){
    let id = req.params.id;

    Client.findByIdAndRemove(id, (err, result) => {
        if (err) return onError(res, "Error eliminando cliente", err);
        return res.status(204).json();
    });

}

export function unlinkClient(req:Request, res:Response){
  let id = req.params.id;
  let businessId = req.params.businessId;

  Business.findByIdAndUpdate(businessId, {
    $pull : { 'clients' : id }
  } , (err, result)=>{
    if (err) return onError(res, "Error eliminando cliente", err);
    if(!result) return res.status(404).json();
    return res.status(200).json({id});
  });


}
