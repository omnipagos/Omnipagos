//Business Model (Stores/Commerces)

import { Document, Schema, Model, model} from "mongoose";
import { IUser } from "server/db/models/user";
import { IClient } from "server/db/models/client";

//interface to be used as Type on route Controllers

export interface IBusiness extends Document {
    _id : String;
    name : String;
    type : Number;
    users: Array<IUser>;
    processors: Array<{name:String, value: boolean, externalId? : String}>;
    clients: Array<IClient>;
    clarifications: Array<any>;
    transactions: Array<any>;
    openPayCustomerId? : String;
    uploadedFiles? : Array<String>;
    imgUrl? : String;
}

//Mongoose Schema

export const BusinessSchema: Schema = new Schema({
    name : String,
    type : Number,
    users: [{type : Schema.Types.ObjectId, ref : 'User'}],
    processors: {type: [{
        name : String,
        value : Boolean,
        externalId : String,
        _id : false
    }], default : [
        {
            name :"OpenPay",
            value : false,
            externalId : null
        },
        {
            name :"OxxoPay",
            value : false,
            externalId : null
        },
        {
          name :"Walmart",
          value : false,
          externalId : null
        },
        {
            name :"Soriana",
            value : false,
            externalId : null
        }

    ]},
    clients: [{type : Schema.Types.ObjectId, ref : 'Client', default : []}],
    transactions: [{type : Schema.Types.ObjectId, ref : 'Transaction', default : []}],
    openPayCustomerId : {required : false, type: String},
    uploadedFiles : { required : false, type : [String]},
    imgUrl : { type: String, required : false,
        default:'https://image.freepik.com/free-icon/question-mark-on-a-circular-black-background_318-41916.jpg'}
    },
    {
    timestamps: true
    }
);

export const Business: Model<IBusiness> = model<IBusiness>("Business", BusinessSchema);
