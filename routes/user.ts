import { Application, Request, Response } from "express";
import { User } from "./../db/models/user";
import { Query } from "mongoose";
import { onError } from "./onError";
import { compareSync } from "bcryptjs";
import { ObjectID } from "mongodb";
import { Business } from "./../db/models/business";
import * as moment from "moment";
import {sendEmail} from "../emails/config";
const sanitize = require('mongo-sanitize');
const nodemailer = require('nodemailer');
const multer = require('multer');


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './src/server/files/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now().toString() + file.originalname);
  }
});
const upload = multer({ storage: storage }).single('file');

export function uploadUserFile(req : any, res: Response){

  let id = req.params.id;

  let path = '';
  upload(req, res, function (err) {
    if (err) {
      // An error occurred when uploading
      console.log(err);
      return res.status(422).send("an Error occured")
    }
    path = req.file.path;
    var filename =  req.file.filename; //formatted filename
    Business.findByIdAndUpdate(id, {
      $push : { 'uploadedFiles' : filename }
    }, { new : true}).then((business)=>{
      if(!business) return res.status(400).json();
      return res.json(business);
    }).catch(e => res.status(422).send("an Error occured"))
  });
}


//gets all users

export function getUsers(req: Request, res: Response) {
    User.find({}).select('-password').exec((err,users)=>{
        if(err) return onError(res,"Error creando usuario",err);
        return res.json(users);
    });
}

//gets one user

export function getUser(req: Request, res: Response) {
    let userid = req.params.id;
    User.findById(userid).select('-password').populate('business').exec((err,user)=>{
        if(err) return onError(res, "Error obteniendo usuario", err);
        if(user === null) return res.status(404).json();
        return res.json(user);
    });
}

//attempts login for user

export function login(req: Request, res: Response){
    let password = sanitize(req.body.password);
    let email = req.body.email.toLowerCase();
    User.findOne({email: email}, (err,user) => {
        if(err || typeof password=='object') return onError(res, "Error obteniendo usuario", err);
        if(!user || !compareSync(password, user.password)){
            return res.status(404).json({
                title : 'Error al iniciar sesión',
                error : { message : 'Sus datos son incorrectos'}
            });
        }
        if(compareSync(password, user.password)){

            if(!user.verified){
              return res.status(401).json({
                title: 'Error al iniciar sesión',
                error: { message: 'No has verificado tu correo' }
              });
            }

            let userWithDates = processLoginDates(user);
            user.save((err, user)=>{
                if(err) return onError(res, "Error actualizando usuario", err);
                return user.generateToken().then((token)=>{
                res.header('x-auth', token).json(user);
                });
            });
        }

    });
}

//helper for adding to login history (only history for last 7 days will be preserved)

function processLoginDates(user){
    const REFERENCE = moment();
    let lastSevenDays = REFERENCE.clone().subtract(7, 'days').startOf('day');

    user.lastOnline.forEach((date, index)=>{
        let d = moment(date,"YYYY-MM-DD");
        if(!d.isAfter(lastSevenDays)) {
            user.lastOnline.splice(index,1);
        }
    });

    user.lastOnline.push(REFERENCE);

    return user;
}

//creates new user

export function createUser(req:Request, res:Response){

    let user = new User(req.body);
    user.email = user.email.toLowerCase();
    User.findOne({email : user.email}, (err, u)=>{
        if(u){
            return res.status(401).json({error : {message : "El usuario ya existe"}});
        }
        user.save((err,savedUser)=>{
            Business.findByIdAndUpdate(user.business, {
                $push : { 'users' : savedUser._id }
            }, (err, result)=>{
                if(err) return onError(res, "Error creando usuario", err);
                sendEmail(savedUser._id, savedUser.email, savedUser.fullName())
                .then(response=> res.json(savedUser))
                .catch(err => onError(res, "Error al enviar correo", err))
            });
        });
    });
    

};




//registers business and user associated as its admin

export function registerUserAndBusiness(req:Request, res:Response){

    let newBusiness = new Business(req.body.business);
    Business.findOne({name:newBusiness.name}, (err,result)=>{
        if(!!result) return res.status(400).json();
        //create business
        newBusiness.save((err,business)=>{
            if(err) return onError(res, "error creando negocio", err);
            let businessId = business._id;
            let user = new User(req.body.user);
            //add user reference to business
            user.business = businessId.toString();
            user.verified = false;
            user.email = user.email.toLowerCase();
            //create user
            user.save((err,user)=>{
                if(err) return onError(res, "Error creando usuario", err);
                business.update({$push: {users : user._id}}, (err,result)=>{
                    if(err) return onError(res, "Error actualizando negocio", err);

                    sendEmail(user._id, user.email, user.fullName())
                      .then(response=> res.json({"message": "Correo enviado"}))
                      .catch(err => onError(res, "Error al enviar correo", err))

                });
            });
        });
    });

};

export function verifyUserEmail(req : Request, res: Response) {
  var _id = req.params.id;
  var email = req.params.email;
  if (!ObjectID.isValid(_id)) {
    return res.status(400).json();
  }
  User.findOneAndUpdate({
    _id,
    email
  }, {
    $set: {
      verified: true
    }
  }, {
    new: true
  }).then((user) => {
    if (!user) {
      return res.status(404).json();
    }
    res.redirect('/login');
  }).catch((err) => onError(res, "Error validando correo...", err));
}



//updates a user

export function updateUser(req:Request, res:Response){
    let id = req.params.id;
    let newInfo = req.body;

    if(!newInfo.isAdmin){
      User.findByIdAndUpdate(id, newInfo, {new : true}, (err, user) => {
        if (err) return onError(res, "Error actualizando usuario", err);
        return res.json(user);
      });
    }

    else {
      return res.status(401).json();
    }



}

//resets password for specific user

export function resetPassword(req:Request, res:Response){
    let id = req.params.id;
    let currPwd = req.body.current;
    let newPwd = req.body.new;

    User.findById(id, (err,user)=>{
        if(err) return onError(res, "Error actualizando usuario", err);
        if(!user || !compareSync(currPwd, user.password)){
            return res.status(404).json({
                title : 'Acción fallida',
                error : { message : 'La contraseña original no coincide'}
            });
        }

        if(compareSync(currPwd, user.password)){
            if(compareSync(newPwd, user.password)) return res.status(400).json({message:"Cometiendo injusticias"});
            user.password = newPwd;
            user.save((err,result)=>{
                if(err) return onError(res, "Error actualizando usuario", err);
                return res.status(201).send();
            });
        }
    });

}

//deletes a user

export function deleteUser(req:Request, res:Response){
    let id = req.params.id;
    User.findByIdAndRemove(id, (err, result) => {
      if (err) return onError(res, "Error eliminando usuario", err);
      if (!result) return res.status(404).json();
      Business.findOneAndUpdate({users : id},
        { $pull : {'users' : id}},
        (err, business)=>{
          if(err) return onError(res, "Error eliminando usuario", err);
          return res.status(200).json({id});
      });
    });


}
