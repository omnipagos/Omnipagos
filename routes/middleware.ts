import { Request, Response } from "express";
import { verify, TokenExpiredError } from "jsonwebtoken";
import { onError } from "./onError";
import { User } from "./../db/models/user";

const JWT_HASH = process.env.JWT_HASH;

//middleware for authenticating users when requesting a resource.

export function authenticate (req:Request, res:Response, next: any) {

    let token = req.header('x-auth');
    let decoded = undefined;
    try {
        decoded = verify(token, JWT_HASH);
    } catch (err) {
        decoded = '0';
        if (err instanceof TokenExpiredError) {
            // do something
        }
    }
    User.findOne({_id:decoded.id, token}, (err,user)=>{
        if(err) return onError(res, "Error obteniendo usuario", err);
        if(!user || !user.isAdmin) {
            return res.status(401).
            json({
                title : 'Error obteniendo información',
                error : { message : 'No se encuentra autorizado'}
                });
        }

        next();

    });
}
