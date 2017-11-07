import  { Response } from 'express';
// general handler for server errors (500)
export function onError(res:Response,message:string, err:any) {

    console.error("Promise chain error ",message, err);
    res.status(500).json({message});

}
