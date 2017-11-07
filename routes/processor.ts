import { Application, Request, Response } from "express";
import { onError } from "./onError";
import { Processor } from "./../db/models/processor";


//gets all processors in DB

export function getProcessors(req: Request, res: Response) {
    Processor.find({}, (err,processors)=>{
        if(err) return onError(res,"Error obteniendo procesadores i7",err);
        return res.json(processors);
    });
}

//gets one processor (by name)

export function getProcessor(req: Request, res: Response) {
    let name = req.params.name.toString().toUpperCase();
    console.log(name);
    Processor.find({name}, (err,processor)=>{
        if(err) return onError(res,"Error obteniendo procesador",err);
        if(processor.length === 0) return res.status(404).json();
        return res.json(processor);
    });
}

//inserts new processor

export function insertProcessor(req:Request, res:Response){

    let processor = new Processor(req.body);
    processor.save((err,processor)=>{
        if(err) return onError(res, "Error insertando AMD", err);
        return res.json(processor);
    });

}

//updates a processor

export function updateProcessor(req:Request, res:Response){

    let name = req.params.name.toString().toUpperCase();
    let newInfo = req.body;

    Processor.findOneAndUpdate({name}, newInfo, (err, result) => {
        if (err) return onError(res, "Error actualizando procesador", err);
        return res.json({message: "Procesador Actualizado"});
    });

}

